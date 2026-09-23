"use client";

import { useRef, useState } from "react";
import type { CatalogMeta, RecommendationResponse } from "@/lib/domain/types";

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
const reasonLabels = { date: "заняты на дату", format: "не работают с форматом", budget: "выше бюджета", language: "нет языка", duration: "не хватает длительности" } as const;

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
    <main>
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">EM</div>
        <div>
          <p className="eyebrow">Кейс #79-lite · {meta.profileCount} профилей</p>
          <h1>EventMatch</h1>
          <p className="lede">До трёх подрядчиков из каталога — с проверкой календаря, бюджета и понятными основаниями каждого выбора.</p>
        </div>
        <div className="trust-note"><span aria-hidden="true">✓</span> Отбор работает без AI и не ослабляет условия</div>
      </header>

      <section className="workspace" aria-label="Подбор подрядчиков">
        <aside className="search-panel">
          <div className="section-heading">
            <p className="step">01</p>
            <div><h2>Условия события</h2><p>Обязательные поля отмечены звёздочкой.</p></div>
          </div>

          <div className="demo-block">
            <span>Демо-сценарии</span>
            <div className="scenario-list" aria-label="Демо-сценарии A–H">
              {Object.keys(scenarios).map((key) => <button type="button" className="scenario-button" key={key} onClick={() => chooseScenario(key)}>{key}</button>)}
            </div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void runSearch(); }}>
            <div className="form-grid">
              <label>Город *<select value={form.city} onChange={(e) => update("city", e.target.value)}>{meta.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
              <label>Дата *<input type="date" min={meta.dateWindow.min} max={meta.dateWindow.max} required value={form.date} onChange={(e) => update("date", e.target.value)} /></label>
              <label>Тип мероприятия *<select value={form.eventType} onChange={(e) => update("eventType", e.target.value)}>{meta.eventTypes.map((eventType) => <option key={eventType}>{eventType}</option>)}</select></label>
              <label>Категория *<select value={form.category} onChange={(e) => update("category", e.target.value)}>{meta.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Бюджет на подрядчика, ₸ *<input type="number" min="0" step="1" required value={form.budgetKzt} onChange={(e) => update("budgetKzt", e.target.value)} /></label>
              <label>Длительность, ч.<input type="number" min="0.5" step="0.5" value={form.durationHours} onChange={(e) => update("durationHours", e.target.value)} placeholder="Не ограничивать" /></label>
              <label className="wide">Язык<select value={form.language} onChange={(e) => update("language", e.target.value)}><option value="">Не ограничивать</option>{meta.languages.map((language) => <option key={language}>{language}</option>)}</select></label>
            </div>
            <button className="submit-button" type="submit" disabled={loading}>{loading ? "Проверяем каталог…" : "Подобрать подрядчиков"}</button>
          </form>
        </aside>

        <section className="results-panel" aria-live="polite" aria-busy={loading}>
          <div className="section-heading">
            <p className="step">02</p>
            <div><h2>Результат</h2><p>Все варианты проходят условия. Порядок — по стартовой цене.</p></div>
          </div>

          {error && <div className="state-card error" role="alert"><h3>Подбор не выполнен</h3><p>{error}</p></div>}
          {!result && !error && <div className="state-card empty"><h3>Задайте условия</h3><p>Или запустите один из сценариев A–H — каждый обращается к настоящему backend.</p></div>}
          {result && (
            <div className="result-stack">
              <div className={`summary ${result.status}`}>
                <div><span className="status-dot" aria-hidden="true" /><strong>{result.summary}</strong></div>
                <p>Запрос на {result.request.date} · кандидатов {result.counts.cityCategoryCandidates} · прошли {result.counts.eligible} · показано {result.counts.shown}</p>
                <span className="mode-badge">{result.ai.mode.startsWith("ai") ? "AI выбрал факты" : "Проверенный fallback"}</span>
                <small>{result.ai.note}</small>
              </div>

              {result.cards.map((card, index) => (
                <article className="vendor-card" key={card.id}>
                  <div className="rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="vendor-main">
                    <div className="vendor-header">
                      <div><p className="vendor-id">{card.id} · {card.selectedCategory}</p><h3>{card.name}</h3><p>{card.city} · {card.categories.join(" · ")}</p></div>
                      <div className="price"><span>от</span>{money.format(card.priceFromKzt)} ₸</div>
                    </div>
                    <p className="explanation">{card.explanation}</p>
                    <div className="flag-list">
                      <span className="flag success">Свободен {result.request.date}</span>
                      <span className="flag">{card.flags.synthetic ? "Синтетический профиль исходного датасета" : "Исходный анонимизированный профиль"}</span>
                      {card.flags.priceImputed && <span className="flag warning" title="Цена была дополнена при подготовке исходного набора">Цена дополнена</span>}
                      {card.flags.cityImputed && <span className="flag warning" title="Город был дополнен при подготовке исходного набора">Город дополнен</span>}
                    </div>
                    <details><summary>Почему этот вариант</summary><ul>{card.evidence.map((item) => <li key={item.id}><span>{item.text}</span><code>{item.source.field}</code></li>)}</ul></details>
                  </div>
                </article>
              ))}

              {result.cards.length === 0 && <Diagnostics result={result} onBudget={(budget) => { const next = { ...form, budgetKzt: String(budget) }; setForm(next); void runSearch(next); }} />}
              <p className="disclaimer">Цены указаны от. Итоговая стоимость не определена. Рекомендация не является бронированием.</p>
            </div>
          )}
        </section>
      </section>
      <footer>Версия данных: <code>{meta.datasetVersion.slice(0, 19)}…</code></footer>
    </main>
  );
}

function Diagnostics({ result, onBudget }: Readonly<{ result: RecommendationResponse; onBudget: (budget: number) => void }>) {
  const entries = Object.entries(result.diagnosis.primaryCounts).filter(([, count]) => count > 0) as [keyof typeof reasonLabels, number][];
  return (
    <div className="state-card diagnostic">
      <h3>{result.status === "no_category_in_city" ? "Категории нет в городе" : "Что исключило кандидатов"}</h3>
      {entries.length > 0 && <ul>{entries.map(([reason, count]) => <li key={reason}>{reasonLabels[reason]}: {count}</li>)}</ul>}
      {result.diagnosis.budgetSuggestion && <div className="budget-tip"><p>Если поднять бюджет на {money.format(result.diagnosis.budgetSuggestion.increaseByKzt)} ₸, появится минимум один вариант.</p><button type="button" onClick={() => onBudget(result.diagnosis.budgetSuggestion!.minimumBudgetKzt)}>Проверить бюджет {money.format(result.diagnosis.budgetSuggestion.minimumBudgetKzt)} ₸</button></div>}
    </div>
  );
}
