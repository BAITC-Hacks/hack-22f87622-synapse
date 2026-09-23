import { NextResponse } from "next/server";
import { CatalogDataError, getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";

export const runtime = "nodejs";

export function GET(): NextResponse {
  try {
    return NextResponse.json(getCatalogMeta(loadCatalog()));
  } catch (error) {
    const message = error instanceof CatalogDataError ? error.message : "Каталог временно недоступен";
    return NextResponse.json({ error: "catalog_error", message }, { status: 500 });
  }
}
