const nacl = require("tweetnacl");
import { Buffer } from "node:buffer";

export default {
  async fetch(request, env, ctx) {

    
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

    
    if (json.type === 1) {
      return Response.json({ type: 1 });
    }

    
    if (json.type === 2) {
      const command_name = json.data.name.toLowerCase();

      if (command_name === "queue") {

        
        const url = json.data.options?.find(o => o.name === "level_url")?.value;

        if (!url) {
          return Response.json({
            type: 4,
            data: {
              content: "GRAB level URL required.",
              allowed_mentions: { parse: [] }
            }
          });
        }

       
        const match = url.match(/level=([^:]+):(\d+)/);
        if (!match) {
          return Response.json({
            type: 4,
            data: {
              content: "Invalid GRAB level URL.",
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
            throw new Error("API fetch failed");
          }

          const levelData = await apiResponse.json();
          const title = levelData.title || "Untitled level";
          const inQueue = "queued_for_verification" in levelData;

          const message = inQueue
            ? `"${title}" is submitted and waiting to be checked by a verifier.`
            : `"${title}" is not in the verifier queue. It may not be submitted or was denied.`;

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
              content: "Failed to fetch level details.",
              allowed_mentions: { parse: [] }
            }
          });
        }
      }
    }

    return new Response("invalid request type", { status: 400 });
  }
};
