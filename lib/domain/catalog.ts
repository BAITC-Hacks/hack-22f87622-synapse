import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { DATE_WINDOW, type Catalog, type CatalogMeta, type Profile } from "./types";

const DATASET_PATH = path.join(process.cwd(), "data", "raw", "hackathon-dataset-anonymized.csv");

const rawProfileSchema = z
  .object({
    id: z.string(),
    anon_name: z.string(),
    categories: z.string(),
    city: z.string(),
    price_from_kzt: z.string(),
    event_formats: z.string(),
    languages: z.string(),
    max_hours: z.string(),
    busy_dates: z.string(),
    description: z.string(),
    synthetic: z.string(),
    city_imputed: z.string(),
    price_imputed: z.string(),
  })
  .passthrough();

export class CatalogDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogDataError";
  }
}

function required(value: string, field: string, row: number): string {
  const normalized = value.trim();
  if (!normalized) throw new CatalogDataError(`Строка ${row}: обязательное поле ${field} пусто`);
  return normalized;
}

function parseBoolean(value: string, field: string, row: number): boolean {
  if (value === "True") return true;
  if (value === "False") return false;
  throw new CatalogDataError(`Строка ${row}: ${field} должно быть True или False`);
}

function parseNumber(value: string, field: string, row: number, nullable = false): number | null {
  const normalized = value.trim();
  if (nullable && normalized === "") return null;
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new CatalogDataError(`Строка ${row}: ${field} должно быть конечным неотрицательным числом`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || (field === "max_hours" && parsed <= 0)) {
    throw new CatalogDataError(`Строка ${row}: некорректное значение ${field}`);
  }
  return parsed;
}

export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseList(value: string, field: string, row: number, allowEmpty = false): readonly string[] {
  if (allowEmpty && value.trim() === "") return [];
  const items = value.split("|").map((item) => item.trim());
  if (items.length === 0 || items.some((item) => item === "")) {
    throw new CatalogDataError(`Строка ${row}: список ${field} содержит пустое значение`);
  }
  const normalized = new Set(items.map((item) => item.toLocaleLowerCase("ru")));
  if (normalized.size !== items.length) {
    throw new CatalogDataError(`Строка ${row}: список ${field} содержит повтор`);
  }
  return items;
}

function parseDates(value: string, row: number): readonly string[] {
  const dates = parseList(value, "busy_dates", row, true);
  for (const date of dates) {
    if (!isCalendarDate(date)) throw new CatalogDataError(`Строка ${row}: некорректная дата ${date}`);
  }
  return dates;
}

export function parseCatalogCsv(buffer: Buffer | string): Catalog {
  const bytes = typeof buffer === "string" ? Buffer.from(buffer, "utf8") : buffer;
  let records: unknown[];
  try {
    records = parse(bytes, { columns: true, bom: true, skip_empty_lines: true, trim: false });
  } catch (error) {
    throw new CatalogDataError(`CSV не разобран: ${error instanceof Error ? error.message : "неизвестная ошибка"}`);
  }

  const ids = new Set<string>();
  const profiles = records.map((record, index): Profile => {
    const row = index + 2;
    const parsed = rawProfileSchema.safeParse(record);
    if (!parsed.success) throw new CatalogDataError(`Строка ${row}: отсутствуют обязательные колонки`);
    const raw = parsed.data;
    const id = required(raw.id, "id", row);
    if (ids.has(id)) throw new CatalogDataError(`Строка ${row}: повторяющийся id ${id}`);
    ids.add(id);
    const price = parseNumber(raw.price_from_kzt, "price_from_kzt", row);
    if (price === null) throw new CatalogDataError(`Строка ${row}: цена обязательна`);
    return Object.freeze({
      id,
      anonName: required(raw.anon_name, "anon_name", row),
      categories: Object.freeze(parseList(raw.categories, "categories", row)),
      city: required(raw.city, "city", row),
      priceFromKzt: price,
      eventFormats: Object.freeze(parseList(raw.event_formats, "event_formats", row)),
      languages: Object.freeze(parseList(raw.languages, "languages", row)),
      maxHours: parseNumber(raw.max_hours, "max_hours", row, true),
      busyDates: Object.freeze(parseDates(raw.busy_dates, row)),
      description: required(raw.description, "description", row),
      synthetic: parseBoolean(raw.synthetic, "synthetic", row),
      cityImputed: parseBoolean(raw.city_imputed, "city_imputed", row),
      priceImputed: parseBoolean(raw.price_imputed, "price_imputed", row),
    });
  });

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return Object.freeze({
    profiles: Object.freeze(profiles),
    sha256,
    version: `sha256:${sha256}`,
  });
}

let cachedCatalog: Catalog | undefined;

export function loadCatalog(): Catalog {
  cachedCatalog ??= parseCatalogCsv(readFileSync(DATASET_PATH));
  return cachedCatalog;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ru"));
}

export function getCatalogMeta(catalog: Catalog): CatalogMeta {
  return {
    cities: uniqueSorted(catalog.profiles.map((profile) => profile.city)),
    categories: uniqueSorted(catalog.profiles.flatMap((profile) => profile.categories)),
    eventTypes: uniqueSorted(catalog.profiles.flatMap((profile) => profile.eventFormats)),
    languages: uniqueSorted(catalog.profiles.flatMap((profile) => profile.languages)),
    dateWindow: DATE_WINDOW,
    datasetVersion: catalog.version,
    profileCount: catalog.profiles.length,
  };
}
