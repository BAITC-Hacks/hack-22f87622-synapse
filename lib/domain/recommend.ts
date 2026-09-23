import { buildEvidence, renderExplanation } from "./evidence";
import {
  RANKING_VERSION,
  type Catalog,
  type ExclusionCode,
  type ExclusionReason,
  type Profile,
  type RecommendationCard,
  type RecommendationRequest,
  type RecommendationResponse,
} from "./types";

const primaryOrder: readonly ExclusionCode[] = ["date", "format", "budget", "language", "duration"];

function reasonsFor(profile: Profile, request: RecommendationRequest): readonly ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  if (profile.busyDates.includes(request.date)) reasons.push({ code: "date", message: `Занят ${request.date}` });
  if (!profile.eventFormats.includes(request.eventType)) reasons.push({ code: "format", message: `Формат «${request.eventType}» не указан` });
  if (profile.priceFromKzt > request.budgetKzt) reasons.push({ code: "budget", message: `Цена от ${profile.priceFromKzt} ₸ выше бюджета` });
  if (request.language && !profile.languages.includes(request.language)) reasons.push({ code: "language", message: `Язык «${request.language}» не указан` });
  if (request.durationHours !== undefined && profile.maxHours !== null && profile.maxHours < request.durationHours) {
    reasons.push({ code: "duration", message: `Максимум ${profile.maxHours} ч. при запросе ${request.durationHours} ч.` });
  }
  return reasons;
}

function cardFor(profile: Profile, request: RecommendationRequest): RecommendationCard {
  const evidence = buildEvidence(profile, request);
  return {
    id: profile.id,
    name: profile.anonName,
    categories: profile.categories,
    selectedCategory: request.category,
    city: profile.city,
    priceFromKzt: profile.priceFromKzt,
    explanation: renderExplanation(evidence),
    evidence,
    flags: {
      synthetic: profile.synthetic,
      cityImputed: profile.cityImputed,
      priceImputed: profile.priceImputed,
    },
  };
}

function emptyCounts(): Record<ExclusionCode, number> {
  return { date: 0, format: 0, budget: 0, language: 0, duration: 0 };
}

export function recommend(catalog: Catalog, request: RecommendationRequest): RecommendationResponse {
  const candidates = catalog.profiles.filter(
    (profile) => profile.city === request.city && profile.categories.includes(request.category),
  );
  const evaluations = candidates.map((profile) => ({ profile, reasons: reasonsFor(profile, request) }));
  const eligible = evaluations
    .filter((item) => item.reasons.length === 0)
    .map((item) => item.profile)
    .sort((a, b) => a.priceFromKzt - b.priceFromKzt || a.id.localeCompare(b.id));
  const cards = eligible.slice(0, 3).map((profile) => cardFor(profile, request));
  const exclusions = evaluations
    .filter((item) => item.reasons.length > 0)
    .map((item) => ({
      profileId: item.profile.id,
      reasons: item.reasons,
      primaryReason: primaryOrder.find((code) => item.reasons.some((reason) => reason.code === code)) ?? null,
    }));
  const primaryCounts = emptyCounts();
  const overlappingCounts = emptyCounts();
  for (const exclusion of exclusions) {
    if (exclusion.primaryReason) primaryCounts[exclusion.primaryReason] += 1;
    for (const reason of exclusion.reasons) overlappingCounts[reason.code] += 1;
  }
  const budgetAlternatives = evaluations.filter(
    (item) => item.profile.priceFromKzt > request.budgetKzt && item.reasons.every((reason) => reason.code === "budget"),
  );
  const minimumBudget = budgetAlternatives.length
    ? Math.min(...budgetAlternatives.map((item) => item.profile.priceFromKzt))
    : null;
  const budgetSuggestion =
    minimumBudget === null
      ? null
      : {
          minimumBudgetKzt: minimumBudget,
          increaseByKzt: minimumBudget - request.budgetKzt,
          profileIds: budgetAlternatives.filter((item) => item.profile.priceFromKzt === minimumBudget).map((item) => item.profile.id),
        };
  const status = candidates.length === 0 ? "no_category_in_city" : eligible.length === 0 ? "no_matches" : "matched";
  const summary =
    status === "no_category_in_city"
      ? `В городе ${request.city} нет профилей категории «${request.category}».`
      : status === "no_matches"
        ? "Категория в городе есть, но все профили исключены заданными условиями."
        : eligible.length < 3
          ? `Найдено ${eligible.length}: меньше трёх вариантов проходит все условия.`
          : `Найдено ${eligible.length}; показаны первые три по стартовой цене.`;
  return {
    request,
    status,
    cards,
    counts: { cityCategoryCandidates: candidates.length, eligible: eligible.length, shown: cards.length },
    summary,
    diagnosis: { exclusions, primaryCounts, overlappingCounts, budgetSuggestion },
    datasetVersion: catalog.version,
    rankingVersion: RANKING_VERSION,
    ai: {
      mode: process.env.AI_ENABLED === "false" ? "fallback_disabled" : "fallback_no_key",
      model: null,
      note: "Использованы проверенные шаблонные объяснения; состав и порядок рассчитаны программно.",
    },
  };
}
