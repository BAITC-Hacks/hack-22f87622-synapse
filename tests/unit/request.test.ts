import { describe, expect, it } from "vitest";
import { getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";
import { normalizeRequest, RequestValidationError } from "@/lib/domain/request";

const meta = getCatalogMeta(loadCatalog());
const valid = { city: " алматы ", date: "2026-10-12", eventType: "КОРПОРАТИВ", category: " ведущий ", budgetKzt: 1_000_000 };

describe("normalizeRequest", () => {
  it("canonicalizes catalog values and leaves empty optional fields unconstrained", () => {
    expect(normalizeRequest({ ...valid, language: "", durationHours: "" }, meta)).toEqual({
      city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: 1_000_000,
    });
  });

  it.each(["2026-02-30", "2026-09-22", "2027-01-01", "12.10.2026"])("rejects invalid or out-of-window date %s", (date) => {
    expect(() => normalizeRequest({ ...valid, date }, meta)).toThrow(RequestValidationError);
  });

  it("rejects guessed catalog values and invalid numeric input", () => {
    expect(normalizeRequest({ ...valid, category: "Ведущий церемонии" }, meta).category).toBe("Ведущий церемонии");
    expect(() => normalizeRequest({ ...valid, category: "Ведущий-переводчик" }, meta)).toThrow(/отсутствует в каталоге/);
    expect(() => normalizeRequest({ ...valid, budgetKzt: -1 }, meta)).toThrow(RequestValidationError);
    expect(() => normalizeRequest({ ...valid, budgetKzt: 1.5 }, meta)).toThrow(RequestValidationError);
    expect(() => normalizeRequest({ ...valid, durationHours: 0 }, meta)).toThrow(RequestValidationError);
  });
});
