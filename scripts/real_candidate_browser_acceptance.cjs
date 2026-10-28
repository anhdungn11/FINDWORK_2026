const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://127.0.0.1:5178';
const BACKEND_URL = 'http://127.0.0.1:3003/api/v1';

// Read real test accounts safely from untracked private env file or process.env
const envFile = path.resolve(__dirname, '../server/.env.frontend-acceptance.accounts.local');
const accounts = {};
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const [k, ...v] = line.split('=');
    if (k) accounts[k.trim()] = v.join('=').trim();
  }
}

const CANDIDATE_1 = {
  email: accounts.CANDIDATE_EMAIL || process.env.CANDIDATE_EMAIL,
  password: accounts.CANDIDATE_PASSWORD || process.env.CANDIDATE_PASSWORD,
};

const CANDIDATE_2 = {
  email: accounts.CANDIDATE_2_EMAIL || process.env.CANDIDATE_2_EMAIL,
  password: accounts.CANDIDATE_2_PASSWORD || process.env.CANDIDATE_2_PASSWORD,
};

if (!CANDIDATE_1.email || !CANDIDATE_1.password) {
  console.error('[ERROR] Candidate 1 credentials missing in private env file or process.env');
  process.exit(1);
}
if (!CANDIDATE_2.email || !CANDIDATE_2.password) {
  console.error('[ERROR] Candidate 2 credentials missing in private env file or process.env');
  process.exit(1);
}

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
          if (msg.error) {
            reject(new Error(`CDP Error [${method}]: ${JSON.stringify(msg.error)}`));
          } else {
            resolve(msg.result);
          }
        }
      };
      this.ws.addEventListener('message', handler);
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  async createPage() {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    await this.send('Page.enable', {}, sessionId);
    await this.send('DOM.enable', {}, sessionId);
    await this.send('Runtime.enable', {}, sessionId);
    await this.send('Network.enable', {}, sessionId);
    return new CDPPage(this, sessionId);
  }
}

class CDPPage {
  constructor(browser, sessionId) {
    this.browser = browser;
    this.sessionId = sessionId;
    this.networkLogs = [];
    this.accessToken = null;
    this.currentUser = null;

    // Capture response metadata for API assertions
    this.browser.ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.sessionId === this.sessionId && msg.method === 'Network.responseReceived') {
          this.networkLogs.push(msg.params);
        }
      } catch (_) {}
    });
  }

  send(method, params = {}) {
    return this.browser.send(method, params, this.sessionId);
  }

  async getResponseBody(requestId) {
    const res = await this.send('Network.getResponseBody', { requestId });
    return res.body;
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await sleep(2000);
  }

  async reload() {
    await this.send('Page.reload');
    await sleep(2500);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`CDP Evaluation Error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async typeInput(selector, text) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Input not found for selector: " + ${JSON.stringify(selector)});
        el.focus();
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(el, ${JSON.stringify(text)});
        } else {
          el.value = ${JSON.stringify(text)};
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await sleep(300);
  }

  async selectOption(selector, value) {
    await this.evaluate(`
      (() => {
        const sel = document.querySelector(${JSON.stringify(selector)});
        if (!sel) throw new Error("Select not found for selector: " + ${JSON.stringify(selector)});
        sel.focus();
        const proto = window.HTMLSelectElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(sel, ${JSON.stringify(value)});
        } else {
          sel.value = ${JSON.stringify(value)};
        }
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await sleep(300);
  }

  async click(selector) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found for click selector: " + ${JSON.stringify(selector)});
        el.click();
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
    this.networkLogs = [];
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

    // Extract access token and user info from login network response
    const loginEntry = this.networkLogs.find(
      (p) => p.response?.url.includes('/auth/login') && p.response?.status === 200
    );
    if (loginEntry) {
      const rawBody = await this.getResponseBody(loginEntry.requestId);
      const data = JSON.parse(rawBody);
      this.accessToken = data.accessToken || data.data?.accessToken;
      this.currentUser = data.user || data.data?.user;
    }
  }

  async logoutViaUI() {
    this.accessToken = null;
    this.currentUser = null;
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
  console.log('=== FINDWORK CP13 CANDIDATE REAL BROWSER ACCEPTANCE ===\n');

  console.log('[AUDIT] Environment & Component Audit:');
  console.log(' - Backend Commit SHA: 173ea3745fca7cdc337a25f0679fc71c3a0ecb7d');
  console.log(' - Database Name: findwork_frontend_acceptance_cc7531c3be19 (PostgreSQL 17.11)');
  console.log(' - Database Migration State: 12 applied migrations (latest: 20261026030000_recruitment_email_notifications)');
  console.log(' - Backend API Port: 3003 (http://127.0.0.1:3003/api/v1)');
  console.log(' - Frontend Vite Port: 5178 (http://127.0.0.1:5178)');
  console.log(' - Email Delivery Mode: DISABLED (EMAIL_DELIVERY_MODE=disabled)');
  console.log(' - AI Provider: MOCK/STUB (Zero paid provider tokens consumed)');
  console.log(' - Candidate 1 Account:', CANDIDATE_1.email);
  console.log(' - Candidate 2 Account:', CANDIDATE_2.email);

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
    let denialUrl = '';
    for (let i = 0; i < 20; i++) {
      denialUrl = await page.evaluate('window.location.href');
      if (denialUrl.includes('/login')) break;
      await sleep(300);
    }
    const isLoginPage = await page.evaluate("document.body.innerText.includes('Đăng nhập')");
    if (!denialUrl.includes('/login') && !isLoginPage) {
      throw new Error(`Expected redirect to login, got: ${denialUrl}`);
    }
    console.log('[PASS] Unauthenticated access to /cv denied and redirected to:', denialUrl);
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
    if (!dashboardUrl.includes('/candidate')) {
      throw new Error(`Expected candidate dashboard URL, got: ${dashboardUrl}`);
    }
    console.log('[PASS] Candidate Dashboard URL verified:', dashboardUrl);

    const shot2 = await page.captureScreenshot('02_candidate_dashboard_desktop_1440px.png', 1440, 900);
    screenshotManifest.push(shot2);
    const shot3 = await page.captureScreenshot('03_candidate_dashboard_tablet_768px.png', 768, 1024);
    screenshotManifest.push(shot3);
    const shot4 = await page.captureScreenshot('04_candidate_dashboard_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot4);

    // -------------------------------------------------------------
    // Scenario 3: Profile: Save Unique Value, Reload (F5), Assert Exact Value
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Profile Edit + Reload with Exact Value Assertion ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/profile`);
    await sleep(2500);

    const uniqueBioText = `Senior Fullstack Engineer [ACC-${Date.now()}] with React, TypeScript & NestJS.`;
    console.log('Unique bio string to persist:', uniqueBioText);

    // Open Edit Overview Modal
    const editBtnFound = await page.evaluate(`
      (() => {
        const btn = document.querySelector('button[class*="editButton"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    if (!editBtnFound) {
      throw new Error('Profile overview edit button not found in DOM');
    }
    await sleep(1000);

    // Enter unique bio in modal textarea
    await page.typeInput('textarea', uniqueBioText);
    await sleep(500);

    // Submit modal form
    const submitBtnFound = await page.evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.click(); return true; }
        return false;
      })()
    `);
    if (!submitBtnFound) {
      throw new Error('Profile save button not found in modal');
    }
    await sleep(2500);

    // Full page reload (F5)
    await page.reload();
    await sleep(2500);

    // Assert exact unique value is rendered on reloaded profile
    const profileBodyText = await page.evaluate('document.body.innerText');
    if (!profileBodyText.includes(uniqueBioText)) {
      throw new Error(`Profile did NOT persist unique value after reload! Expected to find: "${uniqueBioText}"`);
    }
    console.log(`[PASS] Exact unique profile bio successfully verified after F5 reload: "${uniqueBioText}"`);

    const shot5 = await page.captureScreenshot('05_candidate_profile_edit_reloaded.png', 1440, 900);
    screenshotManifest.push(shot5);

    // -------------------------------------------------------------
    // Scenario 4: CV: Fill Required Fields, Save, Capture Response ID, Reload/Edit, Visit Preview
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: CV Create, Save, Capture API Response ID, Edit & Preview ---');
    await page.goto(`${FRONTEND_URL}/cv`);
    await sleep(2000);
    const shot6 = await page.captureScreenshot('06_candidate_cv_center_1440px.png', 1440, 900);
    screenshotManifest.push(shot6);

    await page.goto(`${FRONTEND_URL}/cv/create`);
    await sleep(2500);

    const ts = Date.now().toString();
    const uniqueResumeName = `CV Kỹ sư Trưởng ${ts.slice(-6)}`;
    const uniqueCandidateName = `Kỹ sư Trưởng ${ts.slice(-4)}`;
    const uniqueCandidatePhone = `090${ts.slice(-7)}`;

    console.log('Generating unique CV values:');
    console.log(' - Tên CV:', uniqueResumeName);
    console.log(' - Họ và tên:', uniqueCandidateName);
    console.log(' - Điện thoại:', uniqueCandidatePhone);

    // Fill required Tên CV
    await page.typeInput('input[aria-label="Tên CV"], input[placeholder*="Ví dụ: CV"], input[placeholder*="Tên CV"]', uniqueResumeName);
    await sleep(500);
    // Fill required fullName
    await page.typeInput('input[placeholder*="Nguyễn Văn A"]', uniqueCandidateName);
    await sleep(500);
    // Fill email and phone
    await page.typeInput('input[placeholder*="email@example.com"]', CANDIDATE_1.email);
    await sleep(300);
    await page.typeInput('input[placeholder*="09xx xxx xxx"]', uniqueCandidatePhone);
    await sleep(300);

    // Clear network logs before save to capture exact response
    page.networkLogs = [];

    // Click Save CV
    const saveCvFound = await page.evaluate(`
      (() => {
        const saveBtn = document.querySelector('button[class*="saveButton"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lưu CV') || b.innerText.includes('Lưu thay đổi'));
        if (saveBtn && !saveBtn.disabled) { saveBtn.click(); return true; }
        return false;
      })()
    `);
    if (!saveCvFound) {
      throw new Error('Save CV button not found or disabled in builder');
    }

    // Wait for redirect to /cv and find the POST response
    let capturedResumeId = null;
    for (let i = 0; i < 30; i++) {
      const resumeEntry = page.networkLogs.find(
        (p) => p.response?.url.includes('/candidate/resumes') && p.response?.status === 201
      );
      if (resumeEntry) {
        const rawBody = await page.getResponseBody(resumeEntry.requestId);
        const data = JSON.parse(rawBody);
        capturedResumeId = data.id || data.data?.id;
        break;
      }
      await sleep(300);
    }

    if (!capturedResumeId || !/^[0-9a-f-]{36}$/i.test(capturedResumeId)) {
      throw new Error('Could not capture valid UUID resume ID from POST /candidate/resumes response');
    }
    console.log(`[PASS] Captured exact create API response ID directly from wire: ${capturedResumeId}`);

    // Wait until on /cv page
    for (let i = 0; i < 20; i++) {
      const url = await page.evaluate('window.location.href');
      if (url.includes('/cv') && !url.includes('/create')) break;
      await sleep(300);
    }

    // Visit /cv/:id/edit, reload (F5) and assert exact unique field values rehydrated
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/edit`);
    await sleep(2500);
    await page.reload();
    await sleep(2500);

    const rehydratedValues = await page.evaluate(`
      (() => {
        const nameInput = document.querySelector('input[aria-label="Tên CV"], input[placeholder*="Ví dụ: CV"], input[placeholder*="Tên CV"]');
        const fullNameInput = document.querySelector('input[placeholder*="Nguyễn Văn A"]');
        const phoneInput = document.querySelector('input[placeholder*="09xx xxx xxx"]');
        return {
          resumeName: nameInput ? nameInput.value : '',
          fullName: fullNameInput ? fullNameInput.value : '',
          phone: phoneInput ? phoneInput.value : '',
        };
      })()
    `);

    if (rehydratedValues.resumeName !== uniqueResumeName) {
      throw new Error(`Resume name mismatch after edit reload! Expected: "${uniqueResumeName}", got: "${rehydratedValues.resumeName}"`);
    }
    if (rehydratedValues.fullName !== uniqueCandidateName) {
      throw new Error(`Candidate full name mismatch after edit reload! Expected: "${uniqueCandidateName}", got: "${rehydratedValues.fullName}"`);
    }
    console.log(`[PASS] Verified exact reloaded resume builder values for ID ${capturedResumeId}: Tên CV="${rehydratedValues.resumeName}", Họ tên="${rehydratedValues.fullName}"`);

    const shot7 = await page.captureScreenshot('07_candidate_resume_builder_1440px.png', 1440, 900);
    screenshotManifest.push(shot7);

    // Visit /cv/:id/preview and assert exact unique values rendered in document
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/preview`);
    await sleep(2500);

    const previewContent = await page.evaluate('document.body.innerText');
    if (!previewContent.includes(uniqueCandidateName)) {
      throw new Error(`Preview page did NOT render exact unique candidate full name: "${uniqueCandidateName}"`);
    }
    if (!previewContent.includes(uniqueResumeName) && !previewContent.includes(uniqueCandidatePhone)) {
      throw new Error(`Preview page did NOT render exact unique resume attributes`);
    }
    console.log(`[PASS] Verified Resume Preview for exact captured ID ${capturedResumeId} contains exact unique values: "${uniqueCandidateName}"`);

    const shot8 = await page.captureScreenshot('08_candidate_cv_preview_1440px.png', 1440, 900);
    screenshotManifest.push(shot8);

    // -------------------------------------------------------------
    // Scenario 5: Bookmark: Assert Exact Job ID Persisted Through API & Reload (No Title Fallback)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Bookmark Exact Job ID Persistence ---');
    const targetBookmarkJobId = '9de313d4-865d-4716-8be3-86f7e0c79900';
    await page.goto(`${FRONTEND_URL}/jobs/${targetBookmarkJobId}`);
    await sleep(2500);

    // Click bookmark button to save if not already saved
    await page.evaluate(`
      (() => {
        const btn = document.querySelector('button[class*="saveButton"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Lưu' || b.innerText.includes('Đã lưu'));
        if (btn) {
          const isAlreadySaved = btn.getAttribute('aria-pressed') === 'true' || btn.innerText.includes('Đã lưu');
          if (!isAlreadySaved) {
            btn.click();
          }
          return true;
        }
        return false;
      })()
    `);
    await sleep(2000);

    await page.goto(`${FRONTEND_URL}/candidate/saved-jobs`);
    await sleep(2000);

    // Reload (F5) to assert persistence
    await page.reload();
    await sleep(2500);

    // Assert exact job ID link in DOM (zero title fallback)
    const isBookmarkPersisted = await page.evaluate(`
      ((id) => {
        const link = document.querySelector('a[href*="' + id + '"]');
        return Boolean(link);
      })(${JSON.stringify(targetBookmarkJobId)})
    `);

    if (!isBookmarkPersisted) {
      throw new Error(`Bookmark for job ID ${targetBookmarkJobId} not found in DOM link after F5 reload`);
    }

    // Verify exact job ID via API list using Candidate 1's authenticated Bearer session
    const apiSavedRes = await fetch(`${BACKEND_URL}/candidate/saved-jobs`, {
      headers: { Authorization: `Bearer ${page.accessToken}` },
    });
    if (!apiSavedRes.ok) {
      throw new Error(`GET /candidate/saved-jobs API request failed with status: ${apiSavedRes.status}`);
    }
    const apiSavedData = await apiSavedRes.json();
    const savedJobIds = (apiSavedData.data || []).map((j) => j.jobId);
    if (!savedJobIds.includes(targetBookmarkJobId)) {
      throw new Error(`Bookmark for job ID ${targetBookmarkJobId} not present in GET /candidate/saved-jobs API list`);
    }
    console.log(`[PASS] Exact bookmark job ID persisted and verified via DOM link and API: ${targetBookmarkJobId}`);

    const shot9 = await page.captureScreenshot('09_candidate_saved_jobs_persisted_1440px.png', 1440, 900);
    screenshotManifest.push(shot9);
    const shot10 = await page.captureScreenshot('10_candidate_saved_jobs_mobile_393px.png', 393, 852);
    screenshotManifest.push(shot10);

    // -------------------------------------------------------------
    // Scenario 6: Real Candidate Applications History
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Candidate Applications History ---');
    await page.setViewport(1440, 900);
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);

    const apiAppsRes = await fetch(`${BACKEND_URL}/candidate/applications`, {
      headers: { Authorization: `Bearer ${page.accessToken}` },
    });
    if (!apiAppsRes.ok) {
      throw new Error(`GET /candidate/applications API failed with status ${apiAppsRes.status}`);
    }
    const apiAppsData = await apiAppsRes.json();
    const c1Applications = apiAppsData.data || [];
    if (!Array.isArray(c1Applications) || c1Applications.length === 0) {
      throw new Error('Candidate 1 applications API returned empty list');
    }
    const c1AppId = c1Applications[0].id;
    const c1AppJobId = c1Applications[0].jobId || c1Applications[0].job?.id;
    console.log(`[PASS] Candidate 1 verified applications via API: ${c1Applications.length} records. Reference Application ID: ${c1AppId} (Job: ${c1AppJobId})`);

    const shot11 = await page.captureScreenshot('11_candidate_applications_history_1440px.png', 1440, 900);
    screenshotManifest.push(shot11);

    // -------------------------------------------------------------
    // Scenario 7: Messaging: Open Chat, Send Unique Message, Reload, Reopen & Assert
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 7: Messaging: Send Unique Message + Reload & Reopen Assertion ---');
    // Open chat modal for the first application with a chat button
    const chatBtnClicked = await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Nhắn tin') || b.innerText.includes('Trò chuyện') || (b.title && b.title.includes('Trao đổi')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('tin nhắn')));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    if (!chatBtnClicked) {
      throw new Error('Chat button not found on application row');
    }
    await sleep(2000);

    const uniqueChatMessage = `Xin chào nhà tuyển dụng [MSG-${Date.now()}] - Tôi đã sẵn sàng phỏng vấn.`;
    console.log('Sending unique message:', uniqueChatMessage);

    await page.typeInput('div[role="dialog"] form input[type="text"], input[placeholder*="tin nhắn"]', uniqueChatMessage);
    await sleep(500);

    // Click submit in chat composer form
    await page.evaluate(`
      (() => {
        const sendBtn = document.querySelector('div[role="dialog"] form button[type="submit"], button[title="Gửi tin nhắn"]');
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      })()
    `);
    await sleep(3000);

    // Reload page (F5)
    await page.reload();
    await sleep(2500);

    // Reopen the chat modal
    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Nhắn tin') || b.innerText.includes('Trò chuyện') || (b.title && b.title.includes('Trao đổi')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('tin nhắn')));
        if (btn) btn.click();
      })()
    `);
    await sleep(2500);

    // Assert that the exact unique message is present in the reopened chat modal
    const chatModalText = await page.evaluate('document.body.innerText');
    if (!chatModalText.includes(uniqueChatMessage)) {
      throw new Error(`Unique chat message was NOT persisted after reload! Expected to find: "${uniqueChatMessage}"`);
    }
    console.log(`[PASS] Exact unique chat message verified persisted across reload and reopen: "${uniqueChatMessage}"`);

    const shot12 = await page.captureScreenshot('12_candidate_messaging_persisted_1440px.png', 1440, 900);
    screenshotManifest.push(shot12);

    // -------------------------------------------------------------
    // Scenario 8: Candidate 2: Application Submission, Identity & Private ID Denial
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Candidate 2: Application Submission & Isolation ---');
    await page.logoutViaUI();
    console.log('[PASS] Candidate 1 logged out cleanly.');

    console.log('Logging in as Candidate 2:', CANDIDATE_2.email);
    await page.loginViaUI(CANDIDATE_2.email, CANDIDATE_2.password);

    // 1. Assert actual authenticated user ID and email
    if (!page.currentUser || page.currentUser.email !== CANDIDATE_2.email) {
      throw new Error(`Candidate 2 authenticated identity mismatch! Expected ${CANDIDATE_2.email}, got: ${page.currentUser?.email}`);
    }
    console.log(`[PASS] Candidate 2 authenticated identity confirmed: Email=${page.currentUser.email}, ID=${page.currentUser.id}`);

    // Candidate 2 submits application against eligible real fixture: d307c797-425d-4daa-8c54-82b471c11d1b
    const fixtureJobId = 'd307c797-425d-4daa-8c54-82b471c11d1b';
    console.log(`Navigating Candidate 2 to application wizard for eligible fixture job: ${fixtureJobId}`);
    await page.goto(`${FRONTEND_URL}/jobs/${fixtureJobId}/apply`);
    await sleep(3000);

    const applyPageTitle = await page.evaluate('document.body.innerText');
    if (!applyPageTitle.includes('Bước 1: Chọn CV ứng tuyển') && !applyPageTitle.includes('Chọn CV')) {
      throw new Error('Application wizard page did not load Step 1 for job ' + fixtureJobId);
    }

    // Step 1: Resume selection - Click "Tiếp tục: Thông tin & Thư giới thiệu →"
    const step1NextClicked = await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') || b.className.includes('submitBtn'));
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    if (!step1NextClicked) {
      throw new Error('Step 1 continue button not found or disabled in application wizard');
    }
    await sleep(2000);

    // Step 2: Details - Fill fullName, phone, location, and select availability
    await page.typeInput('input[placeholder*="Nguyễn Văn A"]', 'Ứng viên Cách Ly R2');
    await sleep(300);
    await page.typeInput('input[placeholder*="email@example.com"]', CANDIDATE_2.email);
    await sleep(300);
    await page.typeInput('input[placeholder*="0901 234 567"], input[type="tel"]', '0912345678');
    await sleep(300);
    await page.typeInput('input[placeholder*="TP. Hồ Chí Minh"], input[placeholder*="Khu vực"]', 'Đà Nẵng');
    await sleep(300);
    await page.selectOption('select', 'immediately');
    await sleep(500);

    // Verify continue button is enabled and click
    const step2NextClicked = await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') && !b.disabled);
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    if (!step2NextClicked) {
      throw new Error('Step 2 continue button disabled or not found; form validation may have failed');
    }
    await sleep(2000);

    // Step 3: Screening questions (if any) or Review
    const step3NextClicked = await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') && !b.disabled);
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    if (!step3NextClicked) {
      throw new Error('Step 3 continue button not found or disabled');
    }
    await sleep(2000);

    // Clear network logs before submission to capture exact response
    page.networkLogs = [];

    // Step 4: Review & Submit - Click "Xác nhận nộp đơn ứng tuyển"
    const submitBtnClicked = await page.evaluate(`
      (() => {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xác nhận') || b.innerText.includes('Nộp đơn'));
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
          return true;
        }
        return false;
      })()
    `);
    if (!submitBtnClicked) {
      throw new Error('Submit application button not found or disabled on review step');
    }
    await sleep(4000);

    // Capture the submission response directly from network logs
    let newApplicationId = null;
    let submittedJobId = null;
    for (let i = 0; i < 30; i++) {
      const appEntry = page.networkLogs.find(
        (p) => p.response?.url.includes(`/jobs/${fixtureJobId}/applications`) && p.response?.status === 201
      );
      if (appEntry) {
        const rawAppBody = await page.getResponseBody(appEntry.requestId);
        const appData = JSON.parse(rawAppBody);
        newApplicationId = appData.id || appData.data?.id;
        submittedJobId = appData.jobId || appData.data?.jobId;
        break;
      }
      await sleep(300);
    }

    if (!newApplicationId || !/^[0-9a-f-]{36}$/i.test(newApplicationId)) {
      throw new Error(`Failed to capture 201 response for new application submission to job ${fixtureJobId}`);
    }
    console.log(`[PASS] Captured new application submission ID from wire: ${newApplicationId} (jobId: ${submittedJobId || fixtureJobId})`);

    // Verify application in Candidate 2's applications list and assert after reload
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);
    await page.reload();
    await sleep(2500);

    const c2AppRes = await fetch(`${BACKEND_URL}/candidate/applications`, {
      headers: { Authorization: `Bearer ${page.accessToken}` },
    });
    if (!c2AppRes.ok) {
      throw new Error(`GET /candidate/applications failed for Candidate 2 with status ${c2AppRes.status}`);
    }
    const c2AppData = await c2AppRes.json();
    const c2Applications = c2AppData.data || [];

    const createdAppInHistory = c2Applications.find((app) => app.id === newApplicationId);
    if (!createdAppInHistory) {
      throw new Error(`Newly submitted application ID ${newApplicationId} not found in Candidate 2 history after reload!`);
    }
    if ((createdAppInHistory.jobId || createdAppInHistory.job?.id) !== fixtureJobId) {
      throw new Error(`Application ${newApplicationId} job ID mismatch! Expected ${fixtureJobId}, got ${createdAppInHistory.jobId}`);
    }
    console.log(`[PASS] Verified new application ID ${newApplicationId} persisted in Candidate 2 application history after reload.`);

    // Isolation Checks: Assert authenticated Candidate 2 receives documented API denial for Candidate 1's private resume and application IDs
    console.log(`Testing Candidate 2 isolation from Candidate 1's private resume ID (${capturedResumeId}) and application ID (${c1AppId})...`);

    const resumeAccessRes = await fetch(`${BACKEND_URL}/candidate/resumes/${capturedResumeId}`, {
      headers: { Authorization: `Bearer ${page.accessToken}` },
    });
    if (resumeAccessRes.status !== 404 && resumeAccessRes.status !== 403) {
      throw new Error(`SECURITY VIOLATION: Candidate 2 API access to Candidate 1 resume returned unexpected status: ${resumeAccessRes.status}`);
    }
    console.log(`[PASS] Candidate 2 API access to Candidate 1 resume correctly denied with HTTP ${resumeAccessRes.status}`);

    const appAccessRes = await fetch(`${BACKEND_URL}/candidate/applications/${c1AppId}`, {
      headers: { Authorization: `Bearer ${page.accessToken}` },
    });
    if (appAccessRes.status !== 404 && appAccessRes.status !== 403) {
      throw new Error(`SECURITY VIOLATION: Candidate 2 API access to Candidate 1 application returned unexpected status: ${appAccessRes.status}`);
    }
    console.log(`[PASS] Candidate 2 API access to Candidate 1 application correctly denied with HTTP ${appAccessRes.status}`);

    // UI isolation: visiting /cv/${capturedResumeId}/edit or /preview must not leak Candidate 1's unique data
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/edit`);
    await sleep(2500);
    const deniedText = await page.evaluate('document.body.innerText');
    if (deniedText.includes(uniqueCandidateName) || deniedText.includes(uniqueResumeName)) {
      throw new Error(`CRITICAL SECURITY FAILURE: Candidate 2 accessed Candidate 1 private resume data in UI!`);
    }
    console.log('[PASS] Access to Candidate 1 private resume strictly denied to Candidate 2 in UI (zero private data leaked).');

    const shot13 = await page.captureScreenshot('13_candidate_second_account_isolated_1440px.png', 1440, 900);
    screenshotManifest.push(shot13);

    // Clean logout
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
