import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCatalogCsv } from "../lib/domain/catalog";

const expectedHash = "6a724b6b7dfb5973343e68ba18dadb60fc807d87e3d78f03ee86fb26cb089f7d";
const catalog = parseCatalogCsv(readFileSync(path.join(process.cwd(), "data", "raw", "hackathon-dataset-anonymized.csv")));
if (catalog.profiles.length !== 66) throw new Error(`expected 66 source profiles, received ${catalog.profiles.length}`);
if (catalog.sha256 !== expectedHash) throw new Error(`source copy hash changed: ${catalog.sha256}`);
if (new Set(catalog.profiles.map((profile) => profile.id)).size !== catalog.profiles.length) throw new Error("duplicate ids");
console.log(`profiles=${catalog.profiles.length} sha256=${catalog.sha256}`);
console.log("dataset verification passed");
