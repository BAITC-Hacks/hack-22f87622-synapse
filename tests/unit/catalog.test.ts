import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CatalogDataError, parseCatalogCsv } from "@/lib/domain/catalog";

const source = readFileSync(path.join(process.cwd(), "data", "raw", "hackathon-dataset-anonymized.csv"));

function oneRow(overrides: Record<string, string> = {}): string {
  const fields = ["id", "anon_name", "categories", "city", "price_from_kzt", "event_formats", "languages", "max_hours", "busy_dates", "description", "synthetic", "city_imputed", "price_imputed"];
  const row = {
    id: "P-1",
    anon_name: "Профиль",
    categories: "Ведущий|Музыкант",
    city: "Алматы",
    price_from_kzt: "100000",
    event_formats: "свадьба|корпоратив",
    languages: "русский|казахский",
    max_hours: "",
    busy_dates: "2026-10-10|2026-10-11",
    description: "Спокойная подача.",
    synthetic: "False",
    city_imputed: "False",
    price_imputed: "True",
    ...overrides,
  };
  return `${fields.join(",")}\n${fields.map((field) => JSON.stringify(row[field as keyof typeof row])).join(",")}\n`;
}

describe("parseCatalogCsv", () => {
  it("imports all 66 source profiles and converts list, null, number and boolean types", () => {
    const catalog = parseCatalogCsv(source);
    expect(catalog.profiles).toHaveLength(66);
    const florist = catalog.profiles.find((profile) => profile.id === "HK-39372");
    expect(florist).toMatchObject({ maxHours: null, synthetic: false, priceImputed: true, priceFromKzt: 200000 });
    expect(florist?.categories).toEqual(["Флорист"]);
    expect(florist?.busyDates).toContain("2026-11-14");
  });

  it("does not coerce False to true", () => {
    expect(parseCatalogCsv(oneRow()).profiles[0]?.synthetic).toBe(false);
  });

  it("rejects duplicate IDs, duplicate dates, malformed flags and malformed numbers", () => {
    const duplicated = `${oneRow().trim()}\n${oneRow({ anon_name: "Второй" }).split("\n")[1]}\n`;
    expect(() => parseCatalogCsv(duplicated)).toThrow(/повторяющийся id/);
    expect(() => parseCatalogCsv(oneRow({ busy_dates: "2026-10-10|2026-10-10" }))).toThrow(/повтор/);
    expect(() => parseCatalogCsv(oneRow({ synthetic: "FALSE" }))).toThrow(/True или False/);
    expect(() => parseCatalogCsv(oneRow({ price_from_kzt: "много" }))).toThrow(CatalogDataError);
  });
});
