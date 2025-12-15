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
      return new Response("invalid request signature", { status: 401 });
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

        // get level url option
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

        // extract level id and timestamp
        const match = url.match(/level=([^:]+):(\d+)/);
        if (!match) {
          return Response.json({
            type: 4,
            data: {
              content: "invalid url",
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
          const inQueue = "queued_for_verification" in levelData;

          const linkedTitle = `[${title}](${url})`;

          const message = inQueue
            ? `${linkedTitle} **is submitted** ✅`
            : `${linkedTitle} **isn't submitted** ❌\n-# If you submitted your level, it got denied.`;

          return Response.json({
            type: 4,
            data: {
              content: message,
              allowed_mentions: { parse: [] }
            }
          });

        } catch (err) {
          return Response.json({
            type: 4,
            data: {
              content: "failed getting level",
              allowed_mentions: { parse: [] }
            }
          });
        }
      }
    }

    return new Response("invalid request type", { status: 400 });
  }
};
