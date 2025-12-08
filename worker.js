const nacl = require("tweetnacl");
import { Buffer } from 'node:buffer';

export default {
    async fetch(request, env, ctx) {

        // Handle invalid requests
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

        // Discord PING
        if (json.type == 1) {
            return Response.json({ type: 1 });
        }

        // Slash command handler
        if (json.type == 2) {
            const command_name = json.data.name.toLowerCase(); // lowercase to match Discord

            if (command_name === "queue") { // match your commands.js

                const url = json.data.options.find(o => o.name === "Level URL")?.value;

                if (!url) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "grab url needed",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                // Extract levelId and timestamp
                const match = url.match(/level=([^:]+):(\d+)/);
                if (!match) {
                    return Response.json({
                        type: 4,
                        data: {
                            content: "no url?",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }

                const levelId = match[1];
                const timestamp = match[2];

                const apiUrl = `https://api.slin.dev/grab/v1/details/${levelId}/${timestamp}`;

                // Fetch level data from Slin API
                try {
                    const apiResponse = await fetch(apiUrl);
                    if (!apiResponse.ok) {
                        return Response.json({
                            type: 4,
                            data: {
                                content: "couldn\'t fetch level details,
                                allowed_mentions: { parse: [] }
                            }
                        });
                    }

                    const levelData = await apiResponse.json();
                    const title = levelData.title || "title";
                    const inQueue = "queued_for_verification" in levelData;

                    const message = inQueue
                        ? `"${title}" is submitted and waiting to be checked by a verifier.`
                        : `"${title}" isn't in the verifier queue, you haven't submitted it OR it got denied.`;

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
                            content: "failed",
                            allowed_mentions: { parse: [] }
                        }
                    });
                }
            }
        }

        return new Response("invalid request type", { status: 400 });
    },
};
