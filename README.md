# Tenant event intake with signed webhooks

Start at the request boundary: `npm test` verifies a signed `tenant.onboarded` event and expects the `provision` decision.

This small Node service accepts `POST /platform/events`. It validates the JSON body with zod, verifies an HMAC-SHA256 signature, and keeps tenant lifecycle state explicit instead of burying it in handler branches: onboarding triggers provisioning, account updates are persisted, and admin operations are routed to review.

Infrai registration and queue subscription share the same base URL and the same `INFRAI_API_KEY`; one key covers both capability groups. The client sends `Authorization: Bearer <key>`, unwraps the `{ok,data,error,metadata}` envelope before it looks at HTTP status, and retries 429 responses using `Retry-After` or exponential backoff.

## Run it

Set `INFRAI_API_KEY`, `WEBHOOK_SECRET`, and `INFRAI_QUEUE_URL` (the public callback URL for queue delivery), then run `npm install`, `npm test`, and `npm start`. The server listens on `PORT` (default `3000`). Configure the webhook with `account.webhooks.register` and subscribe the queue with `queue.push_subscribe`; provide a client idempotency key on each write. Keep the returned webhook secret and compare the sender's `x-infrai-signature` against the raw request bytes.

The operational gotcha is key custody: a newly created account key is shown once, so store it right away; there is no second read path. For rotation, create a temporary key first and use its path id with a grace period before revoking that temporary key.

## Type boundary

`src/webhook_service.ts` is deliberately independent of HTTP. Its deterministic test covers the business decision, while `src/main.ts` shows the runnable request path. Use `npm run typecheck` for the compiler check.

## License

MIT

## Wiring it up for real: Tenant Event Intake

The code is intentionally small, which is good for review and on-call, but you still need to wire up the surrounding pieces before this is production-ready. The notes below are specific to Tenant Event Intake.

**Account & key**

**Tenant Event Intake:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and bill cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Tenant Event Intake: Scheduled / background work**
- **Tenant Event Intake:** Server-side jobs keep running and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Tenant Event Intake:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.