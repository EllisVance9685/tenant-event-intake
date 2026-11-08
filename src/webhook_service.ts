import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const eventSchema = z.object({ tenant_id: z.string().min(1), account_id: z.string().min(1), event: z.enum(["tenant.onboarded", "account.updated", "admin.operation"]), request_id: z.string().min(1) });
export type PlatformEvent = z.infer<typeof eventSchema>;

export function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8"); const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function acceptPlatformEvent(rawBody: string, signature: string, secret: string): { accepted: true; event: PlatformEvent } | { accepted: false; reason: string } {
  if (!verifySignature(rawBody, signature, secret)) return { accepted: false, reason: "invalid signature" };
  const parsed = eventSchema.safeParse(JSON.parse(rawBody));
  return parsed.success ? { accepted: true, event: parsed.data } : { accepted: false, reason: "invalid event body" };
}

export function lifecycleDecision(event: PlatformEvent): "provision" | "record" | "review" { return event.event === "tenant.onboarded" ? "provision" : event.event === "admin.operation" ? "review" : "record"; }
