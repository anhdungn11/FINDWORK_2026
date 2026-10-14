import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SKILL_CATALOG } from "../../../src/data/reference/skills/skill.catalog";
import { LANGUAGE_CERTIFICATE_TYPES } from "../../../src/data/reference/languages/language-certificates";
import { VIETNAM_PROVINCES } from "../../../src/data/reference/locations/provinces";

export const snapshot = {
  version: "cp8a-2026-10-15",
  provinceBoundaryEffectiveDate: "2025-07-01",
  sources: {
    skills: "src/data/reference/skills/skill.catalog.ts",
    certificates: "src/data/reference/languages/language-certificates.ts",
    provinces: "src/data/reference/locations/provinces.ts",
  },
  skills: SKILL_CATALOG,
  certificates: LANGUAGE_CERTIFICATE_TYPES,
  provinces: VIETNAM_PROVINCES,
};

if (require.main === module) {
  const path = resolve(__dirname, "reference-snapshot.json");
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content) {
      throw new Error("Reference snapshot differs from frontend catalogs; regenerate and review it.");
    }
    process.stdout.write("Reference snapshot matches frontend catalogs.\n");
  } else {
    writeFileSync(path, content);
    process.stdout.write(`Wrote ${path}.\n`);
  }
}
