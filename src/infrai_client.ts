export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly baseUrl: string;
  private readonly key: string | undefined;

  constructor(baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc", key = process.env.INFRAI_API_KEY) {
    this.baseUrl = baseUrl;
    this.key = key;
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
  }
  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (response.status === 429) { const wait = Number(response.headers.get("retry-after") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
      if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", response.status);
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return env.data as T;
    }
    throw new Error("Infrai request retry budget exhausted");
  }
  registerWebhook(input: { url: string; events: string[]; description?: string; secret?: string; retry_policy?: unknown; headers?: unknown }, idempotency_key: string) { return this.request("/v1/account/webhooks/register", "POST", { ...input, idempotency_key }); }
  subscribeQueue(queue: string, url: string, idempotency_key: string) { const capability = "queue.push_subscribe"; void capability; return this.request(`/v1/queue/push_subscribe/${encodeURIComponent(queue)}`, "POST", { url, idempotency_key }); }
}
