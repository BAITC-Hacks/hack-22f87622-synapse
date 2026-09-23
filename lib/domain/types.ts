export const DATE_WINDOW = {
  min: "2026-09-23",
  max: "2026-12-31",
} as const;

export const RANKING_VERSION = "price-id-v1";
export const EXPLANATION_VERSION = "evidence-template-v1";

export type Profile = Readonly<{
  id: string;
  anonName: string;
  categories: readonly string[];
  city: string;
  priceFromKzt: number;
  eventFormats: readonly string[];
  languages: readonly string[];
  maxHours: number | null;
  busyDates: readonly string[];
  description: string;
  synthetic: boolean;
  cityImputed: boolean;
  priceImputed: boolean;
}>;

export type Catalog = Readonly<{
  profiles: readonly Profile[];
  version: string;
  sha256: string;
}>;

export type CatalogMeta = Readonly<{
  cities: readonly string[];
  categories: readonly string[];
  eventTypes: readonly string[];
  languages: readonly string[];
  dateWindow: typeof DATE_WINDOW;
  datasetVersion: string;
  profileCount: number;
}>;

export type RecommendationRequest = Readonly<{
  city: string;
  date: string;
  eventType: string;
  category: string;
  budgetKzt: number;
  durationHours?: number;
  language?: string;
}>;

export const EXCLUSION_ORDER = ["date", "format", "budget", "language", "duration"] as const;
export type ExclusionCode = (typeof EXCLUSION_ORDER)[number];
export const EXCLUSION_LABELS: Readonly<Record<ExclusionCode, string>> = {
  date: "заняты на дату",
  format: "не работают с форматом",
  budget: "выше бюджета",
  language: "нет языка",
  duration: "не хватает длительности",
};

export type ExclusionReason = Readonly<{
  code: ExclusionCode;
  message: string;
}>;

export type Evidence = Readonly<{
  id: string;
  kind: "format" | "calendar" | "price" | "language" | "duration" | "description";
  text: string;
  source: Readonly<{
    field: keyof Profile;
    quote?: string;
  }>;
}>;

export type RecommendationCard = Readonly<{
  id: string;
  name: string;
  categories: readonly string[];
  selectedCategory: string;
  city: string;
  priceFromKzt: number;
  explanation: string;
  evidence: readonly Evidence[];
  flags: Readonly<{
    synthetic: boolean;
    cityImputed: boolean;
    priceImputed: boolean;
  }>;
}>;

export type RecommendationStatus = "matched" | "no_category_in_city" | "no_matches";

export type AiMode =
  | "ai"
  | "ai_cache"
  | "fallback_disabled"
  | "fallback_no_key"
  | "fallback_timeout"
  | "fallback_error"
  | "fallback_invalid";

export type RecommendationResponse = Readonly<{
  request: RecommendationRequest;
  status: RecommendationStatus;
  cards: readonly RecommendationCard[];
  counts: Readonly<{
    cityCategoryCandidates: number;
    eligible: number;
    shown: number;
  }>;
  summary: string;
  diagnosis: Readonly<{
    exclusions: readonly Readonly<{
      profileId: string;
      reasons: readonly ExclusionReason[];
      primaryReason: ExclusionCode | null;
    }>[];
    primaryCounts: Readonly<Record<ExclusionCode, number>>;
    overlappingCounts: Readonly<Record<ExclusionCode, number>>;
    budgetSuggestion: null | Readonly<{
      minimumBudgetKzt: number;
      increaseByKzt: number;
      profileIds: readonly string[];
    }>;
  }>;
  datasetVersion: string;
  rankingVersion: string;
  ai: Readonly<{
    mode: AiMode;
    model: string | null;
    note: string;
  }>;
}>;
