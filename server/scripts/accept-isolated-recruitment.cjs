// Authorized E2E write test. Never registers users, logs credentials or deletes business data.
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { readFileSync, realpathSync, statSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const mode = process.argv[2];
if (!["--preflight", "--run"].includes(mode) || process.argv.length !== 3) {
  throw new Error("Usage: node scripts/accept-isolated-recruitment.cjs --preflight|--run");
}
const credentialPath = process.env.FINDWORK_RECRUITMENT_CREDENTIALS_FILE;
if (!credentialPath) throw new Error("Set FINDWORK_RECRUITMENT_CREDENTIALS_FILE to an ignored local JSON path");
const credentials = JSON.parse(readFileSync(credentialPath, "utf8"));
const { employerToken, candidateToken, companyId, resumeId, resumeVersionId, candidateContact } = credentials;
if (![employerToken, candidateToken, companyId, resumeId, resumeVersionId].every((item) => typeof item === "string" && item.length > 10) ||
    !candidateContact || ![candidateContact.fullName, candidateContact.email, candidateContact.phone].every((item) => typeof item === "string" && item.length > 2)) {
  throw new Error("Credential file must contain employerToken, candidateToken, companyId, resumeId, resumeVersionId and candidateContact");
}
const env = dotenv.parse(readFileSync(path.resolve(__dirname, "..", ".env.employer-media.local")));
const url = new URL(env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/findwork_employer_media_3002" ||
    url.searchParams.get("schema") !== "public") throw new Error("Unexpected database target");
const api = process.env.FINDWORK_RECRUITMENT_API_BASE || "http://127.0.0.1:3002/api/v1";
if (!/^http:\/\/127\.0\.0\.1:300[23]\/api\/v1$/.test(api)) throw new Error("Unexpected API target");

async function request(method, route, token, body, expected) {
  const response = await fetch(api + route, { method, headers: {
    ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }),
  }, body: body ? JSON.stringify(body) : undefined });
  const contentType = response.headers.get("content-type") || "";
  const value = contentType.includes("application/json") ? await response.json() : null;
  if (response.status !== expected) throw new Error(`${method} ${route}: expected HTTP ${expected}, received ${response.status} ${value?.code || ""}`);
  return value;
}

function verifyBackup() {
  const file = process.env.FINDWORK_RECRUITMENT_BACKUP_PATH;
  const hash = process.env.FINDWORK_RECRUITMENT_BACKUP_SHA256?.toLowerCase();
  const pgRestore = process.env.FINDWORK_RECRUITMENT_PG_RESTORE;
  if (!file || !hash || !/^[a-f0-9]{64}$/.test(hash) || !pgRestore) throw new Error("Verified recent backup required before run");
  const absolute = realpathSync(file);
  const relative = path.relative(path.resolve(__dirname, "../.."), absolute);
  if (!path.isAbsolute(file) || !absolute.endsWith(".dump") ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error("Backup must be an absolute .dump outside Git worktree");
  }
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size === 0 || Date.now() - stat.mtimeMs > 86_400_000 ||
      createHash("sha256").update(readFileSync(absolute)).digest("hex") !== hash) {
    throw new Error("Backup age, size or checksum invalid");
  }
  const listing = execFileSync(pgRestore, ["--list", absolute], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!/;\s+dbname: findwork_employer_media_3002\s*$/m.test(listing) || !/;\s+Format: CUSTOM\s*$/m.test(listing)) {
    throw new Error("Backup is not a custom-format integration DB dump");
  }
}

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let before;
  try {
    await db.query("BEGIN READ ONLY");
    before = (await db.query(`SELECT current_database() AS database,current_schema() AS schema,
      (SELECT count(*)::int FROM "Job") AS jobs,(SELECT count(*)::int FROM "Application") AS applications`)).rows[0];
    assert.equal(before.database, "findwork_employer_media_3002");
    assert.equal(before.schema, "public");
    await db.query("ROLLBACK");
    const workspace = await request("GET", "/companies/me", employerToken, undefined, 200);
    if (!workspace.data?.some((row) => row.id === companyId && row.memberRoleNames?.includes("OWNER"))) {
      throw new Error("Employer token is not the OWNER of the selected company");
    }
    const resume = await request("GET", `/candidate/resumes/${resumeId}`, candidateToken, undefined, 200);
    if (resume.status !== "READY" || resume.sourceType !== "BUILDER" ||
        !resume.versions?.some((version) => version.id === resumeVersionId)) {
      throw new Error("Candidate does not own the selected ready builder ResumeVersion");
    }
    const categories = await request("GET", "/reference/job-categories?pageSize=100", undefined, undefined, 200);
    const categoryId = categories.data.find((row) => row.code === "software-development")?.id;
    if (!categoryId) throw new Error("Demo software-development category missing");
    await request("GET", `/companies/${companyId}/jobs?pageSize=1`, undefined, undefined, 401);
    await request("GET", `/companies/${companyId}/jobs?pageSize=1`, candidateToken, undefined, 403);
    await request("GET", `/candidate/resumes/${resumeId}`, employerToken, undefined, 403);
    console.log(JSON.stringify({ mode, api, database: before.database, schema: before.schema,
      before: { jobs: before.jobs, applications: before.applications }, owner: "PASS", readyResumeVersion: "PASS",
      anonymousCompanyRead: 401, candidateCompanyRead: 403, employerCandidateResumeRead: 403,
      category: "software-development" }));
    if (mode === "--preflight") return;
    if (process.env.FINDWORK_RECRUITMENT_APPROVED !== "YES") throw new Error("Run requires explicit user approval gate");
    verifyBackup();
    const marker = randomUUID().slice(0, 8);
    const title = `[DEMO FINDWORK] Recruitment E2E ${marker}`;
    const created = await request("POST", `/companies/${companyId}/jobs`, employerToken, {
      categoryId, title, description: "Bài đăng mẫu để kiểm thử FINDWORK; không phải tin tuyển dụng thực tế. Kiểm tra luồng đăng tin, ứng tuyển và duyệt hồ sơ có sự đồng ý của hai tài khoản.",
      employmentType: "FULL_TIME", workplaceType: "HYBRID", location: { provinceCode: "01" },
      salaryMin: "18000000", salaryMax: "28000000", showSalary: true,
    }, 201);
    const edited = await request("PATCH", `/companies/${companyId}/jobs/${created.id}`, employerToken,
      { version: created.version, description: "Bài đăng mẫu để kiểm thử FINDWORK; không phải tin tuyển dụng thực tế. Nội dung draft đã được chỉnh sửa trước khi phát hành." }, 200);
    const published = await request("POST", `/companies/${companyId}/jobs/${created.id}/publish`, employerToken,
      { version: edited.version }, 200);
    assert.equal(published.status, "PUBLISHED");
    const publicJob = await request("GET", `/jobs/${created.id}`, undefined, undefined, 200);
    assert.equal(publicJob.locations[0]?.province?.code, "01");
    const directory = await request("GET", `/jobs?q=${encodeURIComponent(marker)}`, undefined, undefined, 200);
    assert.ok(directory.data.some((row) => row.id === created.id));
    const revised = await request("PATCH", `/companies/${companyId}/jobs/${created.id}`, employerToken,
      { version: published.version, salaryMax: "30000000" }, 200);
    assert.equal(revised.salaryMax, "30000000");
    await request("POST", "/candidate/saved-jobs", candidateToken, { jobId: created.id }, 201);
    const saved = await request("GET", `/candidate/saved-jobs/${created.id}/status`, candidateToken, undefined, 200);
    assert.equal(saved.saved, true);
    await request("DELETE", `/candidate/saved-jobs/${created.id}`, candidateToken, undefined, 204);
    const unsaved = await request("GET", `/candidate/saved-jobs/${created.id}/status`, candidateToken, undefined, 200);
    assert.equal(unsaved.saved, false);
    const applied = await request("POST", `/jobs/${created.id}/applications`, candidateToken, {
      resumeId, resumeVersionId, details: { contact: candidateContact, availability: "immediately", preferredContactMethod: "email" },
      coverLetter: "Bài ứng tuyển thử được chủ tài khoản Candidate chấp thuận.", answers: [],
    }, 201);
    assert.equal(applied.status, "SUBMITTED");
    await request("POST", `/jobs/${created.id}/applications`, candidateToken, {
      resumeId, resumeVersionId, details: { contact: candidateContact, availability: "immediately", preferredContactMethod: "email" },
      answers: [],
    }, 409);
    const employerList = await request("GET", `/companies/${companyId}/jobs/${created.id}/applications`, employerToken, undefined, 200);
    assert.ok(employerList.data.some((row) => row.id === applied.id));
    const employerDetail = await request("GET", `/companies/${companyId}/jobs/${created.id}/applications/${applied.id}`,
      employerToken, undefined, 200);
    assert.equal(employerDetail.resumeVersion.id, resumeVersionId);
    const reviewed = await request("PATCH", `/companies/${companyId}/jobs/${created.id}/applications/${applied.id}/status`,
      employerToken, { version: applied.version, status: "REVIEWING", note: "Authorized release E2E" }, 200);
    assert.equal(reviewed.status, "REVIEWING");
    const candidateRead = await request("GET", `/candidate/applications/${applied.id}`, candidateToken, undefined, 200);
    assert.equal(candidateRead.status, "REVIEWING");
    assert.equal(JSON.stringify(candidateRead).includes("Authorized release E2E"), false);
    const paused = await request("POST", `/companies/${companyId}/jobs/${created.id}/pause`, employerToken,
      { version: revised.version }, 200);
    await request("GET", `/jobs/${created.id}`, undefined, undefined, 404);
    const closed = await request("POST", `/companies/${companyId}/jobs/${created.id}/close`, employerToken,
      { version: paused.version }, 200);
    assert.equal(closed.status, "CLOSED");
    await db.query("BEGIN READ ONLY");
    const rows = (await db.query(`SELECT j.status AS job_status, j."publishedAt" IS NOT NULL AS published,
      a.status AS application_status, a."resumeVersionId"=$3::uuid AS version_matches,
      (SELECT count(*)::int FROM "ApplicationStatusHistory" h WHERE h."applicationId"=a.id) AS history_count,
      (SELECT count(*)::int FROM "Application" duplicate_check WHERE duplicate_check."jobId"=j.id) AS job_application_count
      FROM "Job" j JOIN "Application" a ON a."jobId"=j.id WHERE j.id=$1::uuid AND a.id=$2::uuid`,
      [created.id, applied.id, resumeVersionId])).rows;
    await db.query("ROLLBACK");
    assert.deepEqual(rows[0], { job_status: "CLOSED", published: true, application_status: "REVIEWING",
      version_matches: true, history_count: 2, job_application_count: 1 });
    console.log(JSON.stringify({ status: "PASS", jobId: created.id, applicationId: applied.id,
      publicListed: true, savedAndUnsaved: true, employerReview: 200, candidateFreshRead: 200,
      jobFinalStatus: rows[0].job_status, applicationFinalStatus: rows[0].application_status,
      historyCount: rows[0].history_count, duplicateApplication: 409,
      jobApplicationCount: rows[0].job_application_count }));
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`RECRUITMENT_ACCEPTANCE_BLOCKED ${error.message}`); process.exitCode = 1; });
