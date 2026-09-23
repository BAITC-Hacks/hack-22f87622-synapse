import { afterEach, expect, it, vi } from "vitest";

// Only simulate the unavailable filesystem; exercise the real loader and routes.
vi.mock("node:fs", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:fs")>(),
  readFileSync: () => { throw new Error("ENOENT: private/server/path"); },
}));

afterEach(() => { vi.unstubAllEnvs(); });

it("reports unreadable catalogs as catalog_error without leaking filesystem details", async () => {
  vi.stubEnv("AI_ENABLED", "false");
  const { POST } = await import("@/app/api/recommend/route");
  const response = await POST(new Request("http://localhost/api/recommend", {
    method: "POST", body: JSON.stringify({ city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: 1000000 }),
  }));
  expect(response.status).toBe(500);
  const result = await response.json();
  expect(result).toMatchObject({ error: "catalog_error" });
  expect(result.message).not.toContain("private/server/path");
});
