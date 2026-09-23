"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { EXCLUSION_LABELS, type CatalogMeta, type Evidence, type RecommendationResponse } from "@/lib/domain/types";

type FormState = {
  city: string;
  date: string;
  eventType: string;
  category: string;
  budgetKzt: string;
  durationHours: string;
  language: string;
};

const scenarios: Record<string, FormState> = {
  A: { city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: "1000000", durationHours: "6", language: "русский" },
  B: { city: "Алматы", date: "2026-10-13", eventType: "корпоратив", category: "Ведущий", budgetKzt: "1000000", durationHours: "6", language: "русский" },
  C: { city: "Алматы", date: "2026-10-12", eventType: "свадьба", category: "Флорист", budgetKzt: "300000", durationHours: "6", language: "русский" },
  D: { city: "Алматы", date: "2026-11-14", eventType: "свадьба", category: "Флорист", budgetKzt: "300000", durationHours: "6", language: "русский" },
  E: { city: "Астана", date: "2026-10-12", eventType: "свадьба", category: "Декоратор", budgetKzt: "3000000", durationHours: "", language: "" },
  F: { city: "Алматы", date: "2026-10-12", eventType: "корпоратив", category: "Ведущий", budgetKzt: "450000", durationHours: "6", language: "русский" },
  G: { city: "Астана", date: "2026-11-14", eventType: "конференция", category: "Банкетный зал", budgetKzt: "3000000", durationHours: "8", language: "русский" },
  H: { city: "Астана", date: "2026-11-15", eventType: "конференция", category: "Банкетный зал", budgetKzt: "3000000", durationHours: "8", language: "русский" },
};

const money = new Intl.NumberFormat("ru-RU");
const factLabels: Record<Evidence["kind"], string> = {
  format: "Формат", calendar: "Дата", price: "Бюджет", language: "Язык", duration: "Длительность", description: "Из профиля",
};

function categoryTone(category: string): string {
  if (/флорист|декоратор/i.test(category)) return "floral";
  if (/ведущ|шоу|танцев|ансамбл|лайв|инструменталист/i.test(category)) return "stage";
  if (/зал|площадк|отель|ресторан/i.test(category)) return "venue";
  if (/фото|видео/i.test(category)) return "visual";
  return "celebration";
}

function highlightedFacts(evidence: readonly Evidence[], languageSelected: boolean): readonly Evidence[] {
  const kinds: Evidence["kind"][] = ["price", languageSelected ? "language" : "format"];
  return kinds.map((kind) => evidence.find((item) => item.kind === kind)).filter((item): item is Evidence => Boolean(item));
}

export function EventMatchApp({ meta }: Readonly<{ meta: CatalogMeta }>) {
  const [form, setForm] = useState<FormState>(scenarios.A);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    controller.current?.abort();
    requestId.current += 1;
    setLoading(false);
    setResult(null);
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runSearch(nextForm = form) {
    const currentId = ++requestId.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const payload = {
        city: nextForm.city,
        date: nextForm.date,
        eventType: nextForm.eventType,
        category: nextForm.category,
        budgetKzt: Number(nextForm.budgetKzt),
        ...(nextForm.durationHours ? { durationHours: Number(nextForm.durationHours) } : {}),
        ...(nextForm.language ? { language: nextForm.language } : {}),
      };
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: nextController.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Не удалось выполнить подбор");
      if (currentId === requestId.current) {
        setResult(data as RecommendationResponse);
        requestAnimationFrame(() => {
          if (currentId === requestId.current) document.getElementById("results")?.scrollIntoView({ block: "start" });
        });
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (currentId === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Неизвестная ошибка");
        requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ block: "start" }));
      }
    } finally {
      if (currentId === requestId.current) setLoading(false);
    }
  }

  function chooseScenario(key: string) {
    const next = scenarios[key];
    setForm(next);
    void runSearch(next);
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="identity"><span className="brand-mark" aria-hidden="true">✳</span><strong>EventMatch</strong></div>
        <nav className="site-nav" aria-label="Навигация"><a href="#search-form">Подбор</a><a href="#results">Результаты</a></nav>
        <span className="header-note">{meta.profileCount} профилей в каталоге</span>
      </header>

      <section className="workspace" aria-label="Подбор подрядчиков">
        <div className="first-screen">
        <section className="search-panel" id="search-form" aria-labelledby="hero-title">
          <div className="section-heading">
            <p className="step">Подбор подрядчиков в Казахстане</p>
            <div><h1 id="hero-title">Найдём команду <em>для вашего события.</em></h1><p>Укажите условия — покажем до трёх профилей с проверяемыми причинами выбора.</p></div>
          </div>

          <div className="category-picker"><div className="category-heading"><strong>Категории подрядчиков</strong><span>Листайте и выбирайте</span></div><div className="category-scroll" role="group" aria-label="Категории подрядчиков">{meta.categories.map((category) => <button type="button" className={`category-chip ${form.category === category ? "active" : ""}`} aria-pressed={form.category === category} key={category} onClick={() => update("category", category)}>{category}</button>)}</div></div>

          <form onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
            <div className="form-grid">
              <label>Город *<select value={form.city} onChange={(e) => update("city", e.target.value)}>{meta.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
              <label>Дата *<input type="date" min={meta.dateWindow.min} max={meta.dateWindow.max} required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
              <label>Тип мероприятия *<select value={form.eventType} onChange={(e) => update("eventType", e.target.value)}>{meta.eventTypes.map((eventType) => <option key={eventType}>{eventType}</option>)}</select></label>
              <label>Категория *<select value={form.category} onChange={(e) => update("category", e.target.value)}>{meta.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Бюджет на подрядчика, ₸ *<input type="number" min="0" step="1" required value={form.budgetKzt} onChange={(e) => update("budgetKzt", e.target.value)} /></label>
            </div>
            <details className="optional-fields"><summary>Дополнительные условия <span>{form.language || form.durationHours ? [form.language, form.durationHours ? `${form.durationHours} ч.` : ""].filter(Boolean).join(" · ") : "По желанию"}</span></summary><div className="optional-grid">
              <label>Язык<select value={form.language} onChange={(e) => update("language", e.target.value)}><option value="">Любой</option>{meta.languages.map((language) => <option key={language}>{language}</option>)}</select></label>
              <label>Длительность, ч.<input type="number" min="0.5" step="0.5" value={form.durationHours} onChange={(e) => update("durationHours", e.target.value)} placeholder="Без ограничения" /></label>
            </div></details>
            <div className="form-footer"><button className="submit-button" type="submit" disabled={loading}>{loading ? "Проверяем каталог…" : "Подобрать подрядчиков"} <span aria-hidden="true">↗</span></button><p>Дата, формат и цена сверяются с профилями.</p></div>
          </form>
          <div className="demo-block">
            <span>Попробовать демо <span aria-hidden="true">↗</span></span>
            <div className="scenario-list" aria-label="Демо-сценарии A–H">
              {Object.keys(scenarios).map((key) => <button type="button" className="scenario-button" key={key} onClick={() => chooseScenario(key)}>{key}</button>)}
            </div>
            <small>Сценарии A–H запускают настоящий подбор.</small>
          </div>
        </section>

        <aside className="hero-visual" aria-label="Атмосфера мероприятия"><Image src="/event-atmosphere.png" alt="Атмосфера концерта на открытом воздухе" fill sizes="(max-width: 760px) 100vw, 38vw" loading="eager" fetchPriority="high" className="hero-photo" /><div className="hero-visual-note"><span>EventMatch</span><strong>Идея события ближе, когда команда подходит.</strong><small>Иллюстрация атмосферы мероприятия</small></div></aside>
        </div>

        <section className="results-panel" id="results" aria-live="polite" aria-busy={loading}>
          <div className="section-heading">
            <p className="step">02 / Подходящие варианты</p>
            <div><h2>Результат подбора</h2><p>Только профили, прошедшие условия. Порядок — по стартовой цене, затем по ID.</p></div>
          </div>

          {error && <div className="state-card error" role="alert"><h3>Подбор не выполнен</h3><p>{error}</p></div>}
          {loading && <div className="state-card"><h3>Проверяем условия подбора</h3><p>Сверяем дату, формат и бюджет с каталогом.</p></div>}
          {!loading && !result && !error && <div className="state-card empty"><span className="state-icon" aria-hidden="true">✳</span><h3>Ваши варианты появятся здесь</h3><p>Нажмите «Подобрать подрядчиков» или выберите демо-сценарий выше.</p></div>}
          {result && (
            <div className="result-stack">
              <div className={`summary ${result.status}`}>
                <div><span className="status-dot" aria-hidden="true" /><strong>{result.summary}</strong></div>
                <p>Запрос на {result.request.date} · кандидатов {result.counts.cityCategoryCandidates} · прошли {result.counts.eligible} · показано {result.counts.shown}</p>
                <span className="mode-badge">{result.ai.mode.startsWith("ai") ? "AI выбрал факты" : "Проверенный fallback"}</span>
                <small>{result.ai.note}</small>
              </div>

              <div className="cards-grid">{result.cards.map((card, index) => (
                <article className="vendor-card" key={card.id}>
                  <div className="rank">{String(index + 1).padStart(2, "0")} / {String(result.cards.length).padStart(2, "0")}</div>
                  <div className={`card-art ${categoryTone(card.selectedCategory)}`} aria-hidden="true"><span className="card-art-orbit" /><span className="card-art-core" /><span className="card-art-label">{card.selectedCategory}</span></div>
                  <div className="vendor-main">
                    <div className="vendor-header">
                      <div><p className="vendor-id">{card.id} · {card.selectedCategory}</p><h3>{card.name}</h3><p>{card.city} · {card.categories.join(" · ")}</p></div>
                    </div>
                    <div className="price"><span>Стартовая цена</span><strong>от {money.format(card.priceFromKzt)} ₸</strong></div>
                    <div className="flag-list">
                      <span className="flag">{card.flags.synthetic ? "Синтетический профиль исходного датасета" : "Исходный анонимизированный профиль"}</span>
                      {card.flags.priceImputed && <span className="flag warning" title="Цена была дополнена при подготовке исходного набора">Цена дополнена</span>}
                      {card.flags.cityImputed && <span className="flag warning" title="Город был дополнен при подготовке исходного набора">Город дополнен</span>}
                    </div>
                    <div className="why-block"><h4>Почему подходит <span aria-hidden="true">✳</span></h4><ul>{highlightedFacts(card.evidence, Boolean(result.request.language)).map((item) => <li key={item.id}><strong>{factLabels[item.kind]}</strong><span>{item.text}</span></li>)}</ul></div>
                    <p className="availability-note">Дата {result.request.date} не отмечена занятой в каталоге.</p>
                    <details><summary>Почему этот вариант</summary><p className="explanation">{card.explanation}</p><ul>{card.evidence.map((item) => <li key={item.id}><span>{factLabels[item.kind]} · источник: <code>{item.source.field}</code></span>{(item.kind === "description" || item.kind === "calendar") && <span>{item.text}</span>}</li>)}</ul></details>
                  </div>
                </article>
              ))}</div>

              {result.cards.length < 3 && <Diagnostics result={result} onBudget={(budget) => { const next = { ...form, budgetKzt: String(budget) }; setForm(next); void runSearch(next); }} />}
              <p className="disclaimer">Цены указаны от. Итоговая стоимость не определена. Рекомендация не является бронированием.</p>
            </div>
          )}
        </section>
      </section>
      <footer><span>EventMatch · подбор по фактам</span><span>Версия данных: <code>{meta.datasetVersion.slice(0, 19)}…</code></span></footer>
    </main>
  );
}

function Diagnostics({ result, onBudget }: Readonly<{ result: RecommendationResponse; onBudget: (budget: number) => void }>) {
  const entries = Object.entries(result.diagnosis.primaryCounts).filter(([, count]) => count > 0) as [keyof typeof EXCLUSION_LABELS, number][];
  return (
    <div className="state-card diagnostic">
      <h3>{result.status === "no_category_in_city" ? "Категории нет в городе" : result.status === "matched" ? "Почему вариантов меньше трёх" : "Что исключило кандидатов"}</h3>
      {result.status === "matched" && result.counts.cityCategoryCandidates < 3 && <p>В городе найдено только {result.counts.cityCategoryCandidates} {result.counts.cityCategoryCandidates === 1 ? "профиль" : "профиля"} выбранной категории.</p>}
      {entries.length > 0 && <ul>{entries.map(([reason, count]) => <li key={reason}>{EXCLUSION_LABELS[reason]}: {count}</li>)}</ul>}
      {result.diagnosis.budgetSuggestion && <div className="budget-tip"><p>Если поднять бюджет на {money.format(result.diagnosis.budgetSuggestion.increaseByKzt)} ₸, появится минимум один вариант.</p><button type="button" onClick={() => onBudget(result.diagnosis.budgetSuggestion!.minimumBudgetKzt)}>Проверить бюджет {money.format(result.diagnosis.budgetSuggestion.minimumBudgetKzt)} ₸</button></div>}
    </div>
  );
}
