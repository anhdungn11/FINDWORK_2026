# CP8A reference foundation

`reference-snapshot.json` is version `cp8a-2026-10-15`. It copies curated local catalogs from `src/data/reference`: 67 skills, 30 language certificate types, and 34 provinces. The skills span 20 categories across technology, business, services, industry, education, healthcare, and legal work; they form an initial catalog, not an exhaustive occupational taxonomy. `build-reference-snapshot.ts --check` verifies byte-for-byte agreement with those source files. This records repository provenance, not endorsement by a government or industry authority. Review the diff whenever regenerating the snapshot.

## Administrative data status

The reviewed 2026 provincial **source-preparation** artifact and the ward blocker report are in [VIETNAM_ADMINISTRATIVE_2026.md](./VIETNAM_ADMINISTRATIVE_2026.md). The `reference-snapshot.json` Province rows below remain the historical 2025 baseline; they have deliberately not been replaced or connected to the seed command. Province and Ward database apply remain blocked pending a separate reviewed seed design and authorization.

The Province rows in `reference-snapshot.json` reflect [Decision 19/2025/QĐ-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160), effective 2025-07-01. They are **not a current 2026 catalog**. A separate 34-row 2026 provincial source-preparation artifact now records the verified changes to codes 75, 22, and 24 and cites their legal effective dates. Province seed remains **BLOCKED** because the reviewed artifact has no apply path, and UUID/history/conflict behavior must be approved before any write. Preserve stable codes and existing UUIDs; do not mix administrative versions.

Decision 19/2025 includes 3,321 commune, ward, and special-zone codes in Annex II. The current Ward catalog also needs subsequent changes, including [Resolution 388/NQ-UBTVQH16](https://congbao.chinhphu.vn/cong-bao/cong-bao-so-495-ngay-28-08-2026-47434.htm) effective 2026-09-20 for Bắc Ninh wards and [Resolution 237/NQ-UBTVQH16](https://vanban.chinhphu.vn/?docid=217876&pageid=27160) for Đồng Nai wards. The frontend ward adapter uses `provinces.open-api.vn`, a third-party live API, not a versioned FINDWORK snapshot. Ward seed is **BLOCKED** until a complete, machine-checked official snapshot is reconciled for code, Unicode name, province mapping, unit type, effective date, and later changes. Do not fabricate ward rows or codes.

## Preview and future apply

From `server`, set `DATABASE_URL` to the intended PostgreSQL database and run:

```powershell
npm run db:seed:reference -- --dry-run --skills-certificates-only
```

Omitting `--dry-run` also selects dry-run. The transaction is explicitly read-only. The command reports database name, snapshot version, create/update/unchanged counts for Skill and Certificate, and Province/Ward blockers. It fails if a SkillCategory or Language parent is missing or inactive, or if an existing target code is inactive or points to a different parent. Historical Province rows are never written by this seed.

After separate review and explicit database-write authorization, a future Skill/Certificate apply requires `--apply --skills-certificates-only`, `REFERENCE_SEED_ALLOW_WRITE=YES`, and `REFERENCE_SEED_EXPECT_DATABASE` matching the database name in `DATABASE_URL`:

```powershell
$env:REFERENCE_SEED_ALLOW_WRITE = "YES"
$env:REFERENCE_SEED_EXPECT_DATABASE = "findwork_dev"
npm run db:seed:reference -- --apply --skills-certificates-only
```

Apply uses code upserts inside one transaction for Skill and LanguageCertificateType only. It preserves existing UUIDs, skips identical rows, never deletes rows, and does not reactivate inactive codes or move codes to another parent. An unscoped `--apply` fails before connecting. This command does not run the existing Phase 1 seed and does not seed Province or Ward.

## Read API

All endpoints are under the configured `API_PREFIX` (normally `/api/v1`): `GET /reference/job-categories`, `/skill-categories`, `/skills`, `/languages`, `/language-certificate-types`, `/provinces`, and `/wards`. Each returns `{ "data": [], "pagination": { "page": 1, "pageSize": 100, "total": 0, "totalPages": 0 } }` when there are no matching database rows. UUIDs are returned only from persisted records.

Public catalogs return active records only. `active=true` is accepted; `active=false` and `active=all` return HTTP 400. Children of inactive parents are excluded. Query parameters: `page` (default 1), `pageSize` (default 100, maximum 100). `parentCode` filters skill categories, `categoryCode` filters skills, `languageCode` filters certificate types, and `provinceCode` filters wards. Invalid filter codes or pagination return HTTP 400. Parent codes appear as `parentCode`, `categoryCode`, `languageCode`, and `provinceCode` in responses. Provinces and wards remain empty until separately approved, authoritative data is prepared and applied.
