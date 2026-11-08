import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { acceptPlatformEvent, lifecycleDecision } from "./webhook_service.js";
const body = JSON.stringify({ tenant_id: "t-1", account_id: "a-1", event: "tenant.onboarded", request_id: "r-1" });
const signature = createHmac("sha256", "secret").update(body).digest("hex");
const result = acceptPlatformEvent(body, signature, "secret");
assert.equal(result.accepted, true); if (result.accepted) assert.equal(lifecycleDecision(result.event), "provision");
console.log("webhook decision test passed");
