import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const USER_DATA = path.join(process.env.TEMP || "C:\\temp", `chrome_debug_cand_${Date.now()}`);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Launching headless Chrome on port", PORT);
  const chrome = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${USER_DATA}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let target = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page) {
          target = page;
          break;
        }
      }
    } catch {
      await sleep(200);
    }
  }

  if (!target) {
    console.error("Failed to connect to Chrome target page");
    chrome.kill();
    process.exit(1);
  }

  console.log("Connected to Chrome target:", target.id);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let messageId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));
  console.log("WebSocket connected to target");

  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");

  const evidenceDir = path.join(process.cwd(), "docs", "evidence", "candidate");
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  async function takeScreenshot(fileName, width = 1440, height = 900) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500,
    });
    await sleep(600);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const targetPath = path.join(evidenceDir, fileName);
    fs.writeFileSync(targetPath, Buffer.from(shot.data, "base64"));
    console.log(`Saved screenshot: ${fileName} (${Math.round(shot.data.length / 1024)} KB)`);
  }

  // 1. Unauthenticated Route Denial
  console.log("1. Testing unauthenticated access to /cv...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/cv" });
  await sleep(1500);
  const currentUrl = await send("Runtime.evaluate", { expression: "window.location.href" });
  console.log("Unauthenticated redirect URL:", currentUrl.result.value);
  await takeScreenshot("01_unauthenticated_candidate_denial.png", 1440, 900);

  // 2. Setup Authenticated Candidate Session with Mock CV & Saved Jobs
  const mockCandidateSetup = `
    const candidateUser = {
      id: 'cand-001',
      email: 'candidate@findwork.vn',
      fullName: 'Nguyễn Văn Ứng Viên',
      role: 'CANDIDATE',
      accountType: 'CANDIDATE'
    };

    // Candidate Auth state in zustand authStore
    window.sessionStorage.setItem('findwork.mock.builder-resumes.v7.cand-001', JSON.stringify([
      {
        id: 'cv-cand-001',
        name: 'CV Chuyên viên Frontend ReactJS',
        sourceType: 'builder',
        isDefault: true,
        status: 'ready',
        currentVersion: {
          id: 'v1',
          versionNumber: 1,
          templateCode: 'modern',
          builderContent: {
            fullName: 'Nguyễn Văn Ứng Viên',
            professionalTitle: 'Senior Frontend Developer',
            email: 'candidate@findwork.vn',
            phone: '0909123456',
            location: 'TP. Hồ Chí Minh',
            links: [{ id: 'l1', label: 'GitHub', url: 'https://github.com/candidate' }],
            summary: 'Kỹ sư phần mềm hơn 4 năm kinh nghiệm phát triển Web Application với React, TypeScript và NextJS.',
            experience: [
              {
                id: 'exp1',
                company: 'VNG Corporation',
                position: 'Senior Frontend Developer',
                startDate: '2022-01',
                isCurrent: true,
                highlights: ['Phát triển hệ thống Design System phục vụ 2M+ người dùng.', 'Tối ưu Core Web Vitals đạt 95+ score.']
              }
            ],
            education: [
              {
                id: 'edu1',
                school: 'Đại học Bách Khoa TP.HCM',
                degree: 'Kỹ sư Khoa học Máy tính',
                startYear: '2016',
                endYear: '2020',
                gpa: '3.6/4.0'
              }
            ],
            skills: [
              { id: 's1', name: 'Frontend', skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'TailwindCSS'] },
              { id: 's2', name: 'Testing & Tools', skills: ['Vitest', 'Playwright', 'Git', 'Vite', 'Docker'] }
            ],
            languages: [{ id: 'lang1', name: 'Tiếng Anh', level: 'IELTS 7.5' }],
            certifications: [],
            projects: [],
            awards: [],
            activities: [],
            volunteering: [],
            references: [],
            customSections: []
          },
          builderSettings: {
            fontFamily: 'sans',
            density: 'balanced',
            accentColor: 'navy',
            showPhoto: false,
            industryPreset: 'technical',
            sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
            hiddenSections: []
          },
          createdAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]));

    // Saved Jobs in localStorage
    window.localStorage.setItem('findwork_saved_jobs_cand-001', JSON.stringify([
      {
        id: 'mock-1',
        title: 'Senior Frontend Engineer (React/TypeScript)',
        company: 'VNG Corporation',
        location: 'TP. Hồ Chí Minh',
        salary: '35 - 50 triệu',
        isAvailable: true,
        isMock: true,
        savedAt: new Date().toISOString()
      },
      {
        id: 'mock-2',
        title: 'Fullstack Tech Lead (NodeJS / Next.js)',
        company: 'FPT Software',
        location: 'Hà Nội',
        salary: '45 - 65 triệu',
        isAvailable: true,
        isMock: true,
        savedAt: new Date().toISOString()
      }
    ]));

    // Mock API requests for Candidate Profile & Applications
    const origFetch = window.fetch;
    window.fetch = async function(url, opts) {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return new Response(JSON.stringify(candidateUser), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/candidate/profile') || urlStr.includes('/candidate/bootstrap')) {
        return new Response(JSON.stringify({
          profile: {
            state: 'exists',
            data: {
              fullName: 'Nguyễn Văn Ứng Viên',
              headline: 'Senior Frontend Engineer',
              location: 'TP. Hồ Chí Minh'
            }
          },
          draft: { state: 'exists' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/candidate/applications')) {
        return new Response(JSON.stringify({
          data: [
            {
              id: 'app-001',
              jobId: 'mock-1',
              status: 'REVIEWING',
              submittedAt: new Date().toISOString(),
              job: {
                id: 'mock-1',
                title: 'Senior Frontend Engineer (React/TypeScript)',
                company: { name: 'VNG Corporation' },
                location: 'TP. Hồ Chí Minh'
              }
            }
          ],
          pagination: { total: 1, page: 1, pageSize: 20 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return origFetch.apply(this, arguments);
    };

    // Inject zustand store auth
    window.__FINDWORK_TEST_AUTH__ = {
      user: candidateUser,
      accessToken: 'test-cand-token-jwt'
    };
  `;

  await send("Page.addScriptToEvaluateOnNewDocument", { source: mockCandidateSetup });
  await send("Runtime.evaluate", { expression: mockCandidateSetup });

  // 2. Candidate Dashboard
  console.log("2. Navigating to Candidate Dashboard...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/candidate" });
  await sleep(2500);

  // Authenticate the zustand authStore directly in browser runtime
  await send("Runtime.evaluate", {
    expression: `
      if (window.__FINDWORK_AUTH_STORE__) {
        window.__FINDWORK_AUTH_STORE__.getState().setAuth(
          { id: 'cand-001', email: 'candidate@findwork.vn', fullName: 'Nguyễn Văn Ứng Viên', role: 'CANDIDATE', accountType: 'CANDIDATE' },
          'token-jwt-cand'
        );
      }
    `
  });
  await sleep(1000);

  console.log("Capturing Candidate Dashboard viewports...");
  await takeScreenshot("02_candidate_dashboard_desktop_1440px.png", 1440, 900);
  await takeScreenshot("03_candidate_dashboard_tablet_768px.png", 768, 1024);
  await takeScreenshot("04_candidate_dashboard_mobile_393px.png", 393, 852);

  // 3. CV Center
  console.log("3. Navigating to CV Center (/cv)...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/cv" });
  await sleep(2000);
  await takeScreenshot("05_candidate_cv_center_1440px.png", 1440, 900);

  // 4. Resume Builder Editor
  console.log("4. Navigating to Resume Builder (/cv/create)...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/cv/create" });
  await sleep(2000);
  await takeScreenshot("06_candidate_resume_builder_1440px.png", 1440, 900);
  await takeScreenshot("07_candidate_resume_builder_mobile_393px.png", 393, 852);

  // 5. Saved Jobs Page
  console.log("5. Navigating to Candidate Saved Jobs (/candidate/saved-jobs)...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/candidate/saved-jobs" });
  await sleep(2000);
  await takeScreenshot("08_candidate_saved_jobs_1440px.png", 1440, 900);
  await takeScreenshot("09_candidate_saved_jobs_mobile_393px.png", 393, 852);

  // 6. Candidate Applications History & Tracking
  console.log("6. Navigating to Applications History (/candidate/applications)...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/candidate/applications" });
  await sleep(2000);
  await takeScreenshot("10_candidate_applications_1440px.png", 1440, 900);

  // 7. Job Application Flow
  console.log("7. Navigating to Job Application Wizard (/jobs/mock-1/apply?fixture=demo)...");
  await send("Page.navigate", { url: "http://127.0.0.1:5178/jobs/mock-1/apply?fixture=demo" });
  await sleep(2000);
  await takeScreenshot("11_candidate_job_application_flow_1440px.png", 1440, 900);

  ws.close();
  chrome.kill();
  console.log("Candidate Browser Evidence captured successfully!");
}

run().catch((err) => {
  console.error("Candidate acceptance error:", err);
  process.exit(1);
});
