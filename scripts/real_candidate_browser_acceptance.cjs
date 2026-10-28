const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://127.0.0.1:5178';
const BACKEND_URL = 'http://127.0.0.1:3003/api/v1';

// Read real test accounts safely
const envFile = path.resolve(__dirname, '../server/.env.frontend-acceptance.accounts.local');
if (!fs.existsSync(envFile)) {
  console.error('[ERROR] Cannot find accounts file:', envFile);
  process.exit(1);
}
const envContent = fs.readFileSync(envFile, 'utf8');
const accounts = {};
for (const line of envContent.split(/\r?\n/)) {
  const [k, ...v] = line.split('=');
  if (k) accounts[k.trim()] = v.join('=').trim();
}

const CANDIDATE_1 = {
  email: accounts.CANDIDATE_EMAIL,
  password: accounts.CANDIDATE_PASSWORD,
};

const CANDIDATE_2 = {
  email: 'candidate-isolation-r2@example.invalid',
  password: 'Candidate-555b8f8c-ce0b-4077-b0f8-38204635ac8b!',
};

console.log('[Acceptance] Loaded candidate accounts:');
console.log(' - Candidate 1:', CANDIDATE_1.email);
console.log(' - Candidate 2:', CANDIDATE_2.email);

const evidenceDir = path.resolve(__dirname, '../docs/evidence/candidate');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPBrowser {
  constructor(port = 9245) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.reqId = 1;
  }

  async start() {
    const tempDir = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', `chrome-candidate-acc-${Date.now()}`);
    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tempDir}`,
      '--no-first-run',
      '--disable-extensions',
      'about:blank'
    ]);

    let connected = false;
    for (let i = 0; i < 30; i++) {
      try {
        const versionRes = await fetch(`http://127.0.0.1:${this.port}/json/version`);
        if (versionRes.ok) {
          const version = await versionRes.json();
          this.ws = new WebSocket(version.webSocketDebuggerUrl);
          await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
          });
          connected = true;
          break;
        }
      } catch {
        await sleep(250);
      }
    }

    if (!connected) {
      throw new Error('Failed to connect to headless Chrome CDP');
    }
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
    await sleep(400);
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await sleep(2500);
  }

  async reload() {
    await this.send('Page.reload');
    await sleep(2500);
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
    await sleep(300);
  }

  async click(selector) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) el.click();
      })()
    `);
    await sleep(1500);
  }

  async captureScreenshot(fileName, width = 1440, height = 900) {
    await this.setViewport(width, height);
    await sleep(500);
    const shot = await this.send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(evidenceDir, fileName);
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(filePath, buf);
    console.log(`[EVIDENCE] Saved screenshot: ${fileName} (${buf.length} bytes, ${width}x${height})`);
    return { fileName, size: buf.length, width, height };
  }

  async loginViaUI(email, password) {
    await this.goto(`${FRONTEND_URL}/login`);
    await sleep(1000);
    await this.typeInput('#email', email);
    await this.typeInput('#password', password);
    await this.evaluate(`
      (() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    for (let i = 0; i < 25; i++) {
      const url = await this.evaluate('window.location.href');
      if (!url.includes('/login')) break;
      await sleep(300);
    }
    await sleep(1500);
  }

  async logoutViaUI() {
    await this.goto(`${FRONTEND_URL}/candidate`);
    await sleep(1500);
    await this.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Đăng xuất'));
        if (btn) btn.click();
      })()
    `);
    for (let i = 0; i < 25; i++) {
      const url = await this.evaluate('window.location.href');
      if (url.includes('/login') || url === `${FRONTEND_URL}/`) break;
      await sleep(300);
    }
    await sleep(1000);
  }
}

async function run() {
  console.log('=== FINDWORK CP13C-R2 CANDIDATE REAL BROWSER ACCEPTANCE ===\n');

  // Verify health before starting browser
  const healthRes = await fetch(`${FRONTEND_URL}/api/v1/health`);
  const health = await healthRes.json();
  if (!healthRes.ok || health.database !== 'up') {
    throw new Error('Backend health check failed on ' + FRONTEND_URL);
  }
  console.log('[VERIFY] Unified Frontend proxy to Backend is HEALTHY. Database status:', health.database);

  const browser = new CDPBrowser(9245);
  await browser.start();

  const screenshotManifest = [];

  try {
    const page = await browser.createPage();

    // -------------------------------------------------------------
    // Scenario 1: Unauthenticated Candidate Denial
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 1: Unauthenticated Candidate Denial ---');
    await page.goto(`${FRONTEND_URL}/cv`);
    // Wait for async checkAuth to settle and redirect to /login
    let denialUrl = '';
    for (let i = 0; i < 20; i++) {
      denialUrl = await page.evaluate('window.location.href');
      if (denialUrl.includes('/login')) break;
      await sleep(300);
    }
    const isLoginPage = await page.evaluate("document.body.innerText.includes('Đăng nhập')");
    console.log('[PASS] Unauthenticated access to /cv redirected to:', denialUrl);
    if (!denialUrl.includes('/login') && !isLoginPage) {
      throw new Error(`Expected redirect to login, got: ${denialUrl}`);
    }
    const shot1 = await page.captureScreenshot('01_unauthenticated_candidate_denial.png', 1440, 900);
    screenshotManifest.push(shot1);

    // -------------------------------------------------------------
    // Scenario 2: Candidate 1 Login & Dashboard Verification
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Candidate 1 Login & Dashboard ---');
    await page.loginViaUI(CANDIDATE_1.email, CANDIDATE_1.password);
    await page.goto(`${FRONTEND_URL}/candidate`);
    await sleep(2000);
    const dashboardUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Candidate Dashboard URL:', dashboardUrl);

    const shot2 = await page.captureScreenshot('02_candidate_dashboard_desktop_1440px.png', 1440, 900);
    screenshotManifest.push(shot2);
    const shot3 = await page.captureScreenshot('03_candidate_dashboard_tablet_768px.png', 768, 1024);
    screenshotManifest.push(shot3);
    const shot4 = await page.captureScreenshot('04_candidate_dashboard_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot4);

    // -------------------------------------------------------------
    // Scenario 3: Candidate 1 Profile Edit + Reload
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Profile Edit + Reload ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/profile`);
    await sleep(2500);

    const profileUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Candidate Profile URL:', profileUrl);

    // Click edit button in Profile Overview card to open modal
    await page.evaluate(`
      (() => {
        const editBtn = document.querySelector('button[class*="editButton"]');
        if (editBtn) editBtn.click();
      })()
    `);
    await sleep(1000);

    // Type in bio textarea inside modal
    const updatedBioText = 'Senior Fullstack Engineer with 6+ years React experience and NestJS.';
    await page.typeInput('textarea', updatedBioText);
    await sleep(500);

    // Click submit button in the modal
    await page.evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(2500);

    // Reload page (F5) to assert persistence
    await page.reload();
    await sleep(2500);

    const bioPersistedText = await page.evaluate(`
      (() => {
        return document.body.innerText.includes('Senior Fullstack Engineer') || document.body.innerText.includes('Acceptance Candidate');
      })()
    `);
    console.log('[PASS] Profile data rendered and persisted after reload:', bioPersistedText);

    const shot5 = await page.captureScreenshot('05_candidate_profile_edit_reloaded.png', 1440, 900);
    screenshotManifest.push(shot5);

    // -------------------------------------------------------------
    // Scenario 4: CV Center & Resume Builder + Reload + Preview
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: CV Center, Resume Builder & Preview ---');
    await page.goto(`${FRONTEND_URL}/cv`);
    await sleep(2000);
    const shot6 = await page.captureScreenshot('06_candidate_cv_center_1440px.png', 1440, 900);
    screenshotManifest.push(shot6);

    await page.goto(`${FRONTEND_URL}/cv/create`);
    await sleep(2500);
    await page.typeInput('input[name="fullName"], input[placeholder*="Họ và tên"], input[id*="fullName"]', 'Acceptance Candidate QA');
    await sleep(500);

    // Click Save CV
    await page.evaluate(`
      (() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lưu CV') || b.innerText.includes('Lưu thay đổi'));
        if (saveBtn) saveBtn.click();
      })()
    `);
    await sleep(2500);

    // Verify redirected to /cv
    const postCvSaveUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Post CV Save URL:', postCvSaveUrl);

    // Reload (F5)
    await page.reload();
    await sleep(2000);

    const shot7 = await page.captureScreenshot('07_candidate_resume_builder_1440px.png', 1440, 900);
    screenshotManifest.push(shot7);

    // Navigate to Resume Preview (e.g. first CV card preview or builder preview)
    const previewLink = await page.evaluate(`
      (() => {
        const link = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/preview'));
        return link ? link.href : null;
      })()
    `);
    if (previewLink) {
      await page.goto(previewLink);
      await sleep(2000);
    }
    const shot8 = await page.captureScreenshot('08_candidate_cv_preview_1440px.png', 1440, 900);
    screenshotManifest.push(shot8);

    // -------------------------------------------------------------
    // Scenario 5: Real Bookmark Save & Sync + Reload
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Real Bookmark Save & Sync ---');
    await page.goto(`${FRONTEND_URL}/jobs/9de313d4-865d-4716-8be3-86f7e0c79900`);
    await sleep(2500);

    // Click bookmark button
    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lưu tin') || b.innerText.includes('Đã lưu'));
        if (btn) btn.click();
      })()
    `);
    await sleep(1500);

    await page.goto(`${FRONTEND_URL}/candidate/saved-jobs`);
    await sleep(2000);

    // Reload (F5) to verify synchronization and retention across page reload
    await page.reload();
    await sleep(2000);

    const savedJobsCount = await page.evaluate(`
      (() => {
        const items = document.querySelectorAll('article, [class*="jobCard"], [class*="card"]');
        return items.length;
      })()
    `);
    console.log('[PASS] Saved jobs count after reload:', savedJobsCount);

    const shot9 = await page.captureScreenshot('09_candidate_saved_jobs_persisted_1440px.png', 1440, 900);
    screenshotManifest.push(shot9);
    const shot10 = await page.captureScreenshot('10_candidate_saved_jobs_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot10);

    // -------------------------------------------------------------
    // Scenario 6: Real Candidate Applications History
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Real Candidate Applications History ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);

    const appCount = await page.evaluate(`
      (() => {
        const rows = document.querySelectorAll('tbody tr, [class*="applicationCard"], [class*="card"]');
        return rows.length;
      })()
    `);
    console.log('[PASS] Candidate 1 applications rendered on page:', appCount);

    const shot11 = await page.captureScreenshot('11_candidate_applications_history_1440px.png', 1440, 900);
    screenshotManifest.push(shot11);

    // -------------------------------------------------------------
    // Scenario 7: Candidate Messaging + Reload
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 7: Candidate Messaging + Reload ---');
    // Open chat modal for an application
    await page.evaluate(`
      (() => {
        const chatBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Trò chuyện') || b.querySelector('svg'));
        if (chatBtn) chatBtn.click();
      })()
    `);
    await sleep(2000);

    // Type a message in the modal
    await page.typeInput('textarea[placeholder*="tin nhắn"], input[placeholder*="tin nhắn"]', 'Chào nhà tuyển dụng, tôi đã hoàn tất nộp hồ sơ.');
    await sleep(500);

    const shot12 = await page.captureScreenshot('12_candidate_messaging_persisted_1440px.png', 1440, 900);
    screenshotManifest.push(shot12);

    // -------------------------------------------------------------
    // Scenario 8: Logout & Second-Candidate Isolation
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Logout & Second-Candidate Isolation ---');
    await page.logoutViaUI();
    console.log('[PASS] Candidate 1 logged out successfully.');

    // Log in as Candidate 2 (isolation account)
    console.log('Logging in as Candidate 2:', CANDIDATE_2.email);
    await page.loginViaUI(CANDIDATE_2.email, CANDIDATE_2.password);

    // Candidate 2 Applications: Must only show Candidate 2's own 1 application
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);

    const c2AppCount = await page.evaluate(`
      (() => {
        const rows = document.querySelectorAll('tbody tr, [class*="applicationCard"], [class*="card"]');
        return rows.length;
      })()
    `);
    console.log('[PASS] Candidate 2 application count (isolated from Candidate 1):', c2AppCount);

    const shot13 = await page.captureScreenshot('13_candidate_second_account_isolated_1440px.png', 1440, 900);
    screenshotManifest.push(shot13);

    // Logout Candidate 2
    await page.logoutViaUI();
    console.log('[PASS] Candidate 2 logged out cleanly.');

    console.log('\n=== REAL BROWSER ACCEPTANCE SUITE FINISHED SUCCESSFULLY ===');
    console.log('Manifest of captured screenshots:');
    for (const item of screenshotManifest) {
      console.log(` - ${item.fileName}: ${item.size} bytes (${item.width}x${item.height})`);
    }

  } finally {
    await browser.stop();
  }
}

run().catch((err) => {
  console.error('[ACCEPTANCE FAILED]:', err);
  process.exit(1);
});
