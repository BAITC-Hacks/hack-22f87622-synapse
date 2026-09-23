import { describe, expect, it } from "vitest";
import { getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";
import { recommend } from "@/lib/domain/recommend";
import { normalizeRequest } from "@/lib/domain/request";

describe("public recommendation seam", () => {
  it("normalizes an API-shaped payload and returns a serializable contract", () => {
    const catalog = loadCatalog();
    const request = normalizeRequest({ city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: 1_000_000, language: "русский", durationHours: 6 }, getCatalogMeta(catalog));
    const response = recommend(catalog, request);
    expect(JSON.parse(JSON.stringify(response))).toMatchObject({ status: "matched", counts: { shown: 3 }, rankingVersion: "price-id-v1" });
    expect(response.cards.every((card) => card.evidence.length >= 5)).toBe(true);
  });
});
