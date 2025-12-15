const nacl = require("tweetnacl");
import { Buffer } from "node:buffer";

export default {
  async fetch(request, env, ctx) {

    // verify discord request
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    const isVerified = signature && timestamp && nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, "hex"),
      Buffer.from(env.PUBLIC_KEY, "hex")
    );

    if (!isVerified) {
      return new Response("no idea", { status: 401 });
    }

    const json = JSON.parse(body);

    // discord ping
    if (json.type === 1) {
      return Response.json({ type: 1 });
    }

    // slash command handler
    if (json.type === 2) {
      const command_name = json.data.name.toLowerCase();

      if (command_name === "queue") {

        const url = json.data.options?.find(o => o.name === "level_url")?.value;

        if (!url) {
          return Response.json({
            type: 4,
            data: {
              content: "level url required",
              allowed_mentions: { parse: [] }
            }
          });
        }

        const match = url.match(/level=([^:]+):(\d+)/);
        if (!match) {
          return Response.json({
            type: 4,
            data: {
              content: "invalid level",
              allowed_mentions: { parse: [] }
            }
          });
        }

        const levelId = match[1];
        const levelTimestamp = match[2];

        const apiUrl = `https://api.slin.dev/grab/v1/details/${levelId}/${levelTimestamp}`;

        try {
          const apiResponse = await fetch(apiUrl);
          if (!apiResponse.ok) {
            throw new Error("api fail");
          }

          const levelData = await apiResponse.json();
          const title = levelData.title || "untitled level";
          const tags = Array.isArray(levelData.tags) ? levelData.tags : [];
          const inQueue = "queued_for_verification" in levelData;

          if (tags.includes("ok")) {
            return Response.json({
              type: 4,
              data: {
                content: "level is already verified!",
                flags: 64,
                allowed_mentions: { parse: [] }
              }
            });
          }

          const embed = inQueue
            ? {
                title: title,
                url: url,
                description: "**is submitted** ",
                color: 0x57f287
              }
            : {
                title: title,
                url: url,
                description: "**isn't submitted** \n-# If you submitted your level, it got denied.",
                color: 0xed4245
              };

          return Response.json({
            type: 4,
            data: {
              content: "",
              embeds: [embed],
              allowed_mentions: { parse: [] }
            }
          });

        } catch (err) {
          return Response.json({
            type: 4,
            data: {
              content: "couldn't get level information",
              allowed_mentions: { parse: [] }
            }
          });
        }
      }

      if (command_name === "publish_time") {

        const url = json.data.options?.find(o => o.name === "level_url")?.value;

        if (!url) {
          return Response.json({
            type: 4,
            data: {
              content: "level url required",
              allowed_mentions: { parse: [] }
            }
          });
        }

        const match = url.match(/level=([^:]+):(\d+)/);
        if (!match) {
          return Response.json({
            type: 4,
            data: {
              content: "invalid level",
              allowed_mentions: { parse: [] }
            }
          });
        }

        const levelId = match[1];
        const levelTimestamp = match[2];

        const apiUrl = `https://api.slin.dev/grab/v1/details/${levelId}/${levelTimestamp}`;
        const leaderboardUrl = `https://api.slin.dev/grab/v1/statistics_top_leaderboard/${levelId}/${levelTimestamp}`;

        try {
          const apiResponse = await fetch(apiUrl);
          if (!apiResponse.ok) {
            throw new Error("api fail");
          }

          const levelData = await apiResponse.json();
          const title = levelData.title || "untitled level";

          let rawTime = Number(levelData.verification_time);
          let publishUser = null;
          let useLeaderboardFormat = false;

          try {
            const lbResponse = await fetch(leaderboardUrl);
            if (lbResponse.ok) {
              const lbData = await lbResponse.json();
              const entries = Array.isArray(lbData) ? lbData : [];

              const verificationEntry = entries.find(
                e => e && e.is_verification === true && Number.isFinite(Number(e.best_time))
              );

              if (verificationEntry) {
                rawTime = Number(verificationEntry.best_time);
                publishUser = verificationEntry.user_name || null;
                useLeaderboardFormat = true;
              }
            }
          } catch (err) {
          }

          if (!Number.isFinite(rawTime)) {
            return Response.json({
              type: 4,
              data: {
                content: "failed to get time",
                allowed_mentions: { parse: [] }
              }
            });
          }

          const minutes = Math.floor(rawTime / 60);
          const seconds = Math.floor(rawTime % 60);
          const fractional = rawTime % 1;

          let timeText;

          if (useLeaderboardFormat) {
            const milliseconds4 = Math.floor(fractional * 10000);
            const paddedSeconds = String(seconds).padStart(2, "0");
            const paddedMilliseconds4 = String(milliseconds4).padStart(4, "0");
            timeText = `${minutes}:${paddedSeconds}.${paddedMilliseconds4}`;
          } else {
            const milliseconds3 = Math.floor(fractional * 1000);
            const paddedSeconds = String(seconds).padStart(2, "0");
            const paddedMilliseconds3 = String(milliseconds3).padStart(3, "0");
            timeText = `${minutes}:${paddedSeconds}.${paddedMilliseconds3}`;
          }

          let description = `**Publish time:** ${timeText}`;
          if (publishUser) {
            description += `\nBy: ${publishUser}`;
          }

          return Response.json({
            type: 4,
            data: {
              content: "",
              embeds: [
                {
                  title: title,
                  url: url,
                  description: description,
                  color: 0x57f287
                }
              ],
              allowed_mentions: { parse: [] }
            }
          });

        } catch (err) {
          return Response.json({
            type: 4,
            data: {
              content: "couldn't get time",
              allowed_mentions: { parse: [] }
            }
          });
        }
      }
    }

    return new Response("incorrect request", { status: 400 });
  }
};