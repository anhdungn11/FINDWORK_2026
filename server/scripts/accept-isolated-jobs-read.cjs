// Read-only HTTP contract test against the isolated integration backend.
const assert = require("node:assert/strict");
const base = process.env.FINDWORK_ACCEPT_API_BASE || "http://127.0.0.1:3003/api/v1";
if (!/^http:\/\/127\.0\.0\.1:300[23]\/api\/v1$/.test(base)) throw new Error("Unexpected API base");

async function get(query) {
  const response = await fetch(`${base}/jobs?${new URLSearchParams(query)}`);
  return { status: response.status, body: await response.json() };
}

async function main() {
  const first = await get({ page: "1", pageSize: "1" });
  assert.equal(first.status, 200);
  assert.ok(first.body.pagination.total >= 2, "Expected the two existing fixtures");
  assert.equal(first.body.pagination.totalPages, first.body.pagination.total);
  assert.equal(first.body.data.length, 1);
  assert.equal(first.body.data[0].status, "PUBLISHED");
  assert.ok(Object.hasOwn(first.body.data[0].company, "logoUrl"));
  assert.ok(Array.isArray(first.body.data[0].locations));
  assert.equal(Object.hasOwn(first.body.data[0].company, "logoAssetKey"), false);

  const second = await get({ page: "2", pageSize: "1" });
  assert.equal(second.status, 200);
  assert.equal(second.body.pagination.total, first.body.pagination.total);
  assert.notEqual(second.body.data[0]?.id, first.body.data[0].id);
  const last = await get({ page: String(first.body.pagination.total), pageSize: "1" });
  assert.equal(last.status, 200);
  assert.equal(last.body.data.length, 1);
  if (first.body.pagination.total >= 3) assert.notEqual(second.body.data[0]?.id, last.body.data[0]?.id);
  const detailResponse = await fetch(`${base}/jobs/${first.body.data[0].id}`);
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.id, first.body.data[0].id);
  assert.ok(Array.isArray(detail.screeningQuestions));
  assert.ok(Array.isArray(detail.locations));
  assert.equal(Object.hasOwn(detail.company, "logoAssetKey"), false);
  const missingResponse = await fetch(`${base}/jobs/00000000-0000-4000-8000-000000000000`);
  assert.equal(missingResponse.status, 404);
  const beyond = await get({ page: String(first.body.pagination.total + 1), pageSize: "1" });
  assert.equal(beyond.status, 200);
  assert.equal(beyond.body.data.length, 0);
  assert.equal(beyond.body.pagination.total, first.body.pagination.total);

  const search = await get({ q: "Release", pageSize: "1", page: "2" });
  assert.equal(search.status, 200);
  assert.equal(search.body.pagination.total, 2);
  assert.equal(search.body.data.length, 1);
  const company = await get({ q: first.body.data[0].company.name, pageSize: "10" });
  assert.equal(company.status, 200);
  assert.ok(company.body.data.some((row) => row.company.id === first.body.data[0].company.id));
  const location = await get({ provinceCode: "01" });
  assert.equal(location.status, 200);
  assert.equal(location.body.pagination.total, 0);
  const salary = await get({ salaryAtLeast: "10000000", sort: "salary_desc" });
  assert.equal(salary.status, 200);
  assert.equal(salary.body.pagination.total, 0);
  const empty = await get({ q: "an-impossible-job-search-term" });
  assert.equal(empty.status, 200);
  assert.equal(empty.body.pagination.total, 0);
  for (const query of [{ page: "0" }, { pageSize: "101" }, { page: "oops" },
    { provinceCode: "ZZ" }, { salaryAtLeast: "200", salaryAtMost: "100" }, { sort: "random" }]) {
    const invalid = await get(query);
    assert.equal(invalid.status, 400, JSON.stringify(query));
  }
  const privateResponse = await fetch(`${base}/companies/${first.body.data[0].companyId}/jobs`);
  assert.equal(privateResponse.status, 401);
  console.log(JSON.stringify({ base, status: "PASS", publicTotal: first.body.pagination.total,
    pageSize: 1, firstId: first.body.data[0].id, secondId: second.body.data[0].id,
    lastId: last.body.data[0].id, beyondPageItems: 0, searchTotal: search.body.pagination.total,
    companySearch: "PASS", locationFilterTotal: 0, salaryFilterTotal: 0,
    emptySearchTotal: 0, invalidQueryChecks: 6, privateListAnonymous: 401,
    detail: 200, missingDetail: 404,
    middlePage: first.body.pagination.total >= 3 ? "PASS" : "PENDING_DEMO_DATA" }));
}
main().catch((error) => { console.error(`JOBS_READ_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
