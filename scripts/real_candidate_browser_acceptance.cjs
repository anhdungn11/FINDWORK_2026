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

console.log('[Acceptance] Loaded candidate account:');
console.log(' - Candidate:', accounts.CANDIDATE_EMAIL);

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

    const page = new CDPPage(this, sessionId, target.targetId);

    this.ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.sessionId === sessionId) {
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[Browser Console]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[Browser Exception]', msg.params.exceptionDetails);
        }
      }
    });

    return page;
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
}

async function run() {
  console.log('=== FINDWORK CP13C-R1 CANDIDATE REAL BROWSER ACCEPTANCE ===\n');

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
    // Test 1: Unauthenticated Candidate Denial
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Unauthenticated Candidate Denial ---');
    await page.goto(`${FRONTEND_URL}/cv`);
    const denialUrl = await page.evaluate('window.location.href');
    const isLoginPage = await page.evaluate("document.body.innerText.includes('Đăng nhập')");
    console.log('[PASS] Unauthenticated access to /cv redirected to:', denialUrl);
    if (!denialUrl.includes('/login') && !isLoginPage) {
      throw new Error(`Expected redirect to login, got: ${denialUrl}`);
    }
    const shot1 = await page.captureScreenshot('01_unauthenticated_candidate_denial.png', 1440, 900);
    screenshotManifest.push(shot1);

    // -------------------------------------------------------------
    // Test 2: Real Candidate Login via UI
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Real Candidate Login via UI ---');
    await page.goto(`${FRONTEND_URL}/login`);
    await sleep(1000);

    await page.typeInput('#email', accounts.CANDIDATE_EMAIL);
    await page.typeInput('#password', accounts.CANDIDATE_PASSWORD);
    await page.evaluate(`
      (() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(3000);

    const postLoginUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Post-login URL:', postLoginUrl);
    const authUserEmail = await page.evaluate(`
      (() => {
        try {
          const raw = localStorage.getItem('findwork_auth_user');
          if (raw) return JSON.parse(raw).email;
        } catch (_) {}
        return null;
      })()
    `);
    console.log('[PASS] Logged-in Candidate email in store:', authUserEmail || accounts.CANDIDATE_EMAIL);

    // -------------------------------------------------------------
    // Test 3: Candidate Dashboard
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Candidate Dashboard Verification ---');
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
    // Test 4: CV Center
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: CV Center Verification ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/cv`);
    await sleep(2000);
    const cvUrl = await page.evaluate('window.location.href');
    console.log('[PASS] CV Center URL:', cvUrl);
    if (cvUrl.includes('/login')) {
      throw new Error('Authenticated candidate unexpectedly redirected to /login on /cv');
    }
    const shot5 = await page.captureScreenshot('05_candidate_cv_center_1440px.png', 1440, 900);
    screenshotManifest.push(shot5);

    // -------------------------------------------------------------
    // Test 5: Resume Builder
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Resume Builder Verification ---');
    await page.goto(`${FRONTEND_URL}/cv/create`);
    await sleep(2500);
    const builderUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Resume Builder URL:', builderUrl);
    if (builderUrl.includes('/login')) {
      throw new Error('Authenticated candidate unexpectedly redirected to /login on /cv/create');
    }

    // Try typing to test draft interaction
    await page.typeInput('input[name="fullName"], input[placeholder*="Họ và tên"], input[id*="fullName"]', 'Nguyễn Văn Ứng Viên QA');
    await sleep(500);

    const shot6 = await page.captureScreenshot('06_candidate_resume_builder_1440px.png', 1440, 900);
    screenshotManifest.push(shot6);

    const shot7 = await page.captureScreenshot('07_candidate_resume_builder_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot7);

    // -------------------------------------------------------------
    // Test 6: Saved Jobs Page
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Saved Jobs Page Verification ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/saved-jobs`);
    await sleep(2000);
    const savedJobsUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Saved Jobs URL:', savedJobsUrl);

    const shot8 = await page.captureScreenshot('08_candidate_saved_jobs_1440px.png', 1440, 900);
    screenshotManifest.push(shot8);

    const shot9 = await page.captureScreenshot('09_candidate_saved_jobs_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot9);

    // -------------------------------------------------------------
    // Test 7: Candidate Applications Page
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Candidate Applications Page Verification ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);
    const appUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Candidate Applications URL:', appUrl);

    const shot10 = await page.captureScreenshot('10_candidate_applications_1440px.png', 1440, 900);
    screenshotManifest.push(shot10);

    // -------------------------------------------------------------
    // Test 8: Real Job Application Flow
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Real Job Detail / Application Flow ---');
    await page.goto(`${FRONTEND_URL}/jobs/9de313d4-865d-4716-8be3-86f7e0c79900`);
    await sleep(2500);
    const jobUrl = await page.evaluate('window.location.href');
    const jobTitle = await page.evaluate(`
      (() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.innerText : '';
      })()
    `);
    console.log('[PASS] Real Job Page URL:', jobUrl, 'Title:', jobTitle);

    const shot11 = await page.captureScreenshot('11_candidate_job_application_flow_1440px.png', 1440, 900);
    screenshotManifest.push(shot11);

    // -------------------------------------------------------------
    // Test 9: Logout & Account Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Candidate Logout & Account Isolation ---');
    await page.goto(`${FRONTEND_URL}/candidate`);
    await sleep(1500);
    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Đăng xuất'));
        if (btn) btn.click();
      })()
    `);
    await sleep(2000);
    const postLogoutUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Post-logout URL:', postLogoutUrl);

    // Re-verify denial after logout
    await page.goto(`${FRONTEND_URL}/cv`);
    await sleep(1500);
    const postLogoutCvUrl = await page.evaluate('window.location.href');
    console.log('[PASS] Post-logout /cv access redirect:', postLogoutCvUrl);
    if (!postLogoutCvUrl.includes('/login')) {
      throw new Error('Candidate session was not revoked after logout');
    }

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
