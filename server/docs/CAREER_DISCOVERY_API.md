# Career Discovery public API

All paths below have the `/api/v1` prefix. They are public reads backed by persisted PostgreSQL records. No login is required. No endpoint generates recommendations, match scores, salary forecasts or growth figures.

## Category discovery with current job counts

`GET /career/categories?page=1&pageSize=20&q=tech`

| Parameter | Contract |
| --- | --- |
| `page` | Integer 1–1,000,000; default 1. |
| `pageSize` | Integer 1–100; default 20. |
| `q` | Optional trimmed 1–100 character, case-insensitive substring of persisted job category `name` or `code`. |

Response: `{data:[{id,code,name,isActive,sortOrder,publishedJobCount}],pagination:{page,pageSize,total,totalPages}}`. Only active categories appear. The order is `sortOrder`, then `code`, then `id`, ascending. `publishedJobCount` counts jobs currently visible through public `GET /jobs`: PUBLISHED, already published, not past deadline or expiry, in an active category and active company. A category with no such jobs has count `0`. Counts are live at request time.

Nonempty response shape (angle brackets denote values read from PostgreSQL, not seeded examples):

```json
{"data":[{"id":"<JobCategory UUID>","code":"<persisted code>","name":"<persisted name>","isActive":true,"sortOrder":0,"publishedJobCount":0}],"pagination":{"page":1,"pageSize":20,"total":1,"totalPages":1}}
```

An empty catalog returns HTTP 200:

```json
{"data":[],"pagination":{"page":1,"pageSize":20,"total":0,"totalPages":0}}
```

Malformed or unknown query parameters return HTTP 400. The endpoint exposes no candidate, member, draft job or private company fields.

## Reuse existing catalogs and job search

- `GET /reference/job-categories`: active categories without counts. Response item `{id,code,name,isActive,sortOrder}`.
- `GET /reference/skill-categories?parentCode=<code>`: active skill categories. Response item `{id,code,name,isActive,sortOrder,parentCode}`; `parentCode` is nullable. Omit `parentCode` to browse all active categories whose parent is also active.
- `GET /reference/skills?categoryCode=<code>`: active skills in active categories. Response item `{id,code,name,aliases,isActive,sortOrder,categoryCode}`. Omit `categoryCode` to browse all.

Reference lists use `{data,pagination:{page,pageSize,total,totalPages}}`, default `page=1&pageSize=100`, and permit page 1–1,000,000 and pageSize 1–100. `active=true` is the only accepted active filter. Empty catalogs and valid filters with no matches return HTTP 200 with `data:[]` and `total:0`.

Use a career category's `code` with `GET /jobs?categoryCode=<code>&page=1&pageSize=20` to navigate to its currently visible jobs. Public job search also accepts `q` (job title), `companyId`, `employmentType`, and `workplaceType`; page is 1–1,000,000 and pageSize is 1–100. It returns `{data,pagination}` using the same visibility policy as `publishedJobCount`. Counts and job pages can change between requests as jobs are published, paused, closed or expire.

The schema has no career profile, recommendation score, growth trend or salary prediction model. Those features require an approved data source and contract before implementation.
