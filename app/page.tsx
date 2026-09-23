import { EventMatchApp } from "@/components/event-match-app";
import { getCatalogMeta, loadCatalog } from "@/lib/domain/catalog";
import type { CatalogMeta } from "@/lib/domain/types";

function resolveMeta(): { ok: true; meta: CatalogMeta } | { ok: false } {
  try {
    return { ok: true, meta: getCatalogMeta(loadCatalog()) };
  } catch {
    return { ok: false };
  }
}

export default function Home() {
  const resolved = resolveMeta();
  if (!resolved.ok) {
    return (
      <main>
        <header className="hero compact-hero">
          <div className="brand-mark" aria-hidden="true">EM</div>
          <div><p className="eyebrow">EventMatch</p><h1>Каталог недоступен</h1></div>
        </header>
        <section className="source-error" role="alert">
          <h2>Не удалось проверить источник данных</h2>
          <p>Подбор остановлен: исходный CSV отсутствует или повреждён. Проверьте серверный файл <code>data/raw/hackathon-dataset-anonymized.csv</code> и повторите запуск.</p>
        </section>
      </main>
    );
  }
  return <EventMatchApp meta={resolved.meta} />;
}
