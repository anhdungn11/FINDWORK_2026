const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PREVIEW_PORT = 5196;
const CDP_PORT = 9250;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPBrowser {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.reqId = 1;
  }

  async start() {
    const tempDir = path.resolve(process.env.TEMP || 'C:\\Windows\\Temp', `chrome-cdp-cp12b-${Date.now()}`);
    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tempDir}`,
      '--no-first-run',
      '--disable-extensions',
      'about:blank',
    ]);

    await sleep(2500);
    const versionRes = await fetch(`http://127.0.0.1:${this.port}/json/version`);
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
  }

  send(method, params = {}) {
    return this.browser.send(method, params, this.sessionId);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await sleep(2000);
  }

  async evaluate(fnOrExpr) {
    const expr = typeof fnOrExpr === 'function' ? `(${fnOrExpr.toString()})()` : fnOrExpr;
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation error: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async addPreloadScript(source) {
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot Saved] -> ${filePath}`);
  }
}

async function main() {
  console.log('[CP12B] Starting Vite preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
  });

  preview.stdout.on('data', (d) => process.stdout.write(`[Vite] ${d}`));
  preview.stderr.on('data', (d) => process.stderr.write(`[Vite ERR] ${d}`));

  await sleep(3500);

  const browser = new CDPBrowser(CDP_PORT);
  const screenshotDir = path.resolve(__dirname, '../.screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  try {
    await browser.start();
    const page = await browser.createPage();

    console.log('\n--- 1. Testing Desktop 1440px Home ---');
    await page.setViewport(1440, 900);
    await page.goto(`http://localhost:${PREVIEW_PORT}/`);
    await sleep(1500);
    await page.screenshot(path.join(screenshotDir, '01_desktop_home_1440.png'));

    // Test Unauthenticated Admin Route Guard
    console.log('\n--- 2. Testing /admin Route Security Guard ---');
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin`);
    await sleep(1500);
    const currentPath = await page.evaluate(() => window.location.pathname);
    console.log('Path after /admin access (Expected redirect to /):', currentPath);
    await page.screenshot(path.join(screenshotDir, '02_admin_guard_redirect.png'));

    // Inject Admin Auth via preload script
    console.log('\n--- 3. Injecting Mock Admin Auth via addPreloadScript ---');
    const adminAuthState = {
      state: {
        user: {
          id: 'admin-e2e-uuid',
          email: 'superadmin@findwork.vn',
          role: 'ADMIN',
          name: 'Platform Super Admin',
          avatar: null,
        },
        accessToken: 'mock-valid-admin-token',
        status: 'authenticated',
        sessionRole: 'ADMIN',
      },
      version: 0,
    };

    await page.addPreloadScript(`
      try {
        localStorage.setItem('auth_store', JSON.stringify(${JSON.stringify(adminAuthState)}));
        sessionStorage.setItem('auth_token', 'mock-valid-admin-token');
      } catch (e) {
        console.error('Storage injection error', e);
      }
    `);

    console.log('\n--- 4. Navigating to /admin with Admin Session (Desktop 1440px) ---');
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin`);
    await sleep(2500);
    await page.screenshot(path.join(screenshotDir, '03_admin_dashboard_1440.png'));

    // Test Tablet 768px
    console.log('\n--- 5. Testing Tablet 768px Viewport ---');
    await page.setViewport(768, 1024);
    await sleep(1000);
    await page.screenshot(path.join(screenshotDir, '04_admin_dashboard_768.png'));

    // Test Mobile 393px
    console.log('\n--- 6. Testing Mobile 393px Viewport ---');
    await page.setViewport(393, 852);
    await sleep(1000);
    await page.screenshot(path.join(screenshotDir, '05_admin_dashboard_393.png'));

    // Test Admin Companies Page
    console.log('\n--- 7. Testing Admin Companies & Permission Center Page ---');
    await page.setViewport(1440, 900);
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin/companies`);
    await sleep(2000);
    await page.screenshot(path.join(screenshotDir, '06_admin_companies_1440.png'));

    // Test Admin Users Page
    console.log('\n--- 8. Testing Admin Users Management Page ---');
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin/users`);
    await sleep(2000);
    await page.screenshot(path.join(screenshotDir, '07_admin_users_1440.png'));

    // Test Admin Jobs Page
    console.log('\n--- 9. Testing Admin Jobs Moderation Page ---');
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin/jobs`);
    await sleep(2000);
    await page.screenshot(path.join(screenshotDir, '08_admin_jobs_1440.png'));

    // Test Admin System & Audit Page
    console.log('\n--- 10. Testing Admin System & Audit Page ---');
    await page.goto(`http://localhost:${PREVIEW_PORT}/admin/system`);
    await sleep(2000);
    await page.screenshot(path.join(screenshotDir, '09_admin_system_1440.png'));

    // Switch to Employer Session
    console.log('\n--- 11. Testing Employer Dashboard ---');
    const employerAuthState = {
      state: {
        user: {
          id: 'emp-e2e-uuid',
          email: 'hr@techcorp.vn',
          role: 'EMPLOYER',
          name: 'HR Director',
          avatar: null,
        },
        accessToken: 'mock-valid-employer-token',
        status: 'authenticated',
        sessionRole: 'EMPLOYER',
      },
      version: 0,
    };

    await page.addPreloadScript(`
      try {
        localStorage.setItem('auth_store', JSON.stringify(${JSON.stringify(employerAuthState)}));
        localStorage.setItem('company_workspace_active', JSON.stringify({
          id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          name: 'Tập đoàn Công nghệ Sao Khuê',
          slug: 'sao-khue-tech',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          memberRoleNames: ['COMPANY_OWNER'],
          isOwner: true,
        }));
      } catch (e) {
        console.error('Employer storage injection error', e);
      }
    `);

    await page.goto(`http://localhost:${PREVIEW_PORT}/employer`);
    await sleep(2500);
    await page.screenshot(path.join(screenshotDir, '10_employer_dashboard_1440.png'));

    console.log('\n[SUCCESS] All Chrome browser checks completed successfully!');
  } finally {
    await browser.stop();
    preview.kill();
  }
}

main().catch((err) => {
  console.error('[FATAL] Verification failed:', err);
  process.exit(1);
});
