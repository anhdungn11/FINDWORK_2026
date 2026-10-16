# Vietnam administrative reference preparation, as of 2026-10-16

`vietnam-administrative-2026-10-16.json` is a **source-preparation artifact**, separate from the existing 2025 `reference-snapshot.json`. It contains 34 reviewed provincial codes and no ward rows. It is not wired to the seed command or the Reference API. Run the offline validator from `server` with `npm run validate:admin:2026`; it never opens a database connection.

## Official evidence matrix

| Source | Scope and effective date | Use |
| --- | --- | --- |
| [Decision 19/2025/QĐ-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160) | 34 provincial and 3,321 commune-level codes, effective 2025-07-01 | Baseline code/name catalog and code permanence rules. Not a current 2026 ward snapshot. |
| [Cục Thống kê administrative register](https://danhmuchanhchinh.nso.gov.vn/DiaBan1.aspx) | Viewed 2026-10-16 | Cross-check of all 34 current provincial codes and names, including codes 22, 24, 75. Interactive ward views exist; a complete dated national export has not been verified. |
| [Resolution 30/2026/QH16](https://vanban.chinhphu.vn/?classid=1&docid=218009&pageid=27160) | 2026-04-30 | Province code 75 becomes Thành phố Đồng Nai. |
| [Resolution 36/2026/QH16](https://vanban.chinhphu.vn/?classid=1&docid=219325&pageid=27160) | 2026-09-01 | Province code 22 becomes Thành phố Quảng Ninh. |
| [Resolution 39/2026/QH16](https://vanban.chinhphu.vn/?classid=1&docid=219328&pageid=27160) | 2026-09-20 | Province code 24 becomes Thành phố Bắc Ninh. |
| [Resolution 237/NQ-UBTVQH16](https://vanban.chinhphu.vn/?docid=217876&pageid=27160) | 2026-04-30 | Ten Đồng Nai communes become wards; code/name/type reconciliation is still required. |
| [Resolution 388/NQ-UBTVQH16, Công báo 495](https://congbao.chinhphu.vn/cong-bao/cong-bao-so-495-ngay-28-08-2026-47434.htm) | 2026-09-20 | Bắc Ninh ward changes; code/name/type reconciliation is still required. |

The first five sources support the prepared 34-row provincial list. The three 2026 resolutions change names and unit types, while the Statistics Office register retains codes `75`, `22`, and `24`. The 2025 Decision states that a change of name or rural/urban classification does not itself change an official code. The `effectiveDate` of an unchanged row means the **catalog baseline** became effective on 2025-07-01; it is not a claim that the province was created that day. For the three changed rows, it is the resolution's effective date. All rows cite a legal source and the Statistics Office register in the JSON manifest.

## Ward/commune status

**BLOCKED.** Decision 19/2025 contains 3,321 commune-level entries at its 2025-07-01 baseline. Subsequent resolutions include at least the Đồng Nai and Bắc Ninh changes above. A nationwide, dated, authoritative extract applicable on 2026-10-16 with every five-digit code, Unicode name, unit type, province parent, and change/closure history has not been acquired and reconciled. The interactive Statistics Office register alone was not captured as a complete reproducible export. No 2025 rows are copied into a purported 2026 ward snapshot.

`validateAdministrativeWardImport` is an offline structural gate for a future official extract: it checks exact province dataset version/date, declared complete count, unique five-digit codes, NFC names, unit-type prefixes, province parents, and legal source/effective dates. A matching count is only a structural check: a reviewer must independently establish the official total and compare every row to the dated source before declaring the extract authoritative. Synthetic unit-test wards are not catalog entries.

## Persistence and compatibility

Prisma already has unique official `Province.code` and `Ward.code`, Unicode name fields, unit types, UUID primary keys, and `Ward.provinceId`. CandidateProfile, CompanyLocation, and JobLocation enforce province/ward pairing through composite foreign keys. No schema migration is justified for **offline preparation**. A future temporal history requirement needs a separate reviewed schema design; the current tables store only the current label/type, so updating an existing province in place would lose its prior displayed name unless history is preserved elsewhere. Keep UUIDs stable and do not delete referenced rows.

Candidate Profile and Company Location writes accept UUIDs; Candidate Onboarding Import resolves official province/ward codes to active UUIDs and requires the ward to belong to that province. Candidate Career Preference stores province UUIDs. The public Reference endpoints return active database rows with both UUID and code, and Ward responses include `provinceCode`. JobLocation has province/ward UUID foreign keys; no code-to-UUID job import was found in this scope. Before any controlled apply, review existing code collisions and legacy records, validate all ward parents against the same version, preserve UUIDs, and agree on history/alias treatment for old codes and names. The current development database was not modified.

## Seed gate

The existing `db:seed:reference` command still rejects an unscoped `--apply` and only permits Skill/Certificate writes under its explicit scope and environment gates. This administrative artifact has no apply path. A future province/ward seed needs separate authorization, reviewed idempotent code-to-UUID logic, a complete ward source, version checks, conflict handling, and a read-only preview before any database write approval is requested.
