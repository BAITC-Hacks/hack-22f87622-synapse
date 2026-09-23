import { NextResponse } from "next/server";
import { enhanceWithAi } from "@/lib/ai/explain";
import { CatalogDataError, getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";
import { recommend } from "@/lib/domain/recommend";
import { normalizeRequest, RequestValidationError } from "@/lib/domain/request";
import { allowRequest } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        // Do not wait for a client or transport that ignores cancellation.
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, size).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(ip)) {
    return NextResponse.json({ error: "rate_limited", message: "Слишком много запросов. Повторите через минуту." }, { status: 429 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request_too_large", message: "Запрос слишком большой." }, { status: 413 });
  }
  try {
    const bodyText = await readBoundedBody(request);
    if (bodyText === null) {
      return NextResponse.json({ error: "request_too_large", message: "Запрос слишком большой." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new RequestValidationError("Тело запроса должно быть корректным JSON");
    }
    const catalog = loadCatalog();
    const normalized = normalizeRequest(body, getCatalogMeta(catalog));
    const result = recommend(catalog, normalized);
    return NextResponse.json(await enhanceWithAi(result));
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: "validation_error", message: error.message, issues: error.issues }, { status: 400 });
    }
    if (error instanceof CatalogDataError) {
      return NextResponse.json({ error: "catalog_error", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "internal_error", message: "Не удалось выполнить подбор." }, { status: 500 });
  }
}
