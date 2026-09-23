import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const required = ["Что решает EventMatch", "Соответствие кейсу #79-lite", "Быстрый запуск", "Переменные окружения", "Датасет", "Правила фильтрации", "Ранжирование", "Диагностика", "Роль AI", "API", "Сценарии A–H", "Развёртывание", "Ограничения", "Журнал разработки"];
const missing = required.filter((heading) => !readme.includes(heading));
if (missing.length) throw new Error(`README lacks: ${missing.join(", ")}`);
if (!readme.includes("6a724b6b7dfb5973343e68ba18dadb60fc807d87e3d78f03ee86fb26cb089f7d")) throw new Error("dataset hash missing");
console.log("documentation verification passed");
