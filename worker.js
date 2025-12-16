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
    if (json.type == 2) {
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
            description += `\n**By:** ${publishUser}`;
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

      if (command_name === "leaderboard_search") {

        const username = json.data.options?.find(o => o.name === "username")?.value;
        const url = json.data.options?.find(o => o.name === "level_url")?.value;

        if (!username) {
          return Response.json({
            type: 4,
            data: {
              content: "username required",
              allowed_mentions: { parse: [] },
              flags: 64
            }
          });
        }

        if (!url) {
          return Response.json({
            type: 4,
            data: {
              content: "level url required",
              allowed_mentions: { parse: [] },
              flags: 64
            }
          });
        }

        const match = url.match(/level=([^:]+):(\d+)/);
        if (!match) {
          return Response.json({
            type: 4,
            data: {
              content: "invalid level",
              allowed_mentions: { parse: [] },
              flags: 64
            }
          });
        }

        const levelId = match[1];
        const levelTimestamp = match[2];

        const normalizedName = String(username).trim().toLowerCase();
        const kvKey = `user:${normalizedName}`;

        let cachedUser = null;
        try {
          if (env.USER_CACHE && typeof env.USER_CACHE.get === "function") {
            const raw = await env.USER_CACHE.get(kvKey, { type: "json" });
            if (raw && raw.user_id && raw.user_name) {
              cachedUser = raw;
            }
          }
        } catch (e) {
        }

        let userId = cachedUser?.user_id;
        let userNameCanonical = cachedUser?.user_name;

        if (!userId) {
          const searchUrl = `https://api.slin.dev/grab/v1/list?max_format_version=18&type=user_name&search_term=${encodeURIComponent(username)}`;
          try {
            const searchResp = await fetch(searchUrl);
            if (!searchResp.ok) {
              throw new Error("couldn't search user");
            }
            const searchData = await searchResp.json();
            const first = Array.isArray(searchData) && searchData.length > 0 ? searchData[0] : null;
            if (!first || !first.user_id) {
              return Response.json({
                type: 4,
                data: {
                  content: "user not found",
                  allowed_mentions: { parse: [] },
                  flags: 64
                }
              });
            }
            userId = first.user_id;
            userNameCanonical = first.user_name || username;

            try {
              if (env.USER_CACHE && typeof env.USER_CACHE.put === "function") {
                await env.USER_CACHE.put(
                  kvKey,
                  JSON.stringify({ user_id: userId, user_name: userNameCanonical }),
                  { expirationTtl: 60 * 60 * 24 * 7 }
                );
              }
            } catch (e) {
            }
          } catch (err) {
            return Response.json({
              type: 4,
              data: {
                content: "failed search",
                allowed_mentions: { parse: [] },
                flags: 64
              }
            });
          }
        }

        const detailsUrl = `https://api.slin.dev/grab/v1/details/${levelId}/${levelTimestamp}`;
        let title = "untitled level";
        try {
          const detResp = await fetch(detailsUrl);
          if (detResp.ok) {
            const detData = await detResp.json();
            title = detData.title || title;
          }
        } catch (e) {
        }

        const bestUrl = `https://api.slin.dev/grab/v1/best_time_replay/${levelId}/${levelTimestamp}?user_id=${encodeURIComponent(userId)}`;
        try {
          const bestResp = await fetch(bestUrl);
          if (!bestResp.ok) {
            const text = await bestResp.text().catch(() => "");
            if (text && text.toLowerCase().includes("user not found")) {
              return Response.json({
                type: 4,
                data: {
                  content: "no record",
                  allowed_mentions: { parse: [] },
                  flags: 64
                }
              });
            }
            throw new Error("time api fail");
          }

          let bestData;
          const ct = bestResp.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            bestData = await bestResp.json();
          } else {
            const text = await bestResp.text();
            if (text && text.toLowerCase().includes("user not found")) {
              return Response.json({
                type: 4,
                data: {
                  content: "no record",
                  allowed_mentions: { parse: [] },
                  flags: 64
                }
              });
            }
            throw new Error("idk");
          }

          const bestTime = Number(bestData?.best_time);
          if (!Number.isFinite(bestTime)) {
            return Response.json({
              type: 4,
              data: {
                content: "no record",
                allowed_mentions: { parse: [] },
                flags: 64
              }
            });
          }

          const minutes = Math.floor(bestTime / 60);
          const seconds = Math.floor(bestTime % 60);
          const fractional = bestTime % 1;
          const milliseconds3 = Math.floor(fractional * 1000);
          const paddedSeconds = String(seconds).padStart(2, "0");
          const paddedMilliseconds3 = String(milliseconds3).padStart(3, "0");
          const timeText = `${minutes}:${paddedSeconds}.${paddedMilliseconds3}`;

          const embed = {
            title: title,
            url: url,
            description: `**${userNameCanonical}'s Time:** ${timeText}`,
            color: 0xfee75c
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
              content: "failed to get record",
              allowed_mentions: { parse: [] },
              flags: 64
            }
          });
        }
      }

      if (command_name === "leaderboard_record") {

        const username = json.data.options?.find(o => o.name === "username")?.value;
        const url = json.data.options?.find(o => o.name === "level_url")?.value;

        if (!username || !url) {
          return Response.json({
            type: 4,
            data: {
              content: "username and level url required",
              flags: 64,
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
              flags: 64,
              allowed_mentions: { parse: [] }
            }
          });
        }

        const levelId = match[1];
        const levelTimestamp = match[2];

        const detailsUrl = `https://api.slin.dev/grab/v1/details/${levelId}/${levelTimestamp}`;
        let title = "untitled level";
        try {
          const detResp = await fetch(detailsUrl);
          if (detResp.ok) {
            const detData = await detResp.json();
            title = detData.title || title;
          }
        } catch (e) {
        }

        const leaderboardUrl = `https://api.slin.dev/grab/v1/statistics_top_leaderboard/${levelId}/${levelTimestamp}`;

        try {
          const lbRes = await fetch(leaderboardUrl);
          if (!lbRes.ok) {
            throw new Error("leaderboard fail");
          }

          const lbData = await lbRes.json();
          const entries = Array.isArray(lbData) ? lbData : [];

          const entry = entries.find(
            e =>
              typeof e.user_name === "string" &&
              e.user_name.toLowerCase() === String(username).toLowerCase()
          );

          if (!entry) {
            return Response.json({
              type: 4,
              data: {
                content: "no record",
                flags: 64,
                allowed_mentions: { parse: [] }
              }
            });
          }

          const rawTime = Number(entry.best_time);
          const minutes = Math.floor(rawTime / 60);
          const seconds = Math.floor(rawTime % 60);
          const milliseconds = Math.floor((rawTime % 1) * 1000);
          const paddedSeconds = String(seconds).padStart(2, "0");
          const paddedMilliseconds = String(milliseconds).padStart(3, "0");
          const timeText = `${minutes}:${paddedSeconds}.${paddedMilliseconds}`;

          const timestampNumber = Number(entry.timestamp);
          const date = new Date(timestampNumber / 1000);

          const day = date.getUTCDate();
          const year = date.getUTCFullYear();
          const hours = String(date.getUTCHours()).padStart(2, "0");
          const minutesTime = String(date.getUTCMinutes()).padStart(2, "0");
          const secondsTime = String(date.getUTCSeconds()).padStart(2, "0");

          const monthNames = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"
          ];
          const month = monthNames[date.getUTCMonth()];

          const suffix =
            day % 10 === 1 && day !== 11 ? "st" :
            day % 10 === 2 && day !== 12 ? "nd" :
            day % 10 === 3 && day !== 13 ? "rd" : "th";

          const recordedOn = `${month} ${day}${suffix} ${year} | ${hours}:${minutesTime}:${secondsTime}`;

          return Response.json({
            type: 4,
            data: {
              content: "",
              embeds: [
                {
                  title: title,
                  url: url,
                  description:
                    `**${entry.user_name}'s record**\n` +
                    `**Position:** ${entry.position + 1}\n` +
                    `**Time:** ${timeText}\n` +
                    `**Recorded on:** ${recordedOn}`,
                  color: 0xfee75c
                }
              ],
              allowed_mentions: { parse: [] }
            }
          });

        } catch (err) {
          return Response.json({
            type: 4,
            data: {
              content: "failed to get leaderboard",
              flags: 64,
              allowed_mentions: { parse: [] }
            }
          });
        }
      }
    }

    return new Response("incorrect request", { status: 400 });
  }
};
// cooked
