# EventMatch: правила работы

- Завершать каждый содержательный запрос актуализацией README и журнала разработки, проверками, осмысленным коммитом и push в настроенный целевой remote.
- Перед публикацией проверять код, тесты, production build, staged diff и отсутствие секретов; не заявлять о проверке или push без фактического успеха.
- Не менять детерминированную фильтрацию, порядок `price_from_kzt → id` и диагностические статусы без явного документирования.
- Не ослаблять запросы пользователя, не добавлять занятых подрядчиков и не позволять AI менять состав или порядок карточек.
- Не коммитить ключи, локальные env-файлы, логи и служебные артефакты; `.env.example` хранит только имена и безопасные значения.
- Не использовать force push, не переписывать опубликованную историю и не включать посторонние правки.

Полное продуктовое и техническое ТЗ находится в `docs/spec.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
