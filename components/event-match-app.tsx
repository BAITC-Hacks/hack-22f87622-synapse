"use client";

import { useRef, useState } from "react";
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
export function EventMatchApp({ meta }: Readonly<{ meta: CatalogMeta }>) {
  const [form, setForm] = useState<FormState>(scenarios.A);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runSearch(nextForm = form) {
    const currentId = ++requestId.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
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
      if (currentId === requestId.current) setResult(data as RecommendationResponse);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (currentId === requestId.current) setError(cause instanceof Error ? cause.message : "Неизвестная ошибка");
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
        <span className="header-note">Подрядчики для вашего события</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">События начинаются здесь <span aria-hidden="true">✦</span> {meta.profileCount} профилей в каталоге</p>
          <h1 id="hero-title">Найдём команду <em>для вашего события.</em></h1>
          <p className="lede">Укажите город, дату и бюджет. Мы покажем до трёх подрядчиков и конкретные причины, почему они подходят.</p>
          <a className="hero-link" href="#search-form">Начать подбор <span aria-hidden="true">↗</span></a>
        </div>
        <div className="event-art" aria-hidden="true">
          <div className="art-card art-wedding"><span className="art-orbit" /><span className="art-center" /><span className="art-caption">Свадьба</span></div>
          <div className="art-card art-corporate"><span className="art-beam beam-one" /><span className="art-beam beam-two" /><span className="art-caption">Корпоратив</span></div>
          <div className="art-card art-conference"><span className="art-sun" /><span className="art-arch arch-one" /><span className="art-arch arch-two" /><span className="art-caption">Конференция</span></div>
        </div>
      </section>

      <section className="workspace" aria-label="Подбор подрядчиков">
        <section className="search-panel" id="search-form">
          <div className="section-heading">
            <p className="step">01 / Ваш запрос</p>
            <div><h2>Кого ищем?</h2><p>Заполните пять обязательных полей. Язык и длительность можно добавить для точного совпадения.</p></div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
            <div className="form-grid">
              <label>Город *<select value={form.city} onChange={(e) => update("city", e.target.value)}>{meta.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
              <label>Дата *<input type="date" min={meta.dateWindow.min} max={meta.dateWindow.max} required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
              <label>Тип мероприятия *<select value={form.eventType} onChange={(e) => update("eventType", e.target.value)}>{meta.eventTypes.map((eventType) => <option key={eventType}>{eventType}</option>)}</select></label>
              <label>Категория *<select value={form.category} onChange={(e) => update("category", e.target.value)}>{meta.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Бюджет на подрядчика, ₸ *<input type="number" min="0" step="1" required value={form.budgetKzt} onChange={(e) => update("budgetKzt", e.target.value)} /></label>
            </div>
            <div className="optional-fields"><p><strong>Дополнительные условия</strong><span>По желанию</span></p><div className="optional-grid">
              <label>Язык<select value={form.language} onChange={(e) => update("language", e.target.value)}><option value="">Любой</option>{meta.languages.map((language) => <option key={language}>{language}</option>)}</select></label>
              <label>Длительность, ч.<input type="number" min="0.5" step="0.5" value={form.durationHours} onChange={(e) => update("durationHours", e.target.value)} placeholder="Без ограничения" /></label>
            </div></div>
            <div className="form-footer"><button className="submit-button" type="submit" disabled={loading}>{loading ? "Проверяем каталог…" : "Подобрать подрядчиков"} <span aria-hidden="true">↗</span></button><p>Проверяем дату, формат и цену по данным профилей.</p></div>
          </form>
          <div className="demo-block">
            <span>Попробовать демо <span aria-hidden="true">↗</span></span>
            <div className="scenario-list" aria-label="Демо-сценарии A–H">
              {Object.keys(scenarios).map((key) => <button type="button" className="scenario-button" key={key} onClick={() => chooseScenario(key)}>{key}</button>)}
            </div>
            <small>Сценарии A–H запускают настоящий подбор.</small>
          </div>
        </section>

        <section className="results-panel" aria-live="polite" aria-busy={loading}>
          <div className="section-heading">
            <p className="step">02 / Подходящие варианты</p>
            <div><h2>Результат подбора</h2><p>Только профили, прошедшие условия. Порядок — по стартовой цене, затем по ID.</p></div>
          </div>

          {error && <div className="state-card error" role="alert"><h3>Подбор не выполнен</h3><p>{error}</p></div>}
          {!result && !error && <div className="state-card empty"><span className="state-icon" aria-hidden="true">✳</span><h3>Ваши варианты появятся здесь</h3><p>Нажмите «Подобрать подрядчиков» или выберите демо-сценарий выше.</p></div>}
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
                    <div className="why-block"><h4>Почему подходит <span aria-hidden="true">✳</span></h4><ul>{card.evidence.filter((item) => item.kind !== "description").map((item) => <li key={item.id}><strong>{factLabels[item.kind]}</strong><span>{item.text}</span></li>)}</ul></div>
                    <details><summary>Почему этот вариант</summary><p className="explanation">{card.explanation}</p><ul>{card.evidence.map((item) => <li key={item.id}><span>{factLabels[item.kind]} · источник: <code>{item.source.field}</code></span>{item.kind === "description" && <span>{item.text}</span>}</li>)}</ul></details>
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
      {result.status === "matched" && result.counts.cityCategoryCandidates < 3 && <p>В городе найдено только {result.counts.cityCategoryCandidates} профиля выбранной категории.</p>}
      {entries.length > 0 && <ul>{entries.map(([reason, count]) => <li key={reason}>{EXCLUSION_LABELS[reason]}: {count}</li>)}</ul>}
      {result.diagnosis.budgetSuggestion && <div className="budget-tip"><p>Если поднять бюджет на {money.format(result.diagnosis.budgetSuggestion.increaseByKzt)} ₸, появится минимум один вариант.</p><button type="button" onClick={() => onBudget(result.diagnosis.budgetSuggestion!.minimumBudgetKzt)}>Проверить бюджет {money.format(result.diagnosis.budgetSuggestion.minimumBudgetKzt)} ₸</button></div>}
    </div>
  );
}
