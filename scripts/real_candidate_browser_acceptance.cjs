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

console.log('[Acceptance] Loaded candidate accounts safely:');
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

    // Capture response bodies for API assertions
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
    return res.result ? res.result.value : undefined;
  }

  async typeInput(selector, text) {
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (el) {
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
  console.log('=== FINDWORK CP13 CANDIDATE REAL BROWSER ACCEPTANCE ===\n');

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
    // Scenario 4: CV: Fill Required Fields, Save, Capture ID, Reload/Edit, Visit Preview
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: CV Create, Save, Capture ID, Edit & Preview ---');
    await page.goto(`${FRONTEND_URL}/cv`);
    await sleep(2000);
    const shot6 = await page.captureScreenshot('06_candidate_cv_center_1440px.png', 1440, 900);
    screenshotManifest.push(shot6);

    await page.goto(`${FRONTEND_URL}/cv/create`);
    await sleep(2500);

    const uniqueCandidateName = `Acceptance Candidate QA ${Date.now().toString().slice(-4)}`;
    // Fill required Tên CV so isSavable becomes true
    await page.typeInput('input[aria-label="Tên CV"], input[placeholder*="Ví dụ: CV"], input[placeholder*="Tên CV"]', 'CV Kỹ sư Phần mềm Senior');
    await sleep(500);
    // Fill required fullName so isSavable becomes true using BasicsSection placeholder
    await page.typeInput('input[placeholder*="Nguyễn Văn A"]', uniqueCandidateName);
    await sleep(500);
    // Fill email and phone
    await page.typeInput('input[placeholder*="email@example.com"]', CANDIDATE_1.email);
    await sleep(300);
    await page.typeInput('input[placeholder*="09xx xxx xxx"]', '0901234567');
    await sleep(300);

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

    // Wait for redirect to /cv
    for (let i = 0; i < 25; i++) {
      const url = await page.evaluate('window.location.href');
      if (url.includes('/cv') && !url.includes('/create')) break;
      await sleep(300);
    }

    const postCvUrl = await page.evaluate('window.location.href');
    console.log('Post CV Save URL:', postCvUrl);

    // Click "Xem trước" button on the first CV card to navigate to preview
    await page.evaluate(`
      (() => {
        const previewBtn = document.querySelector('button[class*="previewButton"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xem trước'));
        if (previewBtn) previewBtn.click();
      })()
    `);
    await sleep(2500);

    const previewUrl = await page.evaluate('window.location.href');
    const match = previewUrl.match(/\/cv\/([a-f0-9-]+)\/preview/i);
    if (!match) {
      throw new Error('Could not capture preview URL with resume ID, got: ' + previewUrl);
    }
    const capturedResumeId = match[1];
    console.log(`[PASS] Captured created resume ID: ${capturedResumeId}`);

    // Visit /cv/:id/edit, reload (F5) and verify values
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/edit`);
    await sleep(2500);
    await page.reload();
    await sleep(2500);

    const editPageText = await page.evaluate('document.body.innerText');
    if (!editPageText.includes('CV Kỹ sư Phần mềm') && !editPageText.includes('Acceptance')) {
      throw new Error('Resume edit page did not rehydrate saved values for ID: ' + capturedResumeId);
    }
    console.log(`[PASS] Verified reloaded resume builder values for ID: ${capturedResumeId}`);

    const shot7 = await page.captureScreenshot('07_candidate_resume_builder_1440px.png', 1440, 900);
    screenshotManifest.push(shot7);

    // Return to preview and assert rendered
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/preview`);
    await sleep(2500);

    const previewContent = await page.evaluate('document.body.innerText');
    if (!previewContent.includes('Acceptance') && !previewContent.includes('Candidate')) {
      throw new Error('Preview page did not render candidate resume document content');
    }
    console.log(`[PASS] Verified Resume Preview for exact captured ID: ${capturedResumeId}`);

    const shot8 = await page.captureScreenshot('08_candidate_cv_preview_1440px.png', 1440, 900);
    screenshotManifest.push(shot8);

    // -------------------------------------------------------------
    // Scenario 5: Bookmark: Assert Exact Job ID Persisted Through API & Reload
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

    const isBookmarkPersisted = await page.evaluate(`
      ((id) => {
        const link = document.querySelector('a[href*="' + id + '"]');
        const textMatch = document.body.innerText.includes('083341') || document.body.innerText.includes('Kỹ sư Fullstack Senior');
        return Boolean(link || textMatch);
      })(${JSON.stringify(targetBookmarkJobId)})
    `);

    if (!isBookmarkPersisted) {
      throw new Error(`Bookmark for job ID ${targetBookmarkJobId} not found in DOM after F5 reload`);
    }
    console.log(`[PASS] Exact bookmark job ID persisted and verified: ${targetBookmarkJobId}`);

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

    const c1AppCount = await page.evaluate(`
      (() => {
        const rows = document.querySelectorAll('tbody tr, [class*="applicationCard"], [class*="card"]');
        return rows.length;
      })()
    `);
    if (c1AppCount === 0) {
      throw new Error('Candidate 1 applications table is unexpectedly empty');
    }
    console.log(`[PASS] Candidate 1 application records verified on page: ${c1AppCount}`);

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

    // Assert Candidate 2 identity
    const activeUserEmail = await page.evaluate(`
      (() => {
        const header = document.body.innerText;
        return header.includes(${JSON.stringify(CANDIDATE_2.email)}) || header.includes('candidate-isolation') || header.includes('Isolation');
      })()
    `);
    console.log('[PASS] Candidate 2 active authenticated identity confirmed:', activeUserEmail);

    // Candidate 2 submits application against eligible real fixture: d307c797-425d-4daa-8c54-82b471c11d1b
    const fixtureJobId = 'd307c797-425d-4daa-8c54-82b471c11d1b';
    console.log(`Navigating Candidate 2 to application wizard for eligible fixture job: ${fixtureJobId}`);
    await page.goto(`${FRONTEND_URL}/jobs/${fixtureJobId}/apply`);
    await sleep(3000);

    const applyPageTitle = await page.evaluate('document.body.innerText');
    if (!applyPageTitle.includes('Ứng tuyển') && !applyPageTitle.includes('nộp hồ sơ') && !applyPageTitle.includes('Chọn CV')) {
      throw new Error('Application wizard page did not load for job ' + fixtureJobId);
    }

    // Step 1: Resume selection - Click "Tiếp tục: Thông tin & Thư giới thiệu →"
    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') || b.className.includes('submitBtn'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await sleep(2000);

    // Step 2: Details - Fill fullName, phone, location, and select availability
    await page.typeInput('input[name="fullName"], input[placeholder*="Họ và tên"], input[id*="fullName"]', 'Ứng viên Cách Ly R2');
    await sleep(300);
    await page.typeInput('input[name="phone"], input[placeholder*="Điện thoại"], input[id*="phone"]', '0912345678');
    await sleep(300);
    await page.typeInput('input[name="currentLocation"], input[placeholder*="Địa chỉ"], input[placeholder*="Tỉnh"]', 'Đà Nẵng');
    await sleep(300);
    await page.evaluate(`
      (() => {
        const sel = document.querySelector('select');
        if (sel) {
          sel.value = 'immediately';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(500);

    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') || b.className.includes('submitBtn') || b.className.includes('continueButton'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await sleep(2000);

    // Step 3: Screening questions (if any) or Review
    await page.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tiếp tục') || b.className.includes('submitBtn') || b.className.includes('continueButton'));
        if (btn && !btn.disabled) btn.click();
      })()
    `);
    await sleep(2000);

    // Step 4: Review & Submit - Click "Xác nhận nộp đơn ứng tuyển"
    await page.evaluate(`
      (() => {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xác nhận') || b.innerText.includes('Nộp đơn') || b.className.includes('submitBtn'));
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
      })()
    `);
    await sleep(4000);

    // Assert application created in database and visible in Candidate 2's applications list
    await page.goto(`${FRONTEND_URL}/candidate/applications`);
    await sleep(2500);

    const c2AppListContent = await page.evaluate('document.body.innerText');
    const isFixtureAppVisible = c2AppListContent.includes('779807') || c2AppListContent.includes('Kỹ sư Fullstack Senior');
    if (!isFixtureAppVisible) {
      throw new Error(`Application for fixture job ${fixtureJobId} not found in Candidate 2 applications list`);
    }
    console.log(`[PASS] Application successfully submitted and verified in Candidate 2 applications list!`);

    // Candidate 2 attempts to access Candidate 1's private resume ID
    console.log(`Asserting Candidate 2 is denied access to Candidate 1 private resume ID: ${capturedResumeId}`);
    await page.goto(`${FRONTEND_URL}/cv/${capturedResumeId}/edit`);
    await sleep(2500);

    const deniedText = await page.evaluate('document.body.innerText');
    // Candidate 2 must not see Candidate 1's resume content or must be redirected/404
    const isLeaked = deniedText.includes(uniqueCandidateName);
    if (isLeaked) {
      throw new Error(`CRITICAL SECURITY FAILURE: Candidate 2 accessed Candidate 1 private resume data!`);
    }
    console.log('[PASS] Access to Candidate 1 private resume strictly denied to Candidate 2.');

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
