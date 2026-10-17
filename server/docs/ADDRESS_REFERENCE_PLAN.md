# P1 address reference design for submission

This is a design plan only. No reference data, schema, migration or database records were changed in this sprint.

## Existing foundation

- `Province(code,name,divisionType,isActive)` and `Ward(code,provinceId,name,divisionType,codename,isActive)` already have unique official-code fields. `GET /reference/provinces` and `GET /reference/wards?provinceCode=...` use bounded pagination and active-only filtering.
- `CandidateProfile`, `CompanyLocation` and `JobLocation` already use province/ward IDs with composite foreign keys that prevent assigning a ward to a different province. Candidate profile/onboarding has location validation. Jobs MVP does not yet accept JobLocation input.
- The existing CP8A 2026 snapshot validates 34 province/city records against source references. Its ward import gate explicitly says a complete verified 2026 ward extract is still missing. The same files are present in this worktree; do not regenerate the province snapshot or treat synthetic unit fixtures as administrative data.

## Controlled implementation sequence

1. **Canonical codes:** keep official code as the durable key and UUID as the internal relation key. Attach source ID, effective date and snapshot version to a separately reviewed ward import. Validate the full ward set, unique code, parent province, normalized name and legal source before any authorized seed. Preserve inactive historical entries used by existing addresses.
2. **Search aliases:** add a separate reviewed alias table only when verified old-name mappings are available. Store alias text, target official code, administrative level, source and validity period. Search may suggest an official result; ambiguous aliases must return choices rather than silently rewrite an address. Never use aliases as persisted canonical codes.
3. **Exact selection:** UI selects Province by official code, then Ward by official code within that Province. Backend resolves to IDs and checks the composite relation; local-area/street free text remains a separate optional field. If the verified ward catalog is incomplete, require only the location precision actually supported and label the missing precision explicitly.
4. **Shared address rules:** use one location validation policy for Candidate, CompanyLocation and future JobLocation writes. The future Job DTO can accept verified province/ward codes or IDs and persist the existing `JobLocation` relation; avoid introducing a second address representation. Do not infer a job location from company headquarters.
5. **Search and matching:** filter by exact verified province/ward membership. Unknown ward, old alias without confirmed mapping, or province-only preference must not be presented as ward proximity. Do not compute distance or "nearby" ranking without verified coordinates and a separately measured matching design.
6. **Rollout gates:** review source provenance and diff; inspect existing references and user addresses read-only; prepare an idempotent, scoped migration/seed plan; request explicit approval before any write; then verify counts, FK integrity, alias ambiguity and API pagination on isolated test data. No ward catalog is fabricated here.
