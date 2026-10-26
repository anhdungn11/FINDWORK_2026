const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("../server/node_modules/pg");
const dotenv = require("../server/node_modules/dotenv");

const front = "http://127.0.0.1:5178";
const api = "http://127.0.0.1:3003/api/v1";
const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, "../server/.env.frontend-acceptance.local")));
const target = new URL(env.DATABASE_URL);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, "5432");
assert.equal(target.pathname, "/findwork_frontend_acceptance_cc7531c3be19");
assert.equal(env.FINDWORK_EXPECTED_DATABASE, target.pathname.slice(1));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Chrome {
  constructor() {
    this.port = 9241;
    this.nextId = 1;
  }
  async start() {
    const profile = path.join(process.env.TEMP || "C:\\Windows\\Temp", "findwork-registration-" + Date.now());
    this.child = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
      "--headless=new", "--remote-debugging-port=" + this.port,
      "--user-data-dir=" + profile, "--no-first-run", "--disable-extensions", "about:blank"
    ]);
    for (let attempt = 0; attempt < 40; attempt++) {
      await pause(250);
      try {
        const response = await fetch("http://127.0.0.1:" + this.port + "/json/version");
        if (response.ok) {
          const version = await response.json();
          this.ws = new WebSocket(version.webSocketDebuggerUrl);
          await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
          });
          return;
        }
      } catch {}
    }
    throw new Error("Chrome remote debugging did not start");
  }
  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const handler = (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        this.ws.removeEventListener("message", handler);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      };
      this.ws.addEventListener("message", handler);
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId && {sessionId}) }));
    });
  }
  async page() {
    const context = await this.send("Target.createBrowserContext", { disposeOnDetach: true });
    const target = await this.send("Target.createTarget", { url: "about:blank", browserContextId: context.browserContextId });
    const attached = await this.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const page = new Page(this, attached.sessionId);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Network.enable");
    return page;
  }
  async stop() {
    try { this.ws?.close(); } catch {}
    try { this.child?.kill(); } catch {}
  }
}
class Page {
  constructor(chrome, sessionId) {
    this.chrome = chrome;
    this.sessionId = sessionId;
    this.requests = [];
    this.responses = [];
    this.chrome.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.sessionId !== this.sessionId) return;
      const params = message.params;
      if (message.method === "Network.requestWillBeSent" && params.request.url.includes("/auth/register")) {
        let body = {};
        try { body = JSON.parse(params.request.postData || "{}"); } catch {}
        this.requests.push({
          requestId: params.requestId,
          path: new URL(params.request.url).pathname,
          method: params.request.method,
          keys: Object.keys(body).sort(),
          accountType: body.accountType
        });
      }
      if (message.method === "Network.responseReceived" && params.response.url.includes("/auth/register")) {
        this.responses.push({ requestId: params.requestId, status: params.response.status,
          path: new URL(params.response.url).pathname });
      }
      if (this.abortRegistration && message.method === "Fetch.requestPaused" && params.request.url.includes("/auth/register")) {
        let body = {};
        try { body = JSON.parse(params.request.postData || "{}"); } catch {}
        this.intercepted = { path: new URL(params.request.url).pathname,
          method: params.request.method, keys: Object.keys(body).sort(), accountType: body.accountType };
        void this.send("Fetch.failRequest", {requestId: params.requestId, errorReason: "Aborted"});
      }
    });
  }
  send(method, params = {}) { return this.chrome.send(method, params, this.sessionId); }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Browser evaluation failed");
    return result.result?.value;
  }
  async goto(url) {
    await this.send("Page.navigate", { url });
    await pause(1200);
  }
  async fill(selector, value) {
    await this.evaluate("(() => { const el = document.querySelector(" + JSON.stringify(selector) + ");" +
      "if (!el) throw Error('Input missing');" +
      "const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;" +
      "setter.call(el, " + JSON.stringify(value) + ");" +
      "el.dispatchEvent(new Event('input', {bubbles:true}));" +
      "el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  }
}
async function waitFor(predicate, label) {
  for (let i = 0; i < 60; i++) {
    if (await predicate()) return;
    await pause(250);
  }
  throw new Error("Timed out: " + label);
}
async function makePage(browser, route) {
  const page = await browser.page();
  await page.goto(front + route);
  return page;
}
async function enterRegistration(page, accountType, email, password, confirmation = password) {
  await page.evaluate("document.querySelector('input[value=" + accountType + "]').click()");
  assert.equal(await page.evaluate("document.querySelector('input[value=" + accountType + "]').checked"), true);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#confirmPassword", confirmation);
  await page.evaluate("document.querySelector('input[type=checkbox]').click()");
  await pause(200);
  assert.equal(await page.evaluate("Boolean(document.querySelector('[data-testid=candidate-onboarding-cta], [data-testid=employer-onboarding-cta]'))"), false);
  await page.evaluate("document.querySelector('button[type=submit]').click()");
}
async function apiPost(route, body) {
  const response = await fetch(api + route, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000)
  });
  return { status: response.status, body: await response.json() };
}
async function persistedType(db, email) {
  const result = await db.query('SELECT "accountType"::text AS "accountType" FROM "User" WHERE "emailNormalized" = $1', [email.toLowerCase()]);
  assert.equal(result.rows.length, 1);
  return result.rows[0].accountType;
}
async function main() {
  const db = new Client({connectionString: env.DATABASE_URL, options: "-c default_transaction_read_only=on"});
  await db.connect();
  const identity = (await db.query("SELECT current_database() AS database")).rows[0].database;
  assert.equal(identity, env.FINDWORK_EXPECTED_DATABASE);
  const browser = new Chrome();
  await browser.start();
  const created = [];
  try {
    for (const accountType of ["CANDIDATE", "EMPLOYER"]) {
      const marker = randomBytes(6).toString("hex");
      const email = accountType.toLowerCase() + "-registration-" + marker + "@example.invalid";
      const password = "Synthetic!A9" + randomBytes(8).toString("hex");
      const page = await makePage(browser, accountType === "CANDIDATE" ? "/register" : "/employer/register");
      await enterRegistration(page, accountType, email, password);
      await waitFor(() => page.responses.some((item) => item.path === "/api/v1/auth/register/v2"), accountType + " registration response");
      const request = page.requests.find((item) => item.path === "/api/v1/auth/register/v2");
      const response = page.responses.find((item) => item.path === "/api/v1/auth/register/v2");
      assert.deepEqual(request?.keys, ["accountType", "email", "password"]);
      assert.equal(request?.accountType, accountType);
      assert.equal(response.status, 201);
      if (accountType === "CANDIDATE") {
        await waitFor(async () => await page.evaluate("Boolean(document.querySelector('[data-testid=candidate-onboarding-cta]'))"), "Candidate accepted UI");
        await page.evaluate("document.querySelector('[data-testid=candidate-onboarding-cta]').click()");
        await waitFor(async () => await page.evaluate("location.pathname === '/candidate/onboarding'"), "Candidate onboarding");
      } else {
        await waitFor(async () => await page.evaluate("location.pathname === '/employer/onboarding'"), "Employer onboarding");
      }
      assert.equal(await persistedType(db, email), accountType);
      const login = await apiPost("/auth/login", { email, password });
      assert.equal(login.status, 200);
      assert.equal(login.body.user.accountType, accountType);
      created.push({ accountType, email, password });
      console.log(JSON.stringify({ accountType, registerStatus: response.status,
        requestKeys: request.keys, persistedType: accountType,
        onboarding: accountType === "CANDIDATE" ? "/candidate/onboarding" : "/employer/onboarding",
        loginStatus: login.status }));
      const loginPage = await makePage(browser, accountType === "CANDIDATE" ? "/login" : "/employer/login");
      await loginPage.fill("#email", email);
      await loginPage.fill("#password", password);
      await loginPage.evaluate("document.querySelector('button[type=submit]').click()");
      const destination = accountType === "CANDIDATE" ? "/candidate" : "/employer";
      await waitFor(async () => await loginPage.evaluate("location.pathname === " + JSON.stringify(destination)), accountType + " browser login");
      console.log(JSON.stringify({accountType, browserLogin: "PASS", destination}));
    }

    const missing = await apiPost("/auth/register", {
      email: "missing-type-" + randomBytes(5).toString("hex") + "@example.invalid",
      password: "SyntheticPassword123!"
    });
    assert.equal(missing.status, 400);
    assert.match(JSON.stringify(missing.body), /accountType/);
    const invalid = await apiPost("/auth/register", {
      email: "invalid-type-" + randomBytes(5).toString("hex") + "@example.invalid",
      password: "SyntheticPassword123!", accountType: "SUPER_ADMIN"
    });
    assert.equal(invalid.status, 400);
    assert.match(JSON.stringify(invalid.body), /accountType/);

    const duplicatePage = await makePage(browser, "/register");
    await enterRegistration(duplicatePage, "CANDIDATE", created[0].email, created[0].password);
    await waitFor(() => duplicatePage.responses.some((item) => item.path === "/api/v1/auth/register/v2"), "duplicate response");
    assert.equal(duplicatePage.responses.find((item) => item.path === "/api/v1/auth/register/v2").status, 409);
    await waitFor(async () => await duplicatePage.evaluate("Boolean(document.querySelector('[role=alert]'))"), "duplicate UI error");
    assert.equal(await duplicatePage.evaluate("Boolean(document.querySelector('[data-testid=candidate-onboarding-cta]'))"), false);

    const mismatchPage = await makePage(browser, "/register");
    await enterRegistration(mismatchPage, "CANDIDATE",
      "mismatch-" + randomBytes(5).toString("hex") + "@example.invalid",
      "SyntheticPassword123!", "DifferentPassword123!");
    await waitFor(async () => await mismatchPage.evaluate("Boolean(document.querySelector('[role=alert]'))"), "client validation error");
    assert.equal(mismatchPage.requests.length, 0);
    assert.equal(await mismatchPage.evaluate("Boolean(document.querySelector('[data-testid=candidate-onboarding-cta]'))"), false);

    const networkPage = await makePage(browser, "/register");
    networkPage.abortRegistration = true;
    await networkPage.send("Fetch.enable", { patterns: [{ urlPattern: "*auth/register*", requestStage: "Request" }] });
    await enterRegistration(networkPage, "CANDIDATE",
      "network-" + randomBytes(5).toString("hex") + "@example.invalid", "SyntheticPassword123!");
    await waitFor(() => Boolean(networkPage.intercepted), "network failure interception");
    await waitFor(async () => await networkPage.evaluate("Boolean(document.querySelector('[role=alert]'))"), "network error UI");
    assert.equal(await networkPage.evaluate("Boolean(document.querySelector('[data-testid=candidate-onboarding-cta]'))"), false);
    console.log(JSON.stringify({ missingAccountType: missing.status, invalidAccountType: invalid.status,
      duplicateEmail: 409, clientValidation: "PASS", networkFailure: "PASS", prematureSuccess: false,
      database: identity }));
  } finally {
    await browser.stop();
    await db.end();
  }
}
main().catch((error) => { console.error("REGISTRATION_ACCEPTANCE_FAILED " + error.message); process.exitCode = 1; });
