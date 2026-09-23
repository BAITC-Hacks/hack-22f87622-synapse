import { performance } from "node:perf_hooks";
import { loadCatalog } from "../lib/domain/catalog";
import { recommend } from "../lib/domain/recommend";

const request = { city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: 1_000_000, language: "русский", durationHours: 6 } as const;
const start = performance.now();
const catalog = loadCatalog();
recommend(catalog, request);
const first = performance.now() - start;
const repeatStart = performance.now();
for (let index = 0; index < 1_000; index += 1) recommend(catalog, request);
const repeated = performance.now() - repeatStart;
console.log(JSON.stringify({ firstRequestMs: Number(first.toFixed(3)), repeated1000Ms: Number(repeated.toFixed(3)), averageRepeatMs: Number((repeated / 1_000).toFixed(4)), mode: "deterministic fallback, local Node process" }, null, 2));
