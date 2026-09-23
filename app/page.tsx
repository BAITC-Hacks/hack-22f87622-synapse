import { EventMatchApp } from "@/components/event-match-app";
import { getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";

export default function Home() {
  const meta = getCatalogMeta(loadCatalog());
  return <EventMatchApp meta={meta} />;
}
