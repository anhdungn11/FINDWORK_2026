const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Client } = require('pg');

const backend = 'http://127.0.0.1:3004/api/v1';
const frontend = 'http://127.0.0.1:5178';
const dbUrl = new URL(process.env.DATABASE_URL || '');
const expectedId = process.env.FINDWORK_TEST_DOCKER_SYSTEM_ID;
if (process.env.NODE_ENV !== 'test' || dbUrl.hostname !== '127.0.0.1' ||
    dbUrl.port !== '55432' || dbUrl.pathname !== '/findwork_test' ||
    dbUrl.searchParams.get('schema') !== 'public' || !/^\d{15,20}$/.test(expectedId || '')) {
  throw new Error('Chrome acceptance requires fingerprinted disposable PostgreSQL on 127.0.0.1:55432/findwork_test');
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(method, endpoint, token, body) {
  const response = await fetch(`${backend}${endpoint}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}
function assertStatus(result, expected, step) {
  if (result.status !== expected) throw new Error(`${step}: expected ${expected}, got ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
}

class Chrome {
  constructor(port) { this.port = port; this.id = 1; this.ws = null; this.process = null; }
  async start() {
    const profile = path.join(os.tmpdir(), `findwork-cp13-chrome-${randomUUID()}`);
    this.process = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new', '--no-first-run', '--disable-extensions',
      `--remote-debugging-port=${this.port}`, `--user-data-dir=${profile}`, 'about:blank',
    ], { stdio: 'ignore' });
    let version;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { version = await (await fetch(`http://127.0.0.1:${this.port}/json/version`)).json(); break; }
      catch { await pause(250); }
    }
    if (!version) throw new Error('Chrome CDP did not start');
    this.ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }
  stop() { this.ws?.close(); this.process?.kill(); }
  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      const timer = setTimeout(() => { this.ws.removeEventListener('message', listener); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
      const listener = (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timer);
        this.ws.removeEventListener('message', listener);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      };
      this.ws.addEventListener('message', listener);
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async page() {
    const target = await this.send('Target.createTarget', { url: 'about:blank' });
    const attached = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sid = attached.sessionId;
    await this.send('Page.enable', {}, sid);
    await this.send('Runtime.enable', {}, sid);
    return new Page(this, sid);
  }
}
class Page {
  constructor(chrome, sid) { this.chrome = chrome; this.sid = sid; }
  send(method, params = {}) { return this.chrome.send(method, params, this.sid); }
  async goto(url) { await this.send('Page.navigate', { url }); await pause(700); }
  async eval(fn, arg) {
    const expression = `(${fn.toString()})(${JSON.stringify(arg)})`;
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(`Chrome evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
    return response.result?.value;
  }
  async waitFor(fn, arg, label, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.eval(fn, arg)) return;
      await pause(250);
    }
    throw new Error(`Chrome timed out waiting for ${label}; body=${String(await this.eval(() => document.body.innerText)).slice(0, 500)}`);
  }
  async screenshot(file) {
    const result = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  }
}

async function login(page, route, email, password, expectedPath) {
  await page.goto(`${frontend}${route}`);
  await page.waitFor(() => Boolean(document.querySelector('input[type=email]')), null, 'login form');
  await page.eval(({ email, password }) => {
    const set = (selector, value) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error(`Missing ${selector}`);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('input[type=email]', email);
    set('input[type=password]', password);
    document.querySelector('form').requestSubmit();
  }, { email, password });
  await page.waitFor((path) => location.pathname.startsWith(path), expectedPath, `login redirect ${expectedPath}`);
}

async function main() {
  const db = new Client({ connectionString: dbUrl.toString() });
  await db.connect();
  const identity = await db.query('SELECT system_identifier::text AS id FROM pg_control_system()');
  if (identity.rows[0]?.id !== expectedId) throw new Error('Docker cluster fingerprint mismatch');
  const run = randomUUID().slice(0, 8);
  const password = 'Cp13dBrowserTest2026!';
  const adminEmail = `cp13d-chrome-admin-${run}@example.test`;
  const employerEmail = `cp13d-chrome-employer-${run}@example.test`;
  const admin = assertStatus(await api('POST', '/auth/register', null,
    { accountType: 'EMPLOYER', email: adminEmail, password }), 201, 'register Admin');
  const employer = assertStatus(await api('POST', '/auth/register', null,
    { accountType: 'EMPLOYER', email: employerEmail, password }), 201, 'register Employer');
  await db.query('INSERT INTO "SystemUserRole" ("userId", "roleId") SELECT $1, "id" FROM "Role" WHERE "systemCode" = $2',
    [admin.user.id, 'SUPER_ADMIN']);
  const company = assertStatus(await api('POST', '/companies', employer.accessToken,
    { name: `CP13D Chrome Company ${run}`, slug: `cp13d-chrome-${run}` }), 201, 'create company');
  const chrome = new Chrome(9251);
  const employerChrome = new Chrome(9252);
  const evidence = path.resolve(__dirname, '../../docs/evidence');
  fs.mkdirSync(evidence, { recursive: true });
  try {
    await chrome.start();
    const adminPage = await chrome.page();
    await login(adminPage, '/login', adminEmail, password, '/admin');
    await adminPage.goto(`${frontend}/admin/companies`);
    await adminPage.waitFor((name) => document.body.innerText.includes(name),
      company.name, 'company in Admin list');
    const opened = await adminPage.eval((name) => {
      const row = [...document.querySelectorAll('tr')].find((item) => item.textContent.includes(name));
      const button = row?.querySelector('button[title]');
      button?.click();
      return Boolean(button);
    }, company.name);
    if (!opened) throw new Error('Company detail button not found');
    await adminPage.waitFor(() => [...document.querySelectorAll('button')]
      .some((button) => button.textContent.includes('Permission Center')), null, 'permission tab');
    await adminPage.eval(() => [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Permission Center'))?.click());
    const checkbox = (checked) => [...document.querySelectorAll('label')]
      .find((label) => label.querySelector('code')?.textContent === 'ai.business.access')
      ?.querySelector('input[type=checkbox]')?.checked === checked;
    await adminPage.waitFor(checkbox, false, 'initial denied AI capability');
    await adminPage.eval(() => {
      window.confirm = () => true;
      window.prompt = () => 'CP13D mock Chrome Business AI approval';
    });
    await adminPage.eval(() => [...document.querySelectorAll('label')]
      .find((label) => label.querySelector('code')?.textContent === 'ai.business.access')
      ?.querySelector('input[type=checkbox]')?.click());
    await adminPage.waitFor(checkbox, true, 'Admin AI grant refresh');
    await adminPage.screenshot(path.join(evidence, 'cp13d-admin-ai-granted.png'));

    await employerChrome.start();
    const employerPage = await employerChrome.page();
    await login(employerPage, '/employer/login', employerEmail, password, '/employer');
    await employerPage.goto(`${frontend}/employer/ai`);
    await employerPage.waitFor(() => Boolean(document.querySelector('input[id$="-draft-title"]')),
      null, 'Employer AI draft form');
    await employerPage.eval(() => {
      const input = document.querySelector('input[id$="-draft-title"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
        .set.call(input, 'CP13D Browser Engineer');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.closest('form').requestSubmit();
    });
    await employerPage.waitFor(() => document.body.innerText.includes('MOCK PROVIDER: Build reliable browser features.'),
      null, 'mock provider draft result');
    await employerPage.screenshot(path.join(evidence, 'cp13d-employer-ai-result.png'));
    const quota = assertStatus(await api('GET', `/companies/${company.id}/ai/quota`, employer.accessToken),
      200, 'company AI quota');
    if (quota.monthlyCreditsRemaining !== 99 || quota.dailyRequestsUsed !== 1) {
      throw new Error('Real company quota did not record the Chrome generation');
    }
    await adminPage.eval(() => [...document.querySelectorAll('label')]
      .find((label) => label.querySelector('code')?.textContent === 'ai.business.access')
      ?.querySelector('input[type=checkbox]')?.click());
    await adminPage.waitFor(checkbox, false, 'Admin AI revoke refresh');
    await employerPage.eval(() => {
      document.querySelector('input[id$="-draft-title"]').closest('form').requestSubmit();
    });
    await employerPage.waitFor(() => document.body.innerText.includes('Company is not permitted to use ai.business.access'),
      null, 'Employer AI denied after revoke');
    await employerPage.screenshot(path.join(evidence, 'cp13d-employer-ai-revoked.png'));
    const audit = await db.query('SELECT action, "actorUserId", "afterData" FROM "AuditLog" WHERE "companyId"=$1 AND "targetType"=$2 ORDER BY "createdAt"',
      [company.id, 'CompanyPlatformCapability']);
    if (audit.rows.length !== 2 || audit.rows.some((row) => row.actorUserId !== admin.user.id || !row.afterData.reason)) {
      throw new Error('AI grant/revoke audit mismatch');
    }
    const usage = await db.query('SELECT status, model, "inputTokens", "outputTokens" FROM "CompanyAiGenerationLog" WHERE "companyId"=$1',
      [company.id]);
    if (usage.rows.length !== 1 || usage.rows[0].status !== 'SUCCEEDED' ||
        usage.rows[0].model !== 'MOCK_PROVIDER_NO_LIVE_CREDITS') {
      throw new Error('Company AI usage log mismatch');
    }
    const report = { run, companyId: company.id, realChrome: true, providerMocked: true,
      providerModel: 'MOCK_PROVIDER_NO_LIVE_CREDITS', adminGrantedAndRevoked: true,
      employerUiGeneratedDraft: true, employerUiDeniedAfterRevoke: true,
      quotaAfterOneGeneration: { monthlyCreditsRemaining: quota.monthlyCreditsRemaining,
        dailyRequestsUsed: quota.dailyRequestsUsed }, auditActions: audit.rows.map((row) => row.action),
      screenshots: ['cp13d-admin-ai-granted.png', 'cp13d-employer-ai-result.png', 'cp13d-employer-ai-revoked.png'] };
    fs.writeFileSync(path.join(evidence, 'cp13d-chrome-acceptance.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify(report) + '\n');
  } finally {
    employerChrome.stop();
    chrome.stop();
    await db.end();
  }
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
