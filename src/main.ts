import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { InfraiClient } from "./infrai_client.js";
import { acceptPlatformEvent, lifecycleDecision } from "./webhook_service.js";

const secret = process.env.WEBHOOK_SECRET;
if (!secret) throw new Error("WEBHOOK_SECRET is required");
const queueUrl = process.env.INFRAI_QUEUE_URL;
if (!queueUrl) throw new Error("INFRAI_QUEUE_URL is required");
const port = Number(process.env.PORT ?? 3000);
createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/platform/events") { res.writeHead(404); res.end(); return; }
  const chunks: Buffer[] = []; req.on("data", c => chunks.push(c)); req.on("end", async () => {
    const raw = Buffer.concat(chunks).toString("utf8"); const result = acceptPlatformEvent(raw, req.headers["x-infrai-signature"]?.toString() ?? "", secret);
    if (result.accepted === false) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: result.reason })); return; }
    const decision = lifecycleDecision(result.event); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ tenant_id: result.event.tenant_id, decision }));
  });
}).listen(port, async () => { const infrai = new InfraiClient(); await infrai.subscribeQueue(process.env.INFRAI_QUEUE ?? "platform-events", queueUrl, randomUUID()); console.log(`listening on ${port}`); });
