import type { Evidence, Profile, RecommendationRequest } from "./types";

const currency = new Intl.NumberFormat("ru-RU");

function safeDescriptionExcerpt(description: string): string | null {
  const sentence = description.split(/(?<=[.!?])\s+/u)[0]?.trim() ?? "";
  if (!sentence || sentence.length > 180) return null;
  // Structured facts win: numeric claims, dates, prices and instruction-like text are not quoted.
  if (/\d|₸|тенге|час|свобод|занят|игнорир|инструкц/iu.test(sentence)) return null;
  return sentence;
}

export function buildEvidence(profile: Profile, request: RecommendationRequest): readonly Evidence[] {
  const margin = request.budgetKzt - profile.priceFromKzt;
  const evidence: Evidence[] = [
    {
      id: `${profile.id}:format`,
      kind: "format",
      text: `В профиле указан формат «${request.eventType}».`,
      source: { field: "eventFormats" },
    },
    {
      id: `${profile.id}:calendar`,
      kind: "calendar",
      text: `${request.date} отсутствует в списке занятых дат.`,
      source: { field: "busyDates" },
    },
    {
      id: `${profile.id}:price`,
      kind: "price",
      text: `Цена от ${currency.format(profile.priceFromKzt)} ₸; запас до бюджета — ${currency.format(margin)} ₸.`,
      source: { field: "priceFromKzt" },
    },
  ];
  if (request.language) {
    evidence.push({
      id: `${profile.id}:language`,
      kind: "language",
      text: `Язык «${request.language}» указан в профиле.`,
      source: { field: "languages" },
    });
  }
  if (request.durationHours !== undefined) {
    evidence.push({
      id: `${profile.id}:duration`,
      kind: "duration",
      text:
        profile.maxHours === null
          ? `Ограничение по длительности в профиле не задано; запрошено ${request.durationHours} ч.`
          : `Запрошено ${request.durationHours} ч., профиль допускает до ${profile.maxHours} ч.`,
      source: { field: "maxHours" },
    });
  }
  const excerpt = safeDescriptionExcerpt(profile.description);
  if (excerpt) {
    evidence.push({
      id: `${profile.id}:description`,
      kind: "description",
      text: `В описании указано: «${excerpt}»`,
      source: { field: "description", quote: excerpt },
    });
  }
  return Object.freeze(evidence);
}

export function renderExplanation(evidence: readonly Evidence[], selectedIds?: readonly string[]): string {
  const selected = selectedIds?.length
    ? selectedIds.map((id) => evidence.find((item) => item.id === id)).filter((item): item is Evidence => Boolean(item))
    : [
        evidence.find((item) => item.kind === "price"),
        evidence.find((item) => item.kind === "description") ??
          evidence.find((item) => item.kind === "duration") ??
          evidence.find((item) => item.kind === "language"),
      ].filter((item): item is Evidence => Boolean(item));
  const useful = selected.length ? selected.slice(0, 2) : evidence.slice(0, 2);
  return useful.map((item) => item.text).join(" ");
}
