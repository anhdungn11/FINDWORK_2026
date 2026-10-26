// Real HTTP acceptance on a new, disposable local PostgreSQL database only.
// Never prints credentials, tokens, private resumes, or candidate contact data.
const assert = require("node:assert/strict");
const { createDecipheriv, randomBytes, randomUUID } = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

if (process.argv.length !== 2) throw new Error("Usage: node scripts/accept-disposable-recruitment.cjs");
const root = path.resolve(__dirname, "..");
const env = dotenv.parse(readFileSync(path.join(root, ".env.employer-media.local")));
const sourceUrl = new URL(env.DATABASE_URL);
if (env.NODE_ENV !== "test" || sourceUrl.protocol !== "postgresql:" ||
    sourceUrl.hostname !== "127.0.0.1" || sourceUrl.port !== "5432" ||
    sourceUrl.pathname !== "/findwork_employer_media_3002" ||
    sourceUrl.searchParams.get("schema") !== "public") {
  throw new Error("Local integration credentials/identity are required to create the disposable target");
}
const dbName = `findwork_release_e2e_${randomBytes(6).toString("hex")}`;
const dbUrl = new URL(sourceUrl);
dbUrl.pathname = `/${dbName}`;
const maintenanceUrl = new URL(sourceUrl);
maintenanceUrl.pathname = "/postgres";
maintenanceUrl.search = "";
const maintenance = new Client({ connectionString: maintenanceUrl.toString(), connectionTimeoutMillis: 5000 });
const database = new Client({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 5000 });
const marker = randomUUID().slice(0, 8);
let apiProcess;
let apiDiagnostic = "";
let created = false;
let port;

function command(label, args, childEnv) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: childEnv,
    encoding: "utf8", timeout: 180_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.error?.code || result.stderr?.trim().slice(0, 350) || result.status}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const selected = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return selected;
}

async function waitForApi(base) {
  for (let attempt = 0; attempt < 160; attempt++) {
    if (apiProcess.exitCode !== null) throw new Error(`Isolated API exited with code ${apiProcess.exitCode}`);
    try {
      const response = await fetch(`${base}/reference/job-categories?pageSize=1`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Startup is still in progress. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Isolated API did not become healthy: ${apiDiagnostic.slice(-600)}`);
}

async function call(base, method, route, token, body, expected, code) {
  const response = await fetch(base + route, { method, headers: {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(body && { "Content-Type": "application/json" }),
  }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10_000) });
  const value = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${route}: expected ${expected}, got ${response.status} ${value?.code || ""}`);
  if (code) assert.equal(value?.code, code, `${method} ${route}: error code`);
  return value;
}

async function postJob(base, companyId, ownerToken, categoryId, title, salaryMin, provinceCode, extra = {}) {
  return call(base, "POST", `/companies/${companyId}/jobs`, ownerToken, {
    categoryId, title,
    description: "Bài đăng mẫu [DEMO FINDWORK] để kiểm thử tuyển dụng; không phải tin tuyển dụng thực tế. Kỹ sư phối hợp với nhóm sản phẩm.",
    employmentType: "FULL_TIME", workplaceType: "HYBRID", location: { provinceCode },
    salaryMin: String(salaryMin), salaryMax: String(salaryMin + 10_000_000),
    currency: "VND", salaryPeriod: "MONTH", showSalary: true, ...extra,
  }, 201);
}

async function publish(base, companyId, ownerToken, job) {
  return call(base, "POST", `/companies/${companyId}/jobs/${job.id}/publish`, ownerToken,
    { version: job.version }, 200);
}

async function main() {
  await maintenance.connect();
  try {
    const source = new Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
    try {
      await source.connect();
      const identity = (await source.query("SELECT current_database() AS database, current_schema() AS schema")).rows[0];
      assert.deepEqual(identity, { database: "findwork_employer_media_3002", schema: "public" });
    } finally { await source.end().catch(() => {}); }
    await maintenance.query(`CREATE DATABASE "${dbName}"`);
    created = true;
    const childEnv = { ...process.env, ...env, DATABASE_URL: dbUrl.toString(), NODE_ENV: "test",
      EMAIL_DELIVERY_MODE: "disabled", EMAIL_WORKER_ENABLED: "false",
      EMAIL_INVITATION_DELIVERY_ENABLED: "false" };
    command("Prisma migrate deploy", ["./node_modules/prisma/build/index.js", "migrate", "deploy"], childEnv);
    command("Foundational reference/RBAC seed", ["./node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], childEnv);
    const adminEmail = `release-${marker}-platform-admin@example.invalid`;
    const adminPassword = `Bootstrap-${randomUUID()}!`;
    const bootstrapEnv = { ...childEnv, ADMIN_BOOTSTRAP_EXPECTED_DATABASE: dbName,
      ADMIN_BOOTSTRAP_EMAIL: adminEmail, ADMIN_BOOTSTRAP_PASSWORD: adminPassword };
    command("First admin dry run", ["scripts/bootstrap-first-super-admin.cjs"], bootstrapEnv);
    command("First admin bootstrap", ["scripts/bootstrap-first-super-admin.cjs", "--apply"],
      { ...bootstrapEnv, ADMIN_BOOTSTRAP_ALLOW_WRITE: "YES" });
    const repeatBootstrap = spawnSync(process.execPath, ["scripts/bootstrap-first-super-admin.cjs", "--apply"],
      { cwd: root, env: { ...bootstrapEnv, ADMIN_BOOTSTRAP_ALLOW_WRITE: "YES" }, encoding: "utf8", timeout: 15_000 });
    assert.notEqual(repeatBootstrap.status, 0, "First admin bootstrap must be single use");
    await database.connect();
    const identity = (await database.query(`SELECT current_database() AS database, current_schema() AS schema,
      inet_server_addr()::text AS address, inet_server_port() AS port`)).rows[0];
    assert.equal(identity.database, dbName);
    assert.equal(identity.schema, "public");
    assert.equal(identity.address, "127.0.0.1/32");
    assert.equal(identity.port, 5432);
    const fresh = (await database.query(`SELECT
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations,
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Company") AS companies,
      (SELECT count(*)::int FROM "Ward") AS wards`)).rows[0];
    assert.deepEqual(fresh, { migrations: 12, users: 1, companies: 0, wards: 0 });
    const provinces = require("../prisma/seed-data/vietnam-administrative-2026-10-16.json");
    assert.equal(provinces.version, "vn-admin-2026-10-16");
    assert.equal(provinces.provinces.length, 34);
    assert.equal(new Set(provinces.provinces.map((row) => row.code)).size, 34);
    await database.query("BEGIN");
    try {
      for (const province of provinces.provinces) {
        await database.query(`INSERT INTO "Province" (id,code,name,"divisionType","isActive","createdAt","updatedAt")
          VALUES (gen_random_uuid(),$1,$2,$3,true,now(),now())`,
        [province.code, province.name, province.divisionType]);
      }
      await database.query("COMMIT");
    } catch (error) { await database.query("ROLLBACK"); throw error; }
    port = await freePort();
    const base = `http://127.0.0.1:${port}/api/v1`;
    apiProcess = spawn(process.execPath, ["dist/main.js"], {
      cwd: root, env: { ...childEnv, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    // Drain startup logs; they may contain configuration details and are never printed.
    const capture = (chunk) => {
      apiDiagnostic = (apiDiagnostic + String(chunk)).slice(-1600)
        .replace(/(?:postgresql|postgres):\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
        .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
    };
    apiProcess.stdout.on("data", capture);
    apiProcess.stderr.on("data", capture);
    await waitForApi(base);
    const registration = async (type, label) => {
      const fixturePassword = `Test-${randomUUID()}!`;
      const result = await call(base, "POST", "/auth/register/v2", null,
        { email: `release-${marker}-${label}@example.invalid`, password: fixturePassword, accountType: type }, 201);
      return { ...result, fixturePassword };
    };
    const owner = await registration("EMPLOYER", "owner");
    const outsider = await registration("EMPLOYER", "outsider");
    const candidate = await registration("CANDIDATE", "candidate");
    const otherCandidate = await registration("CANDIDATE", "other-candidate");
    assert.equal(owner.user.accountType, "EMPLOYER");
    assert.equal(candidate.user.accountType, "CANDIDATE");
    const ownerToken = owner.accessToken;
    const outsiderToken = outsider.accessToken;
    const candidateToken = candidate.accessToken;
    const otherCandidateToken = otherCandidate.accessToken;
    await call(base, "POST", "/auth/password-reset/request", null,
      { email: candidate.user.email }, 503, "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE");
    await call(base, "POST", "/auth/password-reset/request", null,
      { email: `unknown-${marker}@example.invalid` }, 503, "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE");
    await call(base, "POST", "/auth/password-reset/confirm", null,
      { token: "A".repeat(43), password: "Disposable-Reset-123!" }, 401, "AUTH_PASSWORD_RESET_TOKEN_INVALID");
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "PasswordResetToken"')).rows[0].count, 0);
    const admin = await call(base, "POST", "/auth/login", null,
      { email: adminEmail, password: adminPassword }, 200);
    const adminToken = admin.accessToken;
    assert.equal(admin.user.accountType, "LEGACY_UNCLASSIFIED");
    assert.equal((await database.query('SELECT "accountType" FROM "User" WHERE id=$1', [admin.user.id])).rows[0].accountType, null);
    await call(base, "GET", "/admin/dashboard", null, null, 401);
    await call(base, "GET", "/admin/dashboard", ownerToken, null, 403);
    await call(base, "GET", "/admin/dashboard", candidateToken, null, 403);
    const initialAdmin = await call(base, "GET", "/admin/dashboard", adminToken, null, 200);
    assert.equal(initialAdmin.users, 5);
    const company = await call(base, "POST", "/companies", ownerToken,
      { name: `FINDWORK Release E2E ${marker}`, slug: `release-e2e-${marker}` }, 201);
    const otherCompany = await call(base, "POST", "/companies", outsiderToken,
      { name: `FINDWORK Other E2E ${marker}`, slug: `release-other-${marker}` }, 201);
    const workspace = await call(base, "GET", "/companies/me", ownerToken, null, 200);
    assert.ok(workspace.data.some((row) => row.id === company.id && row.memberRoleNames.includes("OWNER")));
    await call(base, "GET", `/companies/${company.id}/jobs`, null, null, 401);
    await call(base, "GET", `/companies/${company.id}/jobs`, candidateToken, null, 403);
    await call(base, "GET", `/companies/${company.id}/jobs`, outsiderToken, null, 403);
    const contact = { fullName: "Disposable Candidate", email: `release-${marker}-candidate@example.invalid`, phone: "+84901234567" };
    await call(base, "POST", "/candidate/profile", candidateToken, { fullName: contact.fullName }, 201);
    await call(base, "POST", "/candidate/profile", otherCandidateToken, { fullName: "Other Disposable Candidate" }, 201);
    const resume = await call(base, "POST", "/candidate/resumes", candidateToken,
      { name: "Disposable builder CV", builderContent: { summary: "Consent based test CV" } }, 201);
    const otherResume = await call(base, "POST", "/candidate/resumes", otherCandidateToken,
      { name: "Other builder CV", builderContent: { summary: "Private other CV" } }, 201);
    assert.equal(resume.status, "READY");
    const versionId = resume.versions[0].id;
    await call(base, "GET", `/candidate/resumes/${resume.id}`, ownerToken, null, 403);
    await call(base, "GET", `/candidate/resumes/${resume.id}`, otherCandidateToken, null, 404);
    await call(base, "GET", `/candidate/resumes/${otherResume.id}`, candidateToken, null, 404);
    const categories = await call(base, "GET", "/reference/job-categories?pageSize=100", null, null, 200);
    const categoryId = categories.data.find((row) => row.code === "software-development")?.id;
    assert.ok(categoryId);
    const mainDraft = await postJob(base, company.id, ownerToken, categoryId,
      `[DEMO FINDWORK] Kỹ sư Backend ${marker}`, 18_000_000, "01");
    await call(base, "GET", `/jobs/${mainDraft.id}`, null, null, 404);
    await call(base, "PATCH", `/companies/${company.id}/jobs/${mainDraft.id}`, outsiderToken,
      { version: mainDraft.version, title: "Stolen title" }, 403);
    const edited = await call(base, "PATCH", `/companies/${company.id}/jobs/${mainDraft.id}`, ownerToken,
      { version: mainDraft.version, description: "Bài đăng mẫu FINDWORK; không phải tin tuyển dụng thực tế. Nội dung mô tả đã chỉnh sửa trước khi phát hành." }, 200);
    await call(base, "PATCH", `/companies/${company.id}/jobs/${mainDraft.id}`, ownerToken,
      { version: mainDraft.version, title: "Stale title" }, 409, "JOB_VERSION_CONFLICT");
    const mainJob = await publish(base, company.id, ownerToken, edited);
    await call(base, "POST", `/companies/${company.id}/jobs/${mainDraft.id}/publish`, ownerToken,
      { version: edited.version }, 409, "JOB_VERSION_CONFLICT");
    const publicMain = await call(base, "GET", `/jobs/${mainJob.id}`, null, null, 200);
    assert.equal(publicMain.locations[0].province.code, "01");
    assert.ok(Object.hasOwn(publicMain.company, "logoUrl"));
    const jobs = [];
    for (const [index, salary, province] of [[1, 10_000_000, "01"], [2, 25_000_000, "01"], [3, 40_000_000, "79"]]) {
      const draft = await postJob(base, company.id, ownerToken, categoryId,
        `[DEMO FINDWORK] Salary ${index} ${marker}`, salary, province);
      jobs.push(await publish(base, company.id, ownerToken, draft));
    }
    const list = async (params) => call(base, "GET", `/jobs?${new URLSearchParams(params)}`, null, null, 200);
    const newest = await list({ pageSize: "100", sort: "newest" });
    assert.equal(newest.pagination.total, 4);
    assert.equal(newest.pagination.totalPages, 1);
    assert.deepEqual(new Set(newest.data.map((row) => row.id)), new Set([mainJob.id, ...jobs.map((row) => row.id)]));
    for (let index = 1; index < newest.data.length; index++) {
      const previous = newest.data[index - 1], current = newest.data[index];
      assert.ok(previous.publishedAt > current.publishedAt ||
        (previous.publishedAt === current.publishedAt && previous.id > current.id));
    }
    const first = await list({ page: "1", pageSize: "1" });
    const middle = await list({ page: "2", pageSize: "1" });
    const last = await list({ page: "4", pageSize: "1" });
    const beyond = await list({ page: "5", pageSize: "1" });
    assert.deepEqual([first.data.length, middle.data.length, last.data.length, beyond.data.length], [1, 1, 1, 0]);
    assert.ok([first, middle, last, beyond].every((page) =>
      page.pagination.total === 4 && page.pagination.totalPages === 4));
    assert.notEqual(first.data[0].id, middle.data[0].id);
    assert.notEqual(middle.data[0].id, last.data[0].id);
    const asc = await list({ sort: "salary_asc", pageSize: "100" });
    const desc = await list({ sort: "salary_desc", pageSize: "100" });
    assert.deepEqual(asc.data.map((row) => Number(row.salaryMin)), [10_000_000, 18_000_000, 25_000_000, 40_000_000]);
    assert.deepEqual(desc.data.map((row) => Number(row.salaryMin)), [40_000_000, 25_000_000, 18_000_000, 10_000_000]);
    const province = await list({ provinceCode: "01" });
    assert.equal(province.pagination.total, 3);
    assert.ok(province.data.every((row) => row.locations.some((location) => location.province?.code === "01")));
    const minimum = await list({ salaryAtLeast: "15000000" });
    const maximum = await list({ salaryAtMost: "30000000" });
    assert.equal(minimum.pagination.total, 4);
    assert.equal(maximum.pagination.total, 3);
    const combinedFirst = await list({ provinceCode: "01", salaryAtLeast: "25000000", pageSize: "1", page: "1" });
    const combinedLast = await list({ provinceCode: "01", salaryAtLeast: "25000000", pageSize: "1", page: "2" });
    assert.equal(combinedFirst.pagination.total, 2);
    assert.equal(combinedFirst.pagination.totalPages, 2);
    assert.equal(combinedLast.pagination.total, 2);
    assert.notEqual(combinedFirst.data[0].id, combinedLast.data[0].id);
    assert.ok((await list({ q: "Kỹ sư Backend" })).data.some((row) => row.id === mainJob.id));
    assert.ok((await list({ q: "mô tả đã chỉnh sửa" })).data.some((row) => row.id === mainJob.id));
    assert.equal((await list({ q: company.name })).pagination.total, 4);
    assert.equal((await list({ categoryCode: "software-development", employmentType: "FULL_TIME", workplaceType: "HYBRID" })).pagination.total, 4);
    for (const params of [{ page: "0" }, { pageSize: "101" }, { provinceCode: "ZZ" },
      { sort: "relevant" }, { salaryAtLeast: "500", salaryAtMost: "100" }]) {
      const response = await fetch(`${base}/jobs?${new URLSearchParams(params)}`);
      assert.equal(response.status, 400, JSON.stringify(params));
    }
    const saved = await call(base, "POST", "/candidate/saved-jobs", candidateToken, { jobId: mainJob.id }, 201);
    assert.equal(saved.jobId, mainJob.id);
    assert.equal((await call(base, "GET", `/candidate/saved-jobs/${mainJob.id}/status`, candidateToken, null, 200)).saved, true);
    await call(base, "POST", `/candidate/saved-jobs`, ownerToken, { jobId: mainJob.id }, 403);
    const details = { contact, availability: "immediately", preferredContactMethod: "email" };
    const application = await call(base, "POST", `/jobs/${mainJob.id}/applications`, candidateToken,
      { resumeId: resume.id, resumeVersionId: versionId, details, answers: [] }, 201);
    assert.equal(application.status, "SUBMITTED");
    assert.equal(application.resumeVersionId, versionId);
    await call(base, "POST", `/jobs/${mainJob.id}/applications`, otherCandidateToken,
      { resumeId: resume.id, resumeVersionId: versionId, details, answers: [] }, 400, "RESUME_UNAVAILABLE");
    await call(base, "POST", `/jobs/${mainJob.id}/applications`, candidateToken,
      { resumeId: resume.id, resumeVersionId: versionId, details, answers: [] }, 409, "APPLICATION_DUPLICATE");
    const employerList = await call(base, "GET", `/companies/${company.id}/jobs/${mainJob.id}/applications`, ownerToken, null, 200);
    assert.ok(employerList.data.some((row) => row.id === application.id));
    const employerDetail = await call(base, "GET", `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}`,
      ownerToken, null, 200);
    assert.equal(employerDetail.resumeVersion.id, versionId);
    await call(base, "GET", `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}`,
      outsiderToken, null, 403);
    await call(base, "GET", `/candidate/applications/${application.id}`, otherCandidateToken, null, 404);
    await call(base, "PATCH", `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}/status`,
      ownerToken, { version: application.version, status: "OFFERED" }, 409, "APPLICATION_STATE_CONFLICT");
    const reviewed = await call(base, "PATCH", `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}/status`,
      ownerToken, { version: application.version, status: "REVIEWING", note: "Disposable internal review" }, 200);
    assert.equal(reviewed.status, "REVIEWING");
    await call(base, "PATCH", `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}/status`,
      ownerToken, { version: application.version, status: "SHORTLISTED" }, 409, "APPLICATION_VERSION_CONFLICT");
    const freshCandidate = await call(base, "GET", `/candidate/applications/${application.id}`, candidateToken, null, 200);
    assert.equal(freshCandidate.status, "REVIEWING");
    assert.ok(!JSON.stringify(freshCandidate).includes("Disposable internal review"));
    const companyConversation = `/companies/${company.id}/conversations/${application.id}`;
    const candidateConversation = `/candidate/conversations/${application.id}`;
    await call(base, "GET", `${companyConversation}/messages`, outsiderToken, null, 403);
    await call(base, "GET", `${candidateConversation}/messages`, otherCandidateToken, null, 404);
    await call(base, "POST", `${candidateConversation}/messages`, adminToken, { body: "Admin impersonation" }, 403);
    const employerMessage = await call(base, "POST", `${companyConversation}/messages`, ownerToken,
      { body: "Can we discuss your application?" }, 201);
    assert.equal(employerMessage.senderRole, "COMPANY");
    const candidateInbox = await call(base, "GET", "/candidate/conversations", candidateToken, null, 200);
    assert.equal(candidateInbox.data.find((row) => row.applicationId === application.id)?.unreadCount, 1);
    const candidateMessages = await call(base, "GET", `${candidateConversation}/messages`, candidateToken, null, 200);
    assert.equal(candidateMessages.data[0].body, employerMessage.body);
    assert.equal(candidateMessages.unreadCount, 1);
    assert.equal((await call(base, "POST", `${candidateConversation}/read`, candidateToken, null, 201)).readCount, 1);
    const candidateMessage = await call(base, "POST", `${candidateConversation}/messages`, candidateToken,
      { body: "Yes, thank you." }, 201);
    assert.equal(candidateMessage.senderRole, "CANDIDATE");
    const employerInbox = await call(base, "GET", `/companies/${company.id}/conversations`, ownerToken, null, 200);
    assert.equal(employerInbox.data.find((row) => row.applicationId === application.id)?.unreadCount, 1);
    const employerMessages = await call(base, "GET", `${companyConversation}/messages`, ownerToken, null, 200);
    assert.deepEqual(employerMessages.data.map((row) => row.body), [employerMessage.body, candidateMessage.body]);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "ApplicationMessage" WHERE "applicationId"=$1',
      [application.id])).rows[0].count, 2);
    const history = (await database.query(`SELECT "fromStatus","toStatus" FROM "ApplicationStatusHistory"
      WHERE "applicationId"=$1 ORDER BY "createdAt",id`, [application.id])).rows;
    assert.deepEqual(history.map((row) => row.toStatus), ["SUBMITTED", "REVIEWING"]);
    const persisted = (await database.query(`SELECT a."resumeVersionId",a.status,j."companyId"
      FROM "Application" a JOIN "Job" j ON j.id=a."jobId" WHERE a.id=$1`, [application.id])).rows[0];
    assert.equal(persisted.resumeVersionId, versionId);
    assert.equal(persisted.status, "REVIEWING");
    assert.equal(persisted.companyId, company.id);
    const paused = await call(base, "POST", `/companies/${company.id}/jobs/${jobs[0].id}/pause`, ownerToken,
      { version: jobs[0].version }, 200);
    await call(base, "GET", `/jobs/${paused.id}`, null, null, 404);
    const closed = await call(base, "POST", `/companies/${company.id}/jobs/${jobs[1].id}/close`, ownerToken,
      { version: jobs[1].version }, 200);
    await call(base, "GET", `/jobs/${closed.id}`, null, null, 404);
    const hiddenDraft = await postJob(base, company.id, ownerToken, categoryId,
      `[DEMO FINDWORK] Hidden draft ${marker}`, 12_000_000, "01");
    await call(base, "GET", `/jobs/${hiddenDraft.id}`, null, null, 404);
    const expiringDraft = await postJob(base, company.id, ownerToken, categoryId,
      `[DEMO FINDWORK] Expiring ${marker}`, 13_000_000, "01",
      { applicationDeadline: new Date(Date.now() + 4000).toISOString() });
    const expiring = await publish(base, company.id, ownerToken, expiringDraft);
    await new Promise((resolve) => setTimeout(resolve, 4200));
    await call(base, "GET", `/jobs/${expiring.id}`, null, null, 404);
    assert.equal((await list({ pageSize: "100" })).pagination.total, 2);
    const adminUsers = await call(base, "GET", "/admin/users?pageSize=100", adminToken, null, 200);
    const adminCompanies = await call(base, "GET", "/admin/companies?pageSize=100", adminToken, null, 200);
    const adminJobs = await call(base, "GET", "/admin/jobs?pageSize=100", adminToken, null, 200);
    const adminAudit = await call(base, "GET", "/admin/audit?pageSize=100", adminToken, null, 200);
    const adminKpi = await call(base, "GET", "/admin/dashboard", adminToken, null, 200);
    assert.equal(adminUsers.pagination.total, adminKpi.users);
    assert.equal(adminCompanies.pagination.total, adminKpi.companies);
    assert.equal(adminJobs.pagination.total, adminKpi.jobs);
    assert.ok(adminAudit.data.some((row) => row.action === "admin.bootstrap.first_super_admin"));
    assert.equal(adminKpi.users, Number((await database.query('SELECT count(*) FROM "User"')).rows[0].count));
    assert.equal(adminKpi.publishedJobs, Number((await database.query('SELECT count(*) FROM "Job" WHERE status=\'PUBLISHED\'')).rows[0].count));
    await call(base, "POST", `/admin/jobs/${mainJob.id}/close`, ownerToken, null, 403);
    const moderatedJob = await call(base, "POST", `/admin/jobs/${mainJob.id}/close`, adminToken, null, 200);
    assert.equal(moderatedJob.status, "CLOSED");
    // Fixture state is isolated; exercise the real authorization, transition and audit path.
    await database.query(`UPDATE "Company" SET "verificationStatus"='PENDING' WHERE id=$1`, [otherCompany.id]);
    await call(base, "PATCH", `/admin/companies/${otherCompany.id}/verification`, ownerToken,
      { status: "REJECTED", reason: "Disposable evidence is insufficient" }, 403);
    const verification = await call(base, "PATCH", `/admin/companies/${otherCompany.id}/verification`, adminToken,
      { status: "REJECTED", reason: "Disposable evidence is insufficient" }, 200);
    assert.equal(verification.verificationStatus, "REJECTED");
    const suspendedCompany = await call(base, "PATCH", `/admin/companies/${otherCompany.id}/status`, adminToken,
      { status: "SUSPENDED" }, 200);
    assert.equal(suspendedCompany.status, "SUSPENDED");
    const disabledUser = await call(base, "POST", `/admin/users/${otherCandidate.user.id}/disable`, adminToken, null, 200);
    assert.equal(disabledUser.status, "DISABLED");
    await call(base, "GET", `/candidate/applications/${application.id}`, otherCandidateToken, null, 401);
    const finalAdminAudit = await call(base, "GET", "/admin/audit?pageSize=100", adminToken, null, 200);
    for (const action of ["admin.bootstrap.first_super_admin", "admin.job.close", "admin.company.verify", "admin.company.status", "admin.user.status"]) {
      assert.ok(finalAdminAudit.data.some((row) => row.action === action), `Missing audit: ${action}`);
    }
    await registration("EMPLOYER", "rate-fifth");
    await call(base, "POST", "/auth/register/v2", null,
      { email: `release-${marker}-rate-sixth@example.invalid`, password: `Test-${randomUUID()}!`,
        accountType: "EMPLOYER" }, 429, "RATE_LIMITED");
    // Restart the same disposable API with fake, local-only provider configuration.
    // No email worker is launched and no Resend request is made.
    apiProcess.kill();
    await new Promise((resolve) => apiProcess.once("exit", resolve));
    const resetKey = randomBytes(32);
    const resetEnv = { ...childEnv, PORT: String(port), EMAIL_DELIVERY_MODE: "resend",
      EMAIL_WORKER_ENABLED: "false", EMAIL_PASSWORD_RESET_ENABLED: "true",
      EMAIL_ACTIVE_KEY_ID: "acceptance", EMAIL_KEYRING_JSON: JSON.stringify({ acceptance: resetKey.toString("base64") }),
      EMAIL_RESEND_API_KEY: "test-only-no-provider-send-123456", EMAIL_FROM: "no-reply@example.invalid",
      EMAIL_VERIFY_URL: "http://localhost:5177/verify-email",
      EMAIL_RESET_URL: "http://localhost:5177/reset-password",
      EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED: "true",
      EMAIL_APPLICATION_URL: "http://localhost:5177/candidate/applications" };
    apiProcess = spawn(process.execPath, ["dist/main.js"], { cwd: root, env: resetEnv,
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    apiDiagnostic = "";
    apiProcess.stdout.on("data", capture); apiProcess.stderr.on("data", capture);
    await waitForApi(base);
    await call(base, "POST", "/auth/password-reset/request", null,
      { email: `absent-${marker}@example.invalid` }, 204);
    assert.equal((await database.query('SELECT count(*)::int AS count FROM "PasswordResetToken"')).rows[0].count, 0);
    await call(base, "POST", "/auth/password-reset/request", null, { email: candidate.user.email }, 204);
    await call(base, "POST", "/auth/password-reset/request", null, { email: candidate.user.email }, 204);
    const issued = (await database.query(`SELECT t.id, t."tokenHash", o.id AS "outboxId", o."payloadCiphertext",
      o."payloadNonce", o."payloadTag", o.status FROM "PasswordResetToken" t
      JOIN "PasswordResetOutbox" o ON o."tokenId"=t.id WHERE t."userId"=$1`, [candidate.user.id])).rows;
    assert.equal(issued.length, 1, "Reset cooldown must avoid duplicate issuance");
    assert.equal(issued[0].status, "QUEUED");
    const decipher = createDecipheriv("aes-256-gcm", resetKey, issued[0].payloadNonce);
    decipher.setAAD(Buffer.from(JSON.stringify(["findwork-outbox-v1", issued[0].outboxId, "RESET_PASSWORD", issued[0].id])));
    decipher.setAuthTag(issued[0].payloadTag);
    const payload = JSON.parse(Buffer.concat([decipher.update(issued[0].payloadCiphertext), decipher.final()]).toString("utf8"));
    assert.equal(payload.recipient, candidate.user.email.toLowerCase());
    assert.match(payload.rawToken, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(!issued[0].payloadCiphertext.includes(Buffer.from(payload.rawToken)));
    await call(base, "POST", "/auth/password-reset/confirm", null,
      { token: "B".repeat(43), password: "Disposable-Reset-123!" }, 401, "AUTH_PASSWORD_RESET_TOKEN_INVALID");
    const newPassword = `Reset-${randomUUID()}!`;
    await call(base, "POST", "/auth/password-reset/confirm", null,
      { token: payload.rawToken, password: newPassword }, 204);
    await call(base, "POST", "/auth/password-reset/confirm", null,
      { token: payload.rawToken, password: newPassword }, 401, "AUTH_PASSWORD_RESET_TOKEN_INVALID");
    await call(base, "GET", `/candidate/applications/${application.id}`, candidateToken, null, 401);
    await call(base, "POST", "/auth/login", null,
      { email: candidate.user.email, password: candidate.fixturePassword }, 401, "AUTH_INVALID_CREDENTIALS");
    const renewed = await call(base, "POST", "/auth/login", null,
      { email: candidate.user.email, password: newPassword }, 200);
    assert.ok(renewed.accessToken);
    const resetState = (await database.query(`SELECT t."consumedAt", o.status, o."payloadCiphertext"
      FROM "PasswordResetToken" t JOIN "PasswordResetOutbox" o ON o."tokenId"=t.id WHERE t.id=$1`, [issued[0].id])).rows[0];
    assert.ok(resetState.consumedAt && resetState.status === "CANCELLED" && resetState.payloadCiphertext === null);
    assert.equal((await database.query(`SELECT count(*)::int AS count FROM "AuditLog" WHERE action='auth.password_reset'
      AND "actorUserId"=$1`, [candidate.user.id])).rows[0].count, 1);
    await call(base, "POST", "/auth/password-reset/request", null, { email: owner.user.email }, 204);
    const { PrismaService } = require("../dist/infrastructure/prisma/prisma.service.js");
    const { EmailDeliverySettings } = require("../dist/infrastructure/email/email-delivery-settings.service.js");
    const { EmailCryptoService } = require("../dist/infrastructure/email/email-crypto.service.js");
    const { PasswordResetWorker } = require("../dist/infrastructure/email/password-reset.worker.js");
    const workerDb = new PrismaService({ getOrThrow: (name) => resetEnv[name] });
    await workerDb.$connect();
    let delivered;
    try {
      const settings = new EmailDeliverySettings({ get: (name, fallback) => resetEnv[name] ?? fallback });
      const worker = new PasswordResetWorker(workerDb, settings, new EmailCryptoService(settings), {
        sendPasswordReset: async (input) => { delivered = input; return { providerMessageId: "mock-accepted" }; },
      });
      assert.equal(await worker.processOne(), true);
    } finally { await workerDb.$disconnect(); }
    assert.equal(delivered.to, owner.user.email.toLowerCase());
    assert.equal(new URL(delivered.resetUrl).search, "");
    const ownerResetToken = new URLSearchParams(new URL(delivered.resetUrl).hash.slice(1)).get("token");
    assert.match(ownerResetToken, /^[A-Za-z0-9_-]{43}$/);
    const deliveredState = (await database.query(`SELECT o.status, o."payloadCiphertext", o."providerMessageId"
      FROM "PasswordResetOutbox" o JOIN "PasswordResetToken" t ON t.id=o."tokenId"
      WHERE t."userId"=$1`, [owner.user.id])).rows[0];
    assert.equal(deliveredState.status, "SENT");
    assert.equal(deliveredState.payloadCiphertext, null);
    assert.equal(deliveredState.providerMessageId, "mock-accepted");
    const employerNewPassword = `Reset-${randomUUID()}!`;
    await call(base, "POST", "/auth/password-reset/confirm", null,
      { token: ownerResetToken, password: employerNewPassword }, 204);
    await call(base, "GET", `/companies/${company.id}/jobs`, owner.accessToken, null, 401);
    const renewedOwner = await call(base, "POST", "/auth/login", null,
      { email: owner.user.email, password: employerNewPassword }, 200);
    assert.ok(renewedOwner.accessToken);
    await call(base, "POST", "/auth/email-verification/request", renewed.accessToken, null, 204);
    const { EmailOutboxRepository } = require("../dist/infrastructure/email/email-outbox.repository.js");
    const { EmailDeliveryWorker } = require("../dist/infrastructure/email/email-delivery.worker.js");
    const verifyDb = new PrismaService({ getOrThrow: (name) => resetEnv[name] });
    await verifyDb.$connect();
    let verificationDelivery;
    try {
      const workerEnv = { ...resetEnv, EMAIL_WORKER_ENABLED: "true" };
      const settings = new EmailDeliverySettings({ get: (name, fallback) => workerEnv[name] ?? fallback });
      const worker = new EmailDeliveryWorker(new EmailOutboxRepository(verifyDb),
        new EmailCryptoService(settings), {
          sendVerification: async (input) => { verificationDelivery = input; return { providerMessageId: "mock-verify" }; },
        }, settings);
      assert.equal(await worker.processOne(), true);
    } finally { await verifyDb.$disconnect(); }
    assert.equal(verificationDelivery.to, candidate.user.email.toLowerCase());
    assert.equal(new URL(verificationDelivery.verifyUrl).search, "");
    const verifyToken = new URLSearchParams(new URL(verificationDelivery.verifyUrl).hash.slice(1)).get("token");
    assert.match(verifyToken, /^[A-Za-z0-9_-]{43}$/);
    await call(base, "POST", "/auth/email-verification/confirm", null, { token: verifyToken }, 204);
    await call(base, "POST", "/auth/email-verification/confirm", null, { token: verifyToken }, 401,
      "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID");
    const verifiedEmail = (await database.query('SELECT "emailVerifiedAt" FROM "User" WHERE id=$1',
      [candidate.user.id])).rows[0].emailVerifiedAt;
    assert.ok(verifiedEmail);
    const shortlisted = await call(base, "PATCH",
      `/companies/${company.id}/jobs/${mainJob.id}/applications/${application.id}/status`,
      renewedOwner.accessToken, { version: reviewed.version, status: "SHORTLISTED" }, 200);
    assert.equal(shortlisted.status, "SHORTLISTED");
    const scheduled = await call(base, "POST", `/companies/${company.id}/applications/${application.id}/interviews`,
      renewedOwner.accessToken, { scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        durationMinutes: 30, type: "PHONE", provider: "MANUAL" }, 201);
    const queuedNotice = (await database.query(`SELECT id, status, "payloadCiphertext" FROM "RecruitmentEmailOutbox"
      WHERE "interviewId"=$1`, [scheduled.id])).rows[0];
    assert.equal(queuedNotice.status, "QUEUED");
    assert.ok(queuedNotice.payloadCiphertext.length > 0);
    const queuedStatus = (await database.query(`SELECT id, status, "payloadCiphertext" FROM "RecruitmentEmailOutbox"
      WHERE kind='APPLICATION_STATUS' AND "applicationId"=$1`, [application.id])).rows[0];
    assert.equal(queuedStatus.status, "QUEUED");
    assert.ok(queuedStatus.payloadCiphertext.length > 0);
    const { RecruitmentNotificationWorker } = require("../dist/infrastructure/email/recruitment-notification.worker.js");
    const noticeDb = new PrismaService({ getOrThrow: (name) => resetEnv[name] });
    await noticeDb.$connect();
    const noticeDeliveries = [];
    try {
      const settings = new EmailDeliverySettings({ get: (name, fallback) => resetEnv[name] ?? fallback });
      const worker = new RecruitmentNotificationWorker(noticeDb, settings, new EmailCryptoService(settings), {
        sendRecruitmentNotice: async (input) => { noticeDeliveries.push(input); return { providerMessageId: "mock-notice" }; },
      });
      assert.equal(await worker.processOne(), true);
      assert.equal(await worker.processOne(), true);
    } finally { await noticeDb.$disconnect(); }
    assert.deepEqual(noticeDeliveries.map((item) => item.kind).sort(),
      ["APPLICATION_STATUS", "INTERVIEW_INVITATION"]);
    for (const delivery of noticeDeliveries) {
      assert.equal(delivery.to, candidate.user.email.toLowerCase());
      assert.equal(new URL(delivery.url).pathname, `/candidate/applications/${application.id}`);
    }
    const sentNotices = (await database.query(`SELECT status, "payloadCiphertext" FROM "RecruitmentEmailOutbox"
      WHERE id=ANY($1::uuid[])`, [[queuedNotice.id, queuedStatus.id]])).rows;
    assert.equal(sentNotices.length, 2);
    assert.ok(sentNotices.every((row) => row.status === "SENT" && row.payloadCiphertext === null));
    console.log(JSON.stringify({ environment: "DISPOSABLE", database: dbName, port, status: "PASS",
      recruitment: { draftEditPublish: "PASS", guestSearch: "PASS", savedJob: "PASS", resumeVersion: "PASS",
        application: "PASS", duplicateApplication: 409, employerReview: "REVIEWING",
        candidateFreshGet: "REVIEWING", historyRows: history.length,
        guestPrivate: 401, candidateEmployer: 403, employerResume: 403,
        otherCandidateResume: 404, crossCompany: 403, invalidTransition: 409,
        registrationRateLimit: 429 },
      admin: { bootstrap: "PASS", login: "PASS", dashboard: "PASS", users: "PASS", companies: "PASS",
        jobs: "PASS", audit: "PASS", roleIsolation: "PASS", moderation: "PASS" },
      messaging: { candidateEmployer: "PASS", persistedMessages: 2, unread: "PASS", crossCompany: 403,
        otherCandidate: 404, adminImpersonation: 403 },
      passwordReset: { unknownAccount: 204, queuedEncrypted: true, cooldown: "PASS",
        confirm: 204, replay: 401, oldSession: 401, oldPassword: 401, newLogin: 200,
        audit: "PASS", mockWorker: "SENT", providerDelivery: "NOT_ATTEMPTED" },
      emailVerification: { mockWorker: "SENT", confirm: 204, replay: 401,
        persistedVerifiedAt: true, providerDelivery: "NOT_ATTEMPTED" },
      recruitmentEmail: { statusQueued: true, interviewQueued: true, mockWorker: "SENT",
        providerDelivery: "NOT_ATTEMPTED" },
      search: { positiveProvince: province.pagination.total, salaryAscending: asc.data.map((row) => Number(row.salaryMin)),
        salaryDescending: desc.data.map((row) => Number(row.salaryMin)), combinedTotal: combinedFirst.pagination.total,
        pageTotal: first.pagination.total, invalidQueries: 5,
        draftPausedClosedExpiredHidden: "PASS", repeatableRead: "SOURCE_VERIFIED" } }));
  } finally {
    if (apiProcess) {
      apiProcess.kill();
      await new Promise((resolve) => { if (apiProcess.exitCode !== null) resolve();
        else { apiProcess.once("exit", resolve); setTimeout(resolve, 3000); } });
    }
    await database.end().catch(() => {});
    if (created) {
      assert.match(dbName, /^findwork_release_e2e_[a-f0-9]{12}$/);
      await maintenance.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
      console.log(JSON.stringify({ disposableDatabaseRemoved: dbName }));
      const remaining = (await maintenance.query("SELECT count(*)::int AS count FROM pg_database WHERE datname=$1", [dbName])).rows[0].count;
      assert.equal(remaining, 0, "Disposable database still exists after cleanup");
    }
    await maintenance.end().catch(() => {});
  }
}

main().catch((error) => { console.error(`DISPOSABLE_RECRUITMENT_FAILED ${error.message}`); process.exitCode = 1; });
