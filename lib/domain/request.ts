import { z } from "zod";
import { DATE_WINDOW, type CatalogMeta, type RecommendationRequest } from "./types";
import { isCalendarDate } from "./catalog";

const optionalTrimmed = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const recommendationInputSchema = z
  .object({
    city: z.string().trim().min(1, "Выберите город"),
    date: z
      .string()
      .refine(isCalendarDate, "Введите реальную дату в формате YYYY-MM-DD")
      .refine((value) => value >= DATE_WINDOW.min && value <= DATE_WINDOW.max, `Дата должна быть в диапазоне ${DATE_WINDOW.min}—${DATE_WINDOW.max}`),
    eventType: z.string().trim().min(1, "Выберите тип мероприятия"),
    category: z.string().trim().min(1, "Выберите категорию"),
    budgetKzt: z.number().finite().int("Бюджет указывается в целых тенге").nonnegative("Бюджет не может быть отрицательным"),
    durationHours: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.number().finite().positive("Длительность должна быть больше нуля").optional(),
    ),
    language: optionalTrimmed,
  })
  .strict();

function canonical(value: string, allowed: readonly string[], label: string): string {
  const key = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
  const found = allowed.find((item) => item.toLocaleLowerCase("ru") === key);
  if (!found) throw new RequestValidationError(`${label}: значение «${value}» отсутствует в каталоге`);
  return found;
}

export class RequestValidationError extends Error {
  constructor(message: string, readonly issues: readonly string[] = [message]) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export function normalizeRequest(input: unknown, meta: CatalogMeta): RecommendationRequest {
  const result = recommendationInputSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.message);
    throw new RequestValidationError(issues.join("; "), issues);
  }
  const value = result.data;
  return Object.freeze({
    city: canonical(value.city, meta.cities, "Город"),
    date: value.date,
    eventType: canonical(value.eventType, meta.eventTypes, "Тип мероприятия"),
    category: canonical(value.category, meta.categories, "Категория"),
    budgetKzt: value.budgetKzt,
    ...(value.durationHours === undefined ? {} : { durationHours: value.durationHours }),
    ...(value.language === undefined ? {} : { language: canonical(value.language, meta.languages, "Язык") }),
  });
}
