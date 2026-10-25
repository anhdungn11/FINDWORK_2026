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
  const unicode = await get({ q: "Chúng tôi" });
  assert.equal(unicode.status, 200);
  assert.ok(unicode.body.data.some((row) => row.description.includes("Chúng tôi")));
  const description = await get({ q: "tuyển dụng" });
  assert.equal(description.status, 200);
  assert.ok(description.body.data.some((row) => row.description.includes("tuyển dụng")));
  const newest = await get({ sort: "newest", pageSize: "100" });
  assert.equal(newest.status, 200);
  assert.equal(newest.body.pagination.total, first.body.pagination.total);
  assert.equal(newest.body.data[0].id, first.body.data[0].id);
  const company = await get({ q: first.body.data[0].company.name, pageSize: "10" });
  assert.equal(company.status, 200);
  assert.ok(company.body.data.some((row) => row.company.id === first.body.data[0].company.id));
  const location = await get({ provinceCode: "01" });
  assert.equal(location.status, 200);
  assert.ok(location.body.pagination.total >= 1);
  assert.ok(location.body.data.every((row) => row.locations.some((item) => item.province?.code === "01")));
  const salary = await get({ salaryAtLeast: "10000000", sort: "salary_desc" });
  assert.equal(salary.status, 200);
  assert.ok(salary.body.pagination.total >= 1);
  assert.ok(salary.body.data.every((row) => row.showSalary && !row.salaryNegotiable &&
    Number(row.salaryMax) >= 10000000));
  const salaryCeiling = await get({ salaryAtMost: "100000000", currency: "VND", salaryPeriod: "MONTH" });
  assert.equal(salaryCeiling.status, 200);
  assert.ok(salaryCeiling.body.pagination.total >= 1);
  assert.ok(salaryCeiling.body.data.every((row) => row.showSalary && !row.salaryNegotiable &&
    row.currency === "VND" && row.salaryPeriod === "MONTH" && Number(row.salaryMin) <= 100000000));
  const salaryAscending = await get({ sort: "salary_asc", pageSize: "100" });
  const salaryDescending = await get({ sort: "salary_desc", pageSize: "100" });
  assert.equal(salaryAscending.status, 200);
  assert.equal(salaryDescending.status, 200);
  assert.equal(salaryAscending.body.pagination.total, salaryDescending.body.pagination.total);
  assert.ok(salaryAscending.body.data.every((row, index, all) =>
    index === 0 || Number(all[index - 1].salaryMin) <= Number(row.salaryMin)));
  assert.ok(salaryDescending.body.data.every((row, index, all) =>
    index === 0 || Number(all[index - 1].salaryMin) >= Number(row.salaryMin)));
  const category = await get({ categoryCode: location.body.data[0].category.code });
  assert.equal(category.status, 200);
  assert.ok(category.body.data.some((row) => row.id === location.body.data[0].id));
  const employment = await get({ employmentType: location.body.data[0].employmentType });
  assert.equal(employment.status, 200);
  assert.ok(employment.body.data.some((row) => row.id === location.body.data[0].id));
  const workplace = await get({ workplaceType: location.body.data[0].workplaceType });
  assert.equal(workplace.status, 200);
  assert.ok(workplace.body.data.some((row) => row.id === location.body.data[0].id));
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
  const resumeResponse = await fetch(`${base}/candidate/resumes/00000000-0000-4000-8000-000000000000`);
  assert.equal(resumeResponse.status, 401);
  const applicationResponse = await fetch(`${base}/candidate/applications/00000000-0000-4000-8000-000000000000`);
  assert.equal(applicationResponse.status, 401);
  console.log(JSON.stringify({ base, status: "PASS", publicTotal: first.body.pagination.total,
    pageSize: 1, firstId: first.body.data[0].id, secondId: second.body.data[0].id,
    lastId: last.body.data[0].id, beyondPageItems: 0, searchTotal: search.body.pagination.total,
    companySearch: "PASS", unicodeDescriptionSearch: "PASS", newestSort: "PASS",
    salarySortRows: salaryAscending.body.pagination.total,
    locationFilterTotal: location.body.pagination.total,
    salaryFilterTotal: salary.body.pagination.total, salaryCeilingTotal: salaryCeiling.body.pagination.total,
    categoryFilter: "PASS",
    employmentFilter: "PASS", workplaceFilter: "PASS",
    emptySearchTotal: 0, invalidQueryChecks: 6, privateListAnonymous: 401,
    privateResumeAnonymous: 401, privateApplicationAnonymous: 401,
    detail: 200, missingDetail: 404,
    middlePage: first.body.pagination.total >= 3 ? "PASS" : "PENDING_DEMO_DATA" }));
}
main().catch((error) => { console.error(`JOBS_READ_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
