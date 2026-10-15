# CP8A reference foundation

Snapshot `reference-snapshot.json` is version `cp8a-2026-10-15`. It copies the frontend catalogs at `src/data/reference`: 67 skills, 30 language certificate types, and 34 provinces. `build-reference-snapshot.ts --check` verifies byte-for-byte agreement with those frontend sources. Run the generator only when deliberately updating the snapshot and review the resulting diff.

The province catalog states administrative boundaries effective 2025-07-01 under [Decision 19/2025/QĐ-TTg](https://chinhphu.vn/?classid=1&docid=214409&pageid=27160&typegroupid=5). Province codes are two-character strings. The frontend ward adapter currently uses `provinces.open-api.vn`, which is a third-party live API, not a versioned FINDWORK snapshot. Ward seed is **BLOCKED** until a complete, machine-checked snapshot can be reconciled against the [official annex II PDF](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/19ttg.signed.pdf), including code, name, province, unit type, and any later boundary changes. Do not fabricate ward rows or codes.

## Preview and apply

From `server`, set `DATABASE_URL` to the intended PostgreSQL database and run:

```powershell
npm run db:seed:reference -- --dry-run
```

Omitting the flag also selects dry-run. The command reports database name, snapshot version, create/update/unchanged counts, and the Ward blocker. It reads existing parent and target rows within a transaction and performs no writes. It fails if a SkillCategory or Language parent is missing or inactive.

After review and explicit authorization, apply with both `--apply` and `REFERENCE_SEED_ALLOW_WRITE=YES`:

```powershell
$env:REFERENCE_SEED_ALLOW_WRITE = "YES"
npm run db:seed:reference -- --apply
```

Apply uses code upserts inside one transaction. It preserves existing UUIDs, skips identical rows, never deletes rows, and does not deactivate codes outside the snapshot. This command does not run the existing Phase 1 seed. It does not seed Ward.

## Read API

All endpoints are under the configured `API_PREFIX` (normally `/api/v1`): `GET /reference/job-categories`, `/skill-categories`, `/skills`, `/languages`, `/language-certificate-types`, `/provinces`, and `/wards`. Each returns `{ "data": [], "pagination": { "page": 1, "pageSize": 100, "total": 0, "totalPages": 0 } }` when there are no matching database rows. UUIDs are returned only from persisted records.

Public catalogs return active records only. `active=true` is accepted for compatibility; `active=false` and `active=all` return HTTP 400. Children of inactive parents are excluded. Query parameters: `page` (default 1), `pageSize` (default 100, maximum 100). `parentCode` filters skill categories, `categoryCode` filters skills, `languageCode` filters certificate types, and `provinceCode` filters wards. Invalid filter codes or pagination return HTTP 400. Parent codes appear as `parentCode`, `categoryCode`, `languageCode`, and `provinceCode` in responses. Wards remain an empty result until an approved source is seeded.
