// Real HTTP and PostgreSQL acceptance against findwork_employer_media_3002 only.
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const url = dotenv.parse(readFileSync(path.resolve(__dirname, "..", ".env.employer-media.local"))).DATABASE_URL;
const parsed = new URL(url);
if (parsed.protocol !== "postgresql:" || parsed.hostname !== "127.0.0.1" || parsed.port !== "5432" ||
  parsed.pathname !== "/findwork_employer_media_3002" || parsed.searchParams.get("schema") !== "public") {
  throw new Error("Refusing non-isolated database");
}
const base = process.env.FINDWORK_ACCEPT_BASE || "http://127.0.0.1:3002/api/v1";
if (!/^http:\/\/127\.0\.0\.1:30(?:02|03)\/api\/v1$/.test(base)) throw new Error("Refusing non-local API base");
const client = new Client({ connectionString: url });
const suffix = randomUUID().slice(0, 8);
const password = `Acceptance-${randomUUID()}!`;

async function call(method, route, { token, guest, json, form } = {}) {
  const headers = { Origin: "http://127.0.0.1:5177" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (guest) headers["x-findwork-guest-token"] = guest;
  if (json) headers["Content-Type"] = "application/json";
  const response = await fetch(base + route, { method, headers, body: json ? JSON.stringify(json) : form });
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, body, headers: response.headers };
}
function expect(result, status, label, code) {
  if (result.status !== status || (code && result.body.code !== code)) {
    throw new Error(`${label}: expected HTTP ${status}${code ? ` ${code}` : ""}, got ${result.status} ${result.body?.code || ""}`);
  }
  console.log(`${label}: HTTP ${status}${result.body?.code ? ` ${result.body.code}` : ""}`);
  return result.body;
}
async function register(type, label) {
  return expect(await call("POST", "/auth/register/v2", { json: {
    email: `release-${label}-${suffix}@example.invalid`, password, accountType: type,
  } }), 201, `register ${label}`);
}
async function db(query, params = []) { return (await client.query(query, params)).rows; }

async function main() {
  await client.connect();
  try {
    const identity = (await db("SELECT current_database() AS db, current_schema() AS schema"))[0];
    if (identity.db !== "findwork_employer_media_3002" || identity.schema !== "public") throw new Error("PostgreSQL identity mismatch");
    const owner = await register("EMPLOYER", "owner");
    const outsider = await register("EMPLOYER", "outsider");
    const reviewer = await register("EMPLOYER", "reviewer");
    const candidate = await register("CANDIDATE", "candidate");
    const otherCandidate = await register("CANDIDATE", "other-candidate");
    const makeCompany = (token, label) => call("POST", "/companies", { token, json: {
      name: `Release ${label} ${suffix}`, slug: `release-${label}-${suffix}`,
    } });
    const company = expect(await makeCompany(owner.accessToken, "main"), 201, "company A");
    const otherCompany = expect(await makeCompany(outsider.accessToken, "other"), 201, "company B");
    const provincePage = expect(await call("GET", "/reference/provinces?page=1&pageSize=2"), 200, "province page");
    const countries = expect(await call("GET", "/reference/countries?q=Viet%20Nam&pageSize=2"), 200, "country catalog search");
    if (countries.pagination.total < 1 || !countries.data.some((row) => row.code === "VN")) throw new Error("Country catalog mismatch");
    if (provincePage.pagination.total !== 34 || provincePage.data.length !== 2) throw new Error("Province catalog mismatch");
    const hanoi = expect(await call("GET", "/reference/provinces?q=Ha%20Noi&pageSize=2"), 200, "accent-insensitive search");
    if (hanoi.pagination.total !== 1 || hanoi.data[0].code !== "01") throw new Error("Province search mismatch");
    const wardPage = expect(await call("GET", "/reference/wards?provinceCode=01&pageSize=2"), 200, "dependent ward catalog");
    if (wardPage.pagination.total !== 0) throw new Error("Unverified ward rows present");
    const locationBase = `/companies/${company.id}/locations`;
    const structured = expect(await call("POST", locationBase, { token: owner.accessToken,
      json: { countryCode: "VN", provinceId: hanoi.data[0].id, addressLine: "1 Pho Hue, Ha Noi" } }), 201, "structured location");
    if (!structured.isHeadquarters || structured.province.code !== "01") throw new Error("Structured location mismatch");
    const legacy = expect(await call("POST", locationBase, { token: owner.accessToken,
      json: { addressLine: "Legacy free text address, retained" } }), 201, "legacy address");
    if (legacy.addressLine !== "Legacy free text address, retained") throw new Error("Legacy display lost");
    expect(await call("POST", locationBase, { token: outsider.accessToken, json: { addressLine: "Stolen" } }), 403, "cross-company location deny");
    expect(await call("PUT", `${locationBase}/${legacy.id}/headquarters`, { token: owner.accessToken }), 200, "transfer headquarters");
    expect(await call("DELETE", `${locationBase}/${structured.id}`, { token: owner.accessToken }), 200, "delete old headquarters");
    const hq = (await db('SELECT "addressLine", "isHeadquarters" FROM "CompanyLocation" WHERE "companyId"=$1', [company.id]));
    if (hq.length !== 1 || !hq[0].isHeadquarters || hq[0].addressLine !== legacy.addressLine) throw new Error("PostgreSQL headquarters invariant failed");

    expect(await call("POST", `/companies/${company.id}/verification-request`, { token: owner.accessToken }),
      400, "incomplete legal submission", "COMPANY_VERIFICATION_PROFILE_INCOMPLETE");
    expect(await call("PATCH", `/companies/${company.id}/profile`, { token: owner.accessToken,
      json: { legalName: `Release Legal ${suffix}`, taxCode: String(Date.now()).slice(-10) } }), 200, "legal identifiers");
    expect(await call("PATCH", `/companies/${company.id}/legal`, { token: owner.accessToken,
      json: { registeredAddress: "1 Pho Hue, Ha Noi, Viet Nam", representativeName: "Release Representative",
        representativeTitle: "Director", contactEmail: `legal-${suffix}@example.invalid`, contactPhone: "+84901234567" } }),
    200, "legal entity record");
    const evidenceForm = new FormData();
    evidenceForm.append("kind", "BUSINESS_REGISTRATION");
    evidenceForm.append("file", new Blob([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n")],
      { type: "application/pdf" }), "business-registration.pdf");
    const evidence = expect(await call("POST", `/companies/${company.id}/legal/evidence`,
      { token: owner.accessToken, form: evidenceForm }), 201, "evidence upload");
    expect(await call("GET", `/companies/${company.id}/legal/evidence/${evidence.id}`), 401, "anonymous evidence deny");
    expect(await call("GET", `/companies/${company.id}/legal/evidence/${evidence.id}`,
      { token: outsider.accessToken }), 403, "cross-company evidence deny");
    expect(await call("GET", `/admin/companies/${company.id}/legal`, { token: owner.accessToken }), 403, "non-reviewer admin deny");
    const pending = expect(await call("POST", `/companies/${company.id}/verification-request`,
      { token: owner.accessToken }), 200, "submit legal review");
    if (pending.verificationStatus !== "PENDING" || pending.verifiedAt) throw new Error("Company auto-verified");
    expect(await call("PATCH", `/companies/${company.id}/legal`, { token: owner.accessToken,
      json: { registeredAddress: "Changed during review", representativeName: "Other",
        contactEmail: "other@example.invalid", contactPhone: "+84901234567" } }), 409, "pending legal lock");
    const role = (await db('SELECT id FROM "Role" WHERE "systemCode"=$1 AND kind=$2 AND "isActive"=true',
      ["VERIFICATION_ADMIN", "SYSTEM"]))[0];
    if (!role) throw new Error("Verification admin role missing");
    await db('INSERT INTO "SystemUserRole" ("userId", "roleId", "createdAt") VALUES ($1,$2,NOW())', [reviewer.user.id, role.id]);
    const review = expect(await call("GET", `/admin/companies/${company.id}/legal`,
      { token: reviewer.accessToken }), 200, "reviewer legal metadata");
    if (review.legalEvidence.length !== 1 || review.legalEvidence[0].storageKey) throw new Error("Evidence metadata contract mismatch");
    const document = await call("GET", `/admin/companies/${company.id}/legal/evidence/${evidence.id}`,
      { token: reviewer.accessToken });
    expect(document, 200, "reviewer private evidence download");
    if (document.headers.get("cache-control") !== "no-store" || !document.body.toString().startsWith("%PDF-")) {
      throw new Error("Private evidence bytes or headers mismatch");
    }
    const verified = expect(await call("PATCH", `/admin/companies/${company.id}/verification`,
      { token: reviewer.accessToken, json: { status: "VERIFIED" } }), 200, "reviewer approves");
    if (verified.verificationStatus !== "VERIFIED" || !verified.verifiedAt) throw new Error("Verification decision not persisted");
    expect(await call("PATCH", `/admin/companies/${company.id}/verification`,
      { token: reviewer.accessToken, json: { status: "VERIFIED" } }), 409, "repeat decision denied");

    expect(await call("PATCH", `/companies/${otherCompany.id}/profile`, { token: outsider.accessToken,
      json: { legalName: `Rejected Legal ${suffix}`, taxCode: String(Date.now() + 1).slice(-10) } }), 200, "rejection fixture identifiers");
    expect(await call("PATCH", `/companies/${otherCompany.id}/legal`, { token: outsider.accessToken,
      json: { registeredAddress: "2 Pho Hue, Ha Noi, Viet Nam", representativeName: "Rejected Representative",
        contactEmail: `rejected-${suffix}@example.invalid`, contactPhone: "+84901234568" } }), 200, "rejection fixture entity");
    expect(await call("POST", `/companies/${otherCompany.id}/legal/evidence`,
      { token: outsider.accessToken, form: evidenceForm }), 201, "rejection fixture evidence");
    expect(await call("POST", `/companies/${otherCompany.id}/verification-request`,
      { token: outsider.accessToken }), 200, "submit rejection fixture");
    await db('INSERT INTO "SystemUserRole" ("userId", "roleId", "createdAt") VALUES ($1,$2,NOW())', [outsider.user.id, role.id]);
    expect(await call("PATCH", `/admin/companies/${otherCompany.id}/verification`,
      { token: outsider.accessToken, json: { status: "VERIFIED" } }), 403, "self-review deny", "COMPANY_VERIFICATION_SELF_REVIEW_FORBIDDEN");
    const rejected = expect(await call("PATCH", `/admin/companies/${otherCompany.id}/verification`,
      { token: reviewer.accessToken, json: { status: "REJECTED", reason: "Registered address evidence is unclear" } }), 200, "reviewer rejects");
    if (rejected.verificationStatus !== "REJECTED" || !rejected.verificationRejectionReason || rejected.verifiedAt) {
      throw new Error("Rejection reason/state not persisted");
    }
    const resubmitted = expect(await call("POST", `/companies/${otherCompany.id}/verification-request`,
      { token: outsider.accessToken }), 200, "resubmit rejected company");
    if (resubmitted.verificationStatus !== "PENDING" || resubmitted.verificationRejectionReason) throw new Error("Resubmission state mismatch");

    if (process.env.FINDWORK_ACCEPT_SKIP_GUEST !== "1") {
    const guest = expect(await call("POST", "/ai/guest-sessions"), 201, "guest AI session");
    const guest2 = expect(await call("POST", "/ai/guest-sessions"), 201, "second guest AI session");
    const conversation = expect(await call("POST", "/ai/conversations", { guest: guest.token }), 201, "guest conversation");
    expect(await call("GET", `/ai/conversations/${conversation.id}/messages`, { guest: guest2.token }), 404, "guest history isolation");
    expect(await call("GET", `/ai/conversations/${conversation.id}/messages`, { token: owner.accessToken }), 404, "user history isolation");
    expect(await call("POST", `/ai/conversations/${conversation.id}/messages`, { guest: guest.token,
      json: { content: "How do I prepare for a software engineering interview?" } }), 503,
    "unconfigured provider honest error", "AI_PROVIDER_NOT_CONFIGURED");
    const history = expect(await call("GET", `/ai/conversations/${conversation.id}/messages`,
      { guest: guest.token }), 200, "guest history");
    if (history.length !== 0) throw new Error("Fake assistant message stored");
    expect(await call("DELETE", `/ai/conversations/${conversation.id}`, { guest: guest.token }), 200, "guest history deletion");
    }

    const profile = expect(await call("POST", "/candidate/profile", { token: candidate.accessToken,
      json: { fullName: "Release Candidate" } }), 201, "candidate profile");
    const categoryId = randomUUID();
    await db('INSERT INTO "JobCategory" (id,code,name,"isActive","sortOrder","createdAt","updatedAt") VALUES ($1,$2,$3,true,0,NOW(),NOW())',
      [categoryId, `release-${suffix}`, "Release acceptance category"]);
    const job = expect(await call("POST", `/companies/${company.id}/jobs`, { token: owner.accessToken,
      json: { categoryId, title: "Release interview role", description: "A test role for interview scheduling acceptance.",
        employmentType: "FULL_TIME", workplaceType: "REMOTE" } }), 201, "job creation flow");
    const published = expect(await call("POST", `/companies/${company.id}/jobs/${job.id}/publish`,
      { token: owner.accessToken, json: { version: job.version } }), 200, "job publish flow");
    if (published.status !== "PUBLISHED") throw new Error("Job was not published");
    const resumeId = randomUUID(), versionId = randomUUID(), applicationId = randomUUID();
    await db('INSERT INTO "Resume" (id,"candidateProfileId",name,"sourceType",status,"isDefault","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW())',
      [resumeId, profile.id, "Release CV", "BUILDER", "READY"]);
    await db('INSERT INTO "ResumeVersion" (id,"resumeId","versionNumber","builderContent","createdAt") VALUES ($1,$2,1,$3::jsonb,NOW())',
      [versionId, resumeId, JSON.stringify({ summary: "Acceptance CV" })]);
    await db('INSERT INTO "Application" (id,"candidateProfileId","companyId","jobId","resumeId","resumeVersionId",status,version,"fullNameSnapshot","emailSnapshot","phoneSnapshot",availability,"preferredContactMethod","jobSnapshot","submittedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10,$11,$12,$13::jsonb,NOW(),NOW(),NOW())',
      [applicationId, profile.id, company.id, job.id, resumeId, versionId, "SUBMITTED", "Release Candidate",
        candidate.user.email, "+84901234567", "IMMEDIATELY", "EMAIL", JSON.stringify({ title: job.title })]);
    const interviewsPath = `/companies/${company.id}/applications/${applicationId}/interviews`;
    const time = new Date(Date.now() + 86_400_000).toISOString();
    expect(await call("POST", interviewsPath, { token: outsider.accessToken,
      json: { scheduledAt: time, durationMinutes: 30, type: "ONSITE", location: "Office" } }), 403, "cross-company interview deny");
    expect(await call("POST", interviewsPath, { token: owner.accessToken,
      json: { scheduledAt: time, durationMinutes: 30, type: "VIDEO", provider: "ZOOM" } }),
    503, "Zoom configuration blocker", "INTERVIEW_ZOOM_NOT_CONFIGURED");
    expect(await call("POST", interviewsPath, { token: owner.accessToken,
      json: { scheduledAt: time, durationMinutes: 30, type: "ONSITE" } }), 400, "onsite location validation");
    const interview = expect(await call("POST", interviewsPath, { token: owner.accessToken,
      json: { scheduledAt: time, durationMinutes: 30, type: "ONSITE", location: "1 Pho Hue" } }), 201, "interview scheduled");
    if (interview.session.provider !== "MANUAL" || interview.session.joinUrl !== null) throw new Error("Invented meeting link");
    const candidatePath = `/candidate/applications/${applicationId}/interviews`;
    const candidateList = expect(await call("GET", candidatePath, { token: candidate.accessToken }), 200, "candidate interview access");
    if (candidateList.length !== 1 || candidateList[0].id !== interview.id) throw new Error("Candidate interview mismatch");
    expect(await call("GET", candidatePath, { token: otherCandidate.accessToken }), 404, "other candidate isolation");
    const nextTime = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const rescheduled = expect(await call("PATCH", `/companies/${company.id}/interviews/${interview.id}/reschedule`,
      { token: owner.accessToken, json: { scheduledAt: nextTime } }), 200, "interview reschedule");
    if (rescheduled.status !== "RESCHEDULED") throw new Error("Reschedule state mismatch");
    expect(await call("PATCH", `/companies/${company.id}/interviews/${interview.id}/cancel`,
      { token: owner.accessToken }), 200, "interview cancellation");
    expect(await call("PATCH", `/companies/${company.id}/interviews/${interview.id}/cancel`,
      { token: owner.accessToken }), 409, "repeat cancellation denied");
    const persisted = (await db('SELECT i.status, s.provider, s."joinUrl", c."verificationStatus" FROM "Interview" i JOIN "InterviewSession" s ON s."interviewId"=i.id JOIN "Company" c ON c.id=i."companyId" WHERE i.id=$1', [interview.id]))[0];
    if (persisted.status !== "CANCELLED" || persisted.provider !== "MANUAL" || persisted.joinUrl !== null ||
      persisted.verificationStatus !== "VERIFIED") throw new Error("PostgreSQL persisted state mismatch");
    const audits = (await db('SELECT COUNT(*)::int AS count FROM "AuditLog" WHERE "companyId"=$1 AND action IN ($2,$3,$4)',
      [company.id, "company.interview.schedule", "company.interview.reschedule", "company.interview.cancel"]))[0].count;
    if (audits !== 3) throw new Error("Interview audit records missing");
    console.log(`RELEASE_ACCEPTANCE_PASS database=${identity.db} company=${company.id} application=${applicationId} interview=${interview.id} interviewAudits=${audits}`);
  } finally { await client.end(); }
}
main().catch((error) => { console.error(`RELEASE_ACCEPTANCE_FAIL ${error.message}`); process.exitCode = 1; });
