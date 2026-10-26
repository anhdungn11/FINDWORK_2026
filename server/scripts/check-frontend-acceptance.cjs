// Read ignored credentials and prove retained acceptance sessions without printing them.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const root = path.resolve(__dirname, "..");
const env = dotenv.parse(readFileSync(path.join(root, ".env.frontend-acceptance.local")));
const accounts = dotenv.parse(readFileSync(path.join(root, ".env.frontend-acceptance.accounts.local")));
const url = new URL(env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    !/^\/findwork_frontend_acceptance_[a-f0-9]{12}$/.test(url.pathname) ||
    url.searchParams.get("schema") !== "public" ||
    env.FINDWORK_EXPECTED_DATABASE !== url.pathname.slice(1)) throw new Error("Unexpected acceptance database target");
const base = "http://127.0.0.1:3003/api/v1";
async function call(method, route, body, token) {
  const response = await fetch(base + route, { method,
    headers: { ...(body && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
async function login(email, password) {
  const result = await call("POST", "/auth/login", { email, password });
  assert.equal(result.status, 200);
  assert.ok(result.body.accessToken);
  return result.body.accessToken;
}
async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    const identity = (await db.query("SELECT current_database() AS name")).rows[0];
    assert.equal(identity.name, env.FINDWORK_EXPECTED_DATABASE);
    const migrations = (await db.query('SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].count;
    assert.equal(migrations, 12);
    const before = (await db.query('SELECT count(*)::int AS count FROM "EmailVerificationToken"')).rows[0].count;
    const candidate = await login(accounts.CANDIDATE_EMAIL, accounts.CANDIDATE_PASSWORD);
    const employer = await login(accounts.EMPLOYER_EMAIL, accounts.EMPLOYER_PASSWORD);
    const admin = await login(accounts.PLATFORM_ADMIN_EMAIL, accounts.PLATFORM_ADMIN_PASSWORD);
    assert.equal((await call("GET", "/admin/dashboard", null, candidate)).status, 403);
    assert.equal((await call("GET", "/admin/dashboard", null, employer)).status, 403);
    const dashboard = await call("GET", "/admin/dashboard", null, admin);
    assert.equal(dashboard.status, 200);
    const userCount = (await db.query('SELECT count(*)::int AS count FROM "User"')).rows[0].count;
    assert.ok(userCount >= 3);
    assert.equal(dashboard.body.users, userCount);
    const employerCompanies = await call("GET", "/companies/me", null, employer);
    assert.equal(employerCompanies.status, 200);
    assert.ok(employerCompanies.body.data.some((item) => item.id === accounts.COMPANY_ID));
    const verification = await call("POST", "/auth/email-verification/request", {}, candidate);
    assert.equal(verification.status, 503, "email verification request status");
    assert.equal(verification.body.code, "AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE");
    const after = (await db.query('SELECT count(*)::int AS count FROM "EmailVerificationToken"')).rows[0].count;
    assert.equal(after, before);
    const reset = await call("POST", "/auth/password-reset/request", { email: accounts.CANDIDATE_EMAIL });
    assert.equal(reset.status, 503, "password reset request status");
    assert.equal(reset.body.code, "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE");
    const conversation = await call("POST", "/ai/conversations", {}, candidate);
    assert.equal(conversation.status, 201);
    assert.equal((await call("GET", `/ai/conversations/${conversation.body.id}/messages`, null, employer)).status, 404);
    const messages = await call("GET", `/ai/conversations/${conversation.body.id}/messages`, null, candidate);
    assert.equal(messages.status, 200);
    assert.deepEqual(messages.body, []);
    assert.equal((await call("DELETE", `/ai/conversations/${conversation.body.id}`, null, candidate)).status, 200);
    console.log(JSON.stringify({ status: "FRONTEND_ACCEPTANCE_PASS", database: identity.name,
      candidateLogin: 200, employerLogin: 200, adminLogin: 200, adminDashboard: 200,
      nonAdminDashboard: 403, companyOwner: true, migrations,
      emailDisabled: 503, passwordResetDisabled: 503, emailTokensCreated: 0,
      aiProviderCall: "NOT_ATTEMPTED", aiCrossAccount: 404, users: userCount }));
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`FRONTEND_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
