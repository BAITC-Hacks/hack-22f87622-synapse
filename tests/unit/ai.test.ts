import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySelection, clearAiCacheForTests, enhanceWithAi, validateSelection, type EvidenceSelection } from "@/lib/ai/explain";
import { loadCatalog } from "@/lib/domain/catalog";
import { recommend } from "@/lib/domain/recommend";

const response = recommend(loadCatalog(), { city: "Алматы", date: "2026-10-12", eventType: "свадьба", category: "Флорист", budgetKzt: 300000, language: "русский", durationHours: 6 });

function validSelection(): EvidenceSelection {
  return { cards: response.cards.map((card) => ({ profileId: card.id, evidenceIds: [card.evidence[2]!.id], accent: "price" as const })), diagnosisFocus: "none" };
}

describe("AI evidence safety", () => {
  beforeEach(() => { clearAiCacheForTests(); process.env.OPENAI_API_KEY = "test-only"; process.env.OPENAI_MODEL = "test-model"; process.env.AI_ENABLED = "true"; });
  afterEach(() => { delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; delete process.env.AI_ENABLED; });

  it("rejects unknown profiles, cross-profile evidence, duplicates and malformed output", () => {
    const valid = validSelection();
    expect(validateSelection(response, valid)).toEqual(valid);
    expect(validateSelection(response, { ...valid, cards: [{ ...valid.cards[0], profileId: "missing" }, valid.cards[1]] })).toBeNull();
    expect(validateSelection(response, { ...valid, cards: [{ ...valid.cards[0], evidenceIds: [response.cards[1]!.evidence[0]!.id] }, valid.cards[1]] })).toBeNull();
    expect(validateSelection(response, { ...valid, cards: [{ ...valid.cards[0], evidenceIds: [valid.cards[0]!.evidenceIds[0]!, valid.cards[0]!.evidenceIds[0]!] }, valid.cards[1]] })).toBeNull();
    expect(validateSelection(response, { arbitrary: "json" })).toBeNull();
  });

  it("changes only explanation text, never selected IDs or order", () => {
    const enhanced = applySelection(response, validSelection(), "ai", "test-model");
    expect(enhanced.cards.map((card) => card.id)).toEqual(response.cards.map((card) => card.id));
    expect(enhanced.cards[0]?.explanation).toContain("Цена от");
  });

  it("falls back without a key and on provider errors, invalid output and timeout", async () => {
    delete process.env.OPENAI_API_KEY;
    expect((await enhanceWithAi(response)).ai.mode).toBe("fallback_no_key");
    process.env.OPENAI_API_KEY = "test-only";
    expect((await enhanceWithAi(response, { selector: async () => { throw new Error("provider"); } })).ai.mode).toBe("fallback_error");
    expect((await enhanceWithAi(response, { selector: async () => ({ wrong: true }) })).ai.mode).toBe("fallback_invalid");
    const timed = await enhanceWithAi(response, { timeoutMs: 5, selector: async (_r, _m, signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))) });
    expect(timed.ai.mode).toBe("fallback_timeout");
    expect(timed.cards.map((card) => card.id)).toEqual(response.cards.map((card) => card.id));
  });

  it("uses a bounded in-memory cache without changing order", async () => {
    let calls = 0;
    const selector = async () => { calls += 1; return validSelection(); };
    const first = await enhanceWithAi(response, { selector });
    const second = await enhanceWithAi(response, { selector });
    expect(first.ai.mode).toBe("ai");
    expect(second.ai.mode).toBe("ai_cache");
    expect(calls).toBe(1);
    expect(second.cards.map((card) => card.id)).toEqual(first.cards.map((card) => card.id));
  });
});
