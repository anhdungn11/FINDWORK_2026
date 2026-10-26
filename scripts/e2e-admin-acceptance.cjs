const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("../server/node_modules/dotenv");
const accounts = dotenv.parse(readFileSync(path.resolve(__dirname, "../server/.env.frontend-acceptance.accounts.local")));
const FRONTEND_URL = "http://127.0.0.1:5178";
const BACKEND_URL = "http://127.0.0.1:3003/api/v1";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPBrowser {
  constructor(port = 9235) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.reqId = 1;
  }

  async start() {
    const tempDir = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', `chrome-cdp-acc-${Date.now()}`);
    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tempDir}`,
      '--no-first-run',
      '--disable-extensions',
      'about:blank'
    ]);

    let versionRes;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (this.chrome.exitCode !== null) throw new Error(`Chrome exited with code ${this.chrome.exitCode}`);
      try {
        versionRes = await fetch(`http://127.0.0.1:${this.port}/json/version`);
        if (versionRes.ok) break;
      } catch { /* Chrome is starting. */ }
      await sleep(500);
    }
    if (!versionRes?.ok) throw new Error("Chrome debugging endpoint did not start");
    const version = await versionRes.json();
    this.ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  async stop() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
    if (this.chrome) {
      try { this.chrome.kill(); } catch (_) {}
    }
  }

  send(method, params = {}, sessionId = null) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          this.ws.removeEventListener('message', handler);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      };
      this.ws.addEventListener('message', handler);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  async createPage() {
    const target = await this.send('Target.createTarget', { url: 'about:blank' });
    const attach = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sessionId = attach.sessionId;

    await this.send('Page.enable', {}, sessionId);
    await this.send('Runtime.enable', {}, sessionId);
    await this.send('Network.enable', {}, sessionId);

    return new CDPPage(this, sessionId, target.targetId);
  }
}

class CDPPage {
  constructor(browser, sessionId, targetId) {
    this.browser = browser;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.networkResponses = [];
    this.browser.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.sessionId === this.sessionId && message.method === 'Network.responseReceived') {
        this.networkResponses.push({
          url: message.params.response.url,
          status: message.params.response.status,
          requestId: message.params.requestId
        });
      }
    });
  }

  send(method, params = {}) {
    return this.browser.send(method, params, this.sessionId);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await sleep(2000);
  }

  async reload() {
    await this.send('Page.reload');
    await sleep(2000);
  }

  async evaluate(fnOrExpr) {
    const expr = typeof fnOrExpr === 'function' ? `(${fnOrExpr.toString()})()` : fnOrExpr;
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation error: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async typeInput(selector, text) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
          el.focus();
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, ${JSON.stringify(text)});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(250);
  }

  async loginViaUI(email, password) {
    await this.goto(`${FRONTEND_URL}/login`);
    await sleep(1500);

    await this.evaluate(`
      (() => {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        if (emailInput && passInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(emailInput, ${JSON.stringify(email)});
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));

          setter.call(passInput, ${JSON.stringify(password)});
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.dispatchEvent(new Event('change', { bubbles: true }));

          const btn = document.querySelector('button[type="submit"]');
          if (btn) btn.click();
        }
      })()
    `);
    await sleep(2500);
  }

  async logoutViaUI() {
    await this.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ÄÄƒng xuáº¥t'));
        if (btn) btn.click();
      })()
    `);
    await sleep(1500);
  }
}

const { randomUUID } = require("node:crypto");
const expectedDatabase = "findwork_frontend_acceptance_cc7531c3be19";

async function api(method, route, token, body, cookie) {
  const response = await fetch(`${BACKEND_URL}${route}`, {
    method,
    headers: {
      ...(body && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(cookie && { Cookie: cookie }),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

async function loginApi(email, password) {
  const result = await api("POST", "/auth/login", null, { email, password });
  assert.equal(result.status, 200);
  assert.ok(result.data.accessToken);
  return result;
}

function pageApiStatus(page, route) {
  return page.networkResponses.filter(({ url }) => url.includes(`/api/v1${route}`)).at(-1)?.status;
}

async function waitFor(page, predicate, label) {
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(predicate)) return;
    await sleep(250);
  }
  throw new Error(`Timed out: ${label}`);
}

async function waitForApi(page, route, status) {
  for (let i = 0; i < 30; i++) {
    if (pageApiStatus(page, route) === status) return;
    await sleep(250);
  }
  throw new Error(`Timed out: ${route} HTTP ${status}`);
}

async function clickRowButton(page, marker, label) {
  const clicked = await page.evaluate(`(() => {
    const row = Array.from(document.querySelectorAll('#workspace-main tr'))
      .find(r => r.textContent.includes(${JSON.stringify(marker)}));
    const button = row && Array.from(row.querySelectorAll('button'))
      .find(b => b.textContent.includes(${JSON.stringify(label)}) && !b.disabled);
    if (!button) return false;
    button.click(); return true;
  })()`);
  assert.equal(clicked, true, `control ${label} for synthetic ${marker}`);
}

async function run() {
  const env = dotenv.parse(readFileSync(path.resolve(__dirname, "../server/.env.frontend-acceptance.local")));
  const db = new URL(env.DATABASE_URL);
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "5432");
  assert.equal(db.pathname, `/${expectedDatabase}`);
  assert.equal(env.FINDWORK_EXPECTED_DATABASE, expectedDatabase);
  const health = await api("GET", "/health");
  assert.equal(health.status, 200);

  const admin = await loginApi(accounts.PLATFORM_ADMIN_EMAIL, accounts.PLATFORM_ADMIN_PASSWORD);
  const candidate = await loginApi(accounts.CANDIDATE_EMAIL, accounts.CANDIDATE_PASSWORD);
  const employer = await loginApi(accounts.EMPLOYER_EMAIL, accounts.EMPLOYER_PASSWORD);
  assert.equal(admin.data.user.role, "SUPER_ADMIN");
  assert.equal(candidate.data.user.role, undefined);
  assert.equal(employer.data.user.role, undefined);
  const adminToken = admin.data.accessToken;
  const me = await api("GET", "/auth/me", adminToken);
  const dashboard = await api("GET", "/admin/dashboard", adminToken);
  assert.equal(me.status, 200);
  assert.equal(me.data.role, "SUPER_ADMIN");
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.data.users >= 3);
  for (const ordinary of [candidate, employer]) {
    assert.equal((await api("GET", "/auth/me", ordinary.data.accessToken)).status, 200);
    for (const route of ["/admin/dashboard", "/admin/users", "/admin/companies", "/admin/jobs", "/admin/audit"]) {
      assert.equal((await api("GET", route, ordinary.data.accessToken)).status, 403);
    }
  }
  console.log(JSON.stringify({ phase: "api_roles", database: expectedDatabase,
    adminLoginRole: admin.data.user.role, adminMeRole: me.data.role,
    adminDashboardStatus: dashboard.status, candidateAndEmployerAdminStatus: 403 }));

  const readOnly = process.env.FINDWORK_ADMIN_READ_ONLY === "1";
  let syntheticUserEmail, syntheticUserId, companyName, companyId, jobTitle, draftId;
  if (!readOnly) {
  if (process.env.FINDWORK_ADMIN_REUSE_SYNTHETIC === "1") {
    const users = await api("GET", "/admin/users?pageSize=100&q=cp11a-user", adminToken);
    const companies = await api("GET", "/admin/companies?pageSize=100", adminToken);
    const jobs = await api("GET", "/admin/jobs?pageSize=100", adminToken);
    assert.equal(users.status, 200);
    assert.equal(companies.status, 200);
    assert.equal(jobs.status, 200);
    const user = users.data.data.find((row) => row.email.startsWith("cp11a-user-") && row.status === "ACTIVE");
    const company = companies.data.data.find((row) => row.slug?.startsWith("cp11a-synthetic-") &&
      row.status === "ACTIVE" && row.verificationStatus === "UNVERIFIED" &&
      jobs.data.data.some((job) => job.companyId === row.id && job.status === "PUBLISHED"));
    const job = jobs.data.data.find((row) => row.companyId === company?.id && row.status === "PUBLISHED");
    assert.ok(user && company && job, "reusable synthetic records missing");
    syntheticUserEmail = user.email; syntheticUserId = user.id;
    companyName = company.name; companyId = company.id;
    jobTitle = job.title; draftId = job.id;
  } else {
    const tag = randomUUID().slice(0, 8);
    syntheticUserEmail = `cp11a-user-${tag}@example.invalid`;
    const syntheticEmployerEmail = `cp11a-employer-${tag}@example.invalid`;
    const syntheticPassword = `Cp11a-${randomUUID()}!`;
    const syntheticUser = await api("POST", "/auth/register/v2", null,
      { email: syntheticUserEmail, password: syntheticPassword, accountType: "CANDIDATE" });
    const syntheticEmployer = await api("POST", "/auth/register/v2", null,
      { email: syntheticEmployerEmail, password: syntheticPassword, accountType: "EMPLOYER" });
    assert.equal(syntheticUser.status, 201);
    assert.equal(syntheticEmployer.status, 201);
    syntheticUserId = syntheticUser.data.user.id;
    companyName = `CP11A Synthetic ${tag}`;
    const company = await api("POST", "/companies", syntheticEmployer.data.accessToken,
      { name: companyName, slug: `cp11a-synthetic-${tag}` });
    assert.equal(company.status, 201);
    companyId = company.data.id;
    const categories = await api("GET", "/reference/job-categories?pageSize=100");
    assert.equal(categories.status, 200);
    const categoryId = categories.data.data.find((row) => row.code === "software-development")?.id;
    assert.ok(categoryId);
    jobTitle = `CP11A Synthetic Job ${tag}`;
    const draft = await api("POST", `/companies/${companyId}/jobs`, syntheticEmployer.data.accessToken, {
      categoryId, title: jobTitle,
      description: "Isolated synthetic job for CP11A admin moderation acceptance only.",
      employmentType: "FULL_TIME", workplaceType: "HYBRID", location: { provinceCode: "01" },
      salaryMin: "18000000", salaryMax: "28000000", currency: "VND", salaryPeriod: "MONTH", showSalary: true,
    });
    assert.equal(draft.status, 201);
    draftId = draft.data.id;
    const published = await api("POST", `/companies/${companyId}/jobs/${draftId}/publish`,
      syntheticEmployer.data.accessToken, { version: draft.data.version });
    assert.equal(published.status, 200);
  }
  assert.equal((await api("PATCH", `/admin/users/${syntheticUserId}/status`,
    candidate.data.accessToken, { status: "SUSPENDED" })).status, 403);
  assert.equal((await api("PATCH", `/admin/companies/${companyId}/status`,
    employer.data.accessToken, { status: "SUSPENDED" })).status, 403);
  assert.equal((await api("POST", `/admin/jobs/${draftId}/close`, candidate.data.accessToken)).status, 403);
  }
  const dashboardAfterSetup = readOnly ? dashboard : await api("GET", "/admin/dashboard", adminToken);
  assert.equal(dashboardAfterSetup.status, 200);

  const browser = new CDPBrowser(9236);
  await browser.start();
  try {
    const page = await browser.createPage();
    await page.setViewport(1440, 900);
    await page.loginViaUI(accounts.PLATFORM_ADMIN_EMAIL, accounts.PLATFORM_ADMIN_PASSWORD);
    await waitFor(page, "location.pathname === '/admin'", "admin login destination");
    const uiLogin = page.networkResponses.find(({ url, status }) => url.includes("/api/v1/auth/login") && status === 200);
    assert.ok(uiLogin, "browser login response missing");
    const uiLoginBody = await page.send("Network.getResponseBody", { requestId: uiLogin.requestId });
    const uiLoginSession = JSON.parse(uiLoginBody.base64Encoded
      ? Buffer.from(uiLoginBody.body, "base64").toString("utf8") : uiLoginBody.body);
    assert.equal(uiLoginSession.user.role, "SUPER_ADMIN");
    await waitFor(page, "document.body.innerText.includes('SUPER_ADMIN')", "admin role display");
    assert.equal(pageApiStatus(page, "/admin/dashboard"), 200);
    const kpiVisible = await page.evaluate(`Array.from(document.querySelectorAll('#workspace-main p'))
      .some(p => p.textContent.trim() === ${JSON.stringify(String(dashboardAfterSetup.data.users))})`);
    assert.equal(kpiVisible, true);
    console.log(JSON.stringify({ phase: "browser_login_dashboard", route: "/admin", kpiUsers: dashboardAfterSetup.data.users }));

    const routes = [
      ["/admin/users", "/admin/users"],
      ["/admin/companies", "/admin/companies"],
      ["/admin/jobs", "/admin/jobs"],
      ["/admin/system", "/admin/audit"],
    ];
    for (const [route, endpoint] of routes) {
      const apiResult = await api("GET", endpoint, adminToken);
      assert.equal(apiResult.status, 200);
      await page.goto(`${FRONTEND_URL}${route}`);
      await waitFor(page, `document.querySelector('#workspace-main') && !document.querySelector('[data-testid="forbidden-page"]')`, route);
      assert.equal(pageApiStatus(page, endpoint), 200, `browser ${route} API status`);
      if (route === "/admin/users") {
        assert.equal(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(accounts.PLATFORM_ADMIN_EMAIL)})`), true);
        assert.equal(await page.evaluate("document.querySelectorAll('#workspace-main button').length > 0"), true);
      }
      if (route === "/admin/companies" && apiResult.data.data.length) {
        assert.equal(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(apiResult.data.data[0].name)})`), true);
      }
      if (route === "/admin/jobs" && apiResult.data.data.length) {
        assert.equal(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(apiResult.data.data[0].title)})`), true);
      }
      if (route === "/admin/system") {
        assert.ok(apiResult.data.data.length > 0, "audit records must be genuine");
      }
      console.log(JSON.stringify({ phase: "browser_admin_page", route, apiStatus: 200,
        records: apiResult.data.data.length }));
    }

    if (!readOnly) {
    await page.goto(`${FRONTEND_URL}/admin/users?q=${encodeURIComponent(syntheticUserEmail)}`);
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(syntheticUserEmail)})`, "synthetic user row");
    await clickRowButton(page, syntheticUserEmail, "Tạm đình chỉ");
    await waitForApi(page, `/admin/users/${syntheticUserId}/status`, 200);
    assert.equal((await api("GET", `/admin/users/${syntheticUserId}`, adminToken)).data.status, "SUSPENDED");
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(syntheticUserEmail)}) &&
      Array.from(document.querySelectorAll('#workspace-main tr')).some(r => r.textContent.includes(${JSON.stringify(syntheticUserEmail)}) && r.textContent.includes('SUSPENDED'))`, "user suspension rendered");
    await clickRowButton(page, syntheticUserEmail, "Kích hoạt lại");
    await sleep(700);
    assert.equal((await api("GET", `/admin/users/${syntheticUserId}`, adminToken)).data.status, "ACTIVE");
    console.log(JSON.stringify({ phase: "browser_user_actions", synthetic: true, suspendedAndRestored: true }));

    await page.goto(`${FRONTEND_URL}/admin/companies`);
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(companyName)})`, "synthetic company row");
    assert.equal((await api("GET", `/admin/companies/${companyId}`, adminToken)).data.verificationStatus, "UNVERIFIED");
    const prematureReviewControls = await page.evaluate(`(() => {
      const row = Array.from(document.querySelectorAll('#workspace-main tr'))
        .find(r => r.textContent.includes(${JSON.stringify(companyName)}));
      return Array.from(row.querySelectorAll('button')).some(b =>
        b.textContent.includes('Xác minh') || b.textContent.includes('Từ chối'));
    })()`);
    assert.equal(prematureReviewControls, false);
    await clickRowButton(page, companyName, "Đình chỉ");
    await waitForApi(page, `/admin/companies/${companyId}/status`, 200);
    assert.equal((await api("GET", `/admin/companies/${companyId}`, adminToken)).data.status, "SUSPENDED");
    await waitFor(page, `Array.from(document.querySelectorAll('#workspace-main tr')).some(r =>
      r.textContent.includes(${JSON.stringify(companyName)}) && r.textContent.includes('SUSPENDED'))`, "company suspension rendered");
    await clickRowButton(page, companyName, "Kích hoạt lại");
    await sleep(700);
    assert.equal((await api("GET", `/admin/companies/${companyId}`, adminToken)).data.status, "ACTIVE");
    console.log(JSON.stringify({ phase: "browser_company_actions", synthetic: true, suspendedAndRestored: true }));

    await page.goto(`${FRONTEND_URL}/admin/jobs?status=PUBLISHED`);
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(jobTitle)})`, "synthetic job row");
    await page.evaluate("window.confirm = () => true");
    await clickRowButton(page, jobTitle, "Đóng / Gỡ tin");
    await waitForApi(page, `/admin/jobs/${draftId}/close`, 200);
    assert.equal((await api("GET", `/admin/jobs/${draftId}`, adminToken)).data.status, "CLOSED");
    const auditAfterWrites = await api("GET", "/admin/audit?pageSize=100", adminToken);
    assert.equal(auditAfterWrites.status, 200);
    assert.ok(auditAfterWrites.data.data.some((entry) => entry.targetId === draftId && entry.action === "admin.job.close"));
    console.log(JSON.stringify({ phase: "browser_job_action", synthetic: true, closedAndAudited: true }));
    }

    await page.goto(`${FRONTEND_URL}/admin/system`);

    await page.reload();
    await waitFor(page, "document.querySelector('#workspace-main') && !document.querySelector('[data-testid=forbidden-page]')", "F5 session");
    assert.equal(pageApiStatus(page, "/auth/refresh"), 200);
    assert.equal(pageApiStatus(page, "/admin/audit"), 200);
    console.log(JSON.stringify({ phase: "browser_f5", adminAccess: true }));

    const clicked = await page.evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('Đăng xuất'));
      if (!button) return false;
      button.click(); return true;
    })()`);
    assert.equal(clicked, true);
    await waitFor(page, "location.pathname === '/'", "admin logout navigation");
    assert.equal((await api("GET", "/auth/me", uiLoginSession.accessToken)).status, 401);
    await page.goto(`${FRONTEND_URL}/admin`);
    await waitFor(page, "location.pathname === '/login'", "logout blocks admin route");
    console.log(JSON.stringify({ phase: "browser_logout", blocked: true }));

    for (const [kind, email, password] of [
      ["candidate", accounts.CANDIDATE_EMAIL, accounts.CANDIDATE_PASSWORD],
      ["employer", accounts.EMPLOYER_EMAIL, accounts.EMPLOYER_PASSWORD],
    ]) {
      await page.loginViaUI(email, password);
      await page.goto(`${FRONTEND_URL}/admin`);
      await waitFor(page, "Boolean(document.querySelector('[data-testid=forbidden-page]'))", `${kind} admin UI deny`);
      console.log(JSON.stringify({ phase: "browser_ordinary_denied", kind }));
    }
  } finally { await browser.stop(); }
}

run().catch((error) => { console.error(`ADMIN_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
