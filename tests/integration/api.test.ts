import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recommend/route";
import { GET } from "@/app/api/catalog/meta/route";

const payload = { city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: 1_000_000 };
let client = 0;
function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/recommend", {
    method: "POST", body,
    headers: { "content-type": "application/json", "x-forwarded-for": `test-${++client}`, ...headers },
  });
}

describe("HTTP API", () => {
  beforeEach(() => { vi.stubEnv("AI_ENABLED", "false"); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("returns the real catalog and deterministic recommendations", async () => {
    expect(await GET().json()).toMatchObject({ profileCount: 66 });
    const response = await POST(request(JSON.stringify(payload)));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe("matched");
    expect(result.cards.map((card: { id: string }) => card.id)).toEqual(["HK-88430", "HK-44923", "HK-29829"]);
    expect(result.ai.mode).toBe("fallback_disabled");
  });

  it.each(["{", "null", JSON.stringify({ ...payload, budgetKzt: -1 }), JSON.stringify({ ...payload, date: "2026-02-30" })])("rejects malformed input with 400", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "validation_error" });
  });

  it("returns both empty domain outcomes as successful HTTP responses", async () => {
    for (const [input, status] of [
      [{ ...payload, city: "Астана", category: "Декоратор" }, "no_category_in_city"],
      [{ ...payload, budgetKzt: 0 }, "no_matches"],
    ] as const) {
      const response = await POST(request(JSON.stringify(input)));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status, cards: [] });
    }
  });

  it("limits oversized bodies with and without content-length", async () => {
    expect((await POST(request(" ".repeat(8193)))).status).toBe(413);
    expect((await POST(request("{}", { "content-length": "8193" }))).status).toBe(413);
  });

  it("stops reading a streamed body as soon as it exceeds 8 KiB", async () => {
    let cancelled = false;
    let chunks = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (++chunks <= 3) controller.enqueue(new Uint8Array(8193));
        else controller.close();
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const streamed = new Request("http://localhost/api/recommend", {
      method: "POST", body, duplex: "half", headers: { "x-forwarded-for": "stream-test" },
    } as RequestInit);
    expect((await POST(streamed)).status).toBe(413);
    expect(cancelled).toBe(true);
    expect(chunks).toBe(1);
  });

  it("limits one client after 30 requests and keeps other clients independent", async () => {
    for (let index = 0; index < 30; index++) {
      expect((await POST(request("{}", { "x-forwarded-for": "rate-test" }))).status).toBe(400);
    }
    expect((await POST(request("{}", { "x-forwarded-for": "rate-test" }))).status).toBe(429);
    expect((await POST(request("{}"))).status).toBe(400);
  });
});
