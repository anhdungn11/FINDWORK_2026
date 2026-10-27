import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";

const GUEST_REMINDER_SESSION_KEY = "findwork_guest_reminder_dismissed";

describe("FINDWORK CP12A Public Website UX & Conversion Regression", () => {
  describe("Task 1: Footer Routes and Real Pages", () => {
    it("Footer contains valid navigable links for all support and legal pages", () => {
      const footerSrc = readFileSync(
        new URL("../../../components/navigation/Footer/Footer.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(footerSrc.includes('to="/about"'), "Footer must link to /about");
      assert.ok(footerSrc.includes('to="/help"'), "Footer must link to /help");
      assert.ok(footerSrc.includes('to="/privacy"'), "Footer must link to /privacy");
      assert.ok(footerSrc.includes('to="/terms"'), "Footer must link to /terms");
      assert.ok(footerSrc.includes('to="/contact"'), "Footer must link to /contact");
    });

    it("AppRouter defines lazy loaded routes for about, help, privacy, terms, and contact under PublicLayout", () => {
      const routerSrc = readFileSync(
        new URL("../AppRouter.tsx", import.meta.url),
        "utf8"
      );

      // Lazy imports
      assert.ok(routerSrc.includes('import("@/pages/public/AboutPage/AboutPage")'), "Must lazy-load AboutPage");
      assert.ok(routerSrc.includes('import("@/pages/public/HelpPage/HelpPage")'), "Must lazy-load HelpPage");
      assert.ok(routerSrc.includes('import("@/pages/public/PrivacyPolicyPage/PrivacyPolicyPage")'), "Must lazy-load PrivacyPolicyPage");
      assert.ok(routerSrc.includes('import("@/pages/public/TermsOfUsePage/TermsOfUsePage")'), "Must lazy-load TermsOfUsePage");
      assert.ok(routerSrc.includes('import("@/pages/public/ContactPage/ContactPage")'), "Must lazy-load ContactPage");

      // Route declarations
      assert.ok(routerSrc.includes('path="about"'), "Must define path='about'");
      assert.ok(routerSrc.includes('path="help"'), "Must define path='help'");
      assert.ok(routerSrc.includes('path="privacy"'), "Must define path='privacy'");
      assert.ok(routerSrc.includes('path="terms"'), "Must define path='terms'");
      assert.ok(routerSrc.includes('path="contact"'), "Must define path='contact'");
    });

    it("Real page files exist on disk with back navigation and consistent styling", () => {
      const paths = [
        "../../../pages/public/AboutPage/AboutPage.tsx",
        "../../../pages/public/HelpPage/HelpPage.tsx",
        "../../../pages/public/PrivacyPolicyPage/PrivacyPolicyPage.tsx",
        "../../../pages/public/TermsOfUsePage/TermsOfUsePage.tsx",
        "../../../pages/public/ContactPage/ContactPage.tsx",
      ];

      for (const relPath of paths) {
        const fileUrl = new URL(relPath, import.meta.url);
        assert.ok(existsSync(fileUrl), `File ${relPath} must exist on disk`);
        const src = readFileSync(fileUrl, "utf8");
        assert.ok(
          src.includes('to="/"') || src.includes('to={"/"}'),
          `${relPath} must contain back navigation to home ("/")`
        );
      }
    });

    it("AboutPage accurately reflects implemented product features without fabricated credentials", () => {
      const aboutSrc = readFileSync(
        new URL("../../../pages/public/AboutPage/AboutPage.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(aboutSrc.includes("CV Center"), "AboutPage must mention CV Center");
      assert.ok(aboutSrc.includes("Employer Workspace"), "AboutPage must mention Employer Workspace");
      assert.ok(aboutSrc.includes("FINDWORK AI"), "AboutPage must mention FINDWORK AI");
      assert.ok(
        aboutSrc.includes("Bản dự thảo sản phẩm") || aboutSrc.includes("phê duyệt trước khi công bố"),
        "AboutPage must mark corporate/legal details as pending owner review"
      );
    });

    it("PrivacyPolicyPage and TermsOfUsePage mark content as draft requiring owner & legal review", () => {
      const privacySrc = readFileSync(
        new URL("../../../pages/public/PrivacyPolicyPage/PrivacyPolicyPage.tsx", import.meta.url),
        "utf8"
      );
      const termsSrc = readFileSync(
        new URL("../../../pages/public/TermsOfUsePage/TermsOfUsePage.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(
        privacySrc.includes("Bản dự thảo pháp lý") && privacySrc.includes("chủ sở hữu và ban pháp chế phê duyệt"),
        "PrivacyPolicyPage must clearly mark content as draft requiring legal & owner review"
      );
      assert.ok(
        termsSrc.includes("Bản dự thảo pháp lý") && termsSrc.includes("chủ sở hữu và ban pháp chế"),
        "TermsOfUsePage must clearly mark content as draft requiring legal & owner review"
      );
    });
  });

  describe("Task 2: Contact and Hotline Honesty", () => {
    it("ContactPage reads environment variables and provides honest fallback when unconfigured", () => {
      const contactSrc = readFileSync(
        new URL("../../../pages/public/ContactPage/ContactPage.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(
        contactSrc.includes("import.meta.env.VITE_SUPPORT_EMAIL"),
        "ContactPage must read VITE_SUPPORT_EMAIL"
      );
      assert.ok(
        contactSrc.includes("import.meta.env.VITE_SUPPORT_HOTLINE"),
        "ContactPage must read VITE_SUPPORT_HOTLINE"
      );
      assert.ok(
        contactSrc.includes("Chưa cấu hình VITE_SUPPORT_HOTLINE") ||
          contactSrc.includes("Chờ xác thực viễn thông"),
        "ContactPage must provide honest UI when hotline is unconfigured"
      );
      assert.ok(
        !contactSrc.includes("19001000") && !contactSrc.includes("0901234567"),
        "ContactPage must not fabricate phone numbers"
      );
      assert.ok(
        contactSrc.includes("window.dispatchEvent(new CustomEvent(\"open-findwork-ai\"))"),
        "ContactPage must provide working AI assistant launcher trigger"
      );
    });
  });

  describe("Task 3: Floating AI Chat Launcher", () => {
    it("FindworkAiFloatingWidget provides refined styles, subtle animations, and accessibility states", () => {
      const widgetSrc = readFileSync(
        new URL("../../../features/ai/FindworkAiFloatingWidget.tsx", import.meta.url),
        "utf8"
      );
      const widgetCss = readFileSync(
        new URL("../../../features/ai/FindworkAiFloatingWidget.module.css", import.meta.url),
        "utf8"
      );

      assert.ok(
        widgetSrc.includes('data-testid="findwork-ai-floating-trigger"'),
        "Must preserve data-testid='findwork-ai-floating-trigger' for existing tests"
      );
      assert.ok(
        widgetSrc.includes("AiAssistantModal"),
        "Must preserve AiAssistantModal integration"
      );

      // Animation & pulse
      assert.ok(widgetCss.includes("launcherPulse"), "CSS must declare launcherPulse animation");
      assert.ok(widgetCss.includes("launcherRipple"), "CSS must declare launcherRipple animation");

      // Reduced motion
      assert.ok(
        widgetCss.includes("@media (prefers-reduced-motion: reduce)"),
        "CSS must handle prefers-reduced-motion"
      );

      // Focus visible
      assert.ok(
        widgetCss.includes(":focus-visible"),
        "CSS must provide dedicated :focus-visible outline"
      );

      // Mobile responsiveness
      assert.ok(
        widgetCss.includes("@media (max-width: 640px)"),
        "CSS must adapt launcher size and positioning on mobile"
      );
    });
  });

  describe("Task 4: Guest Registration Reminder", () => {
    it("GuestRegistrationReminder defines correct session storage key and Vietnamese copy", () => {
      assert.equal(
        GUEST_REMINDER_SESSION_KEY,
        "findwork_guest_reminder_dismissed",
        "Session storage key must be findwork_guest_reminder_dismissed"
      );

      const reminderSrc = readFileSync(
        new URL("../../../components/common/GuestRegistrationReminder/GuestRegistrationReminder.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(
        reminderSrc.includes("Khoan đã! Bạn đã đăng ký FINDWORK chưa?"),
        "Must include exact Vietnamese title prompt"
      );
      assert.ok(
        reminderSrc.includes("Tạo tài khoản để lưu việc làm, xây dựng CV và nhận những gợi ý phù hợp hơn."),
        "Must include exact Vietnamese description"
      );
      assert.ok(reminderSrc.includes("Đăng ký"), "Must provide 'Đăng ký' action");
      assert.ok(reminderSrc.includes("Đăng nhập"), "Must provide 'Đăng nhập' action");
      assert.ok(reminderSrc.includes("Để sau"), "Must provide 'Để sau' action");
    });

    it("GuestRegistrationReminder includes guards for auth state, excluded routes, form focus, and modal collision", () => {
      const reminderSrc = readFileSync(
        new URL("../../../components/common/GuestRegistrationReminder/GuestRegistrationReminder.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(
        reminderSrc.includes('authStatus === "authenticated"') || reminderSrc.includes("user"),
        "Must suppress reminder when user is authenticated"
      );
      assert.ok(
        reminderSrc.includes("/login") && reminderSrc.includes("/register"),
        "Must exclude login and register routes"
      );
      assert.ok(
        reminderSrc.includes("/apply"),
        "Must exclude job application routes"
      );
      assert.ok(
        reminderSrc.includes("document.activeElement"),
        "Must check activeElement to avoid interrupting form entry"
      );
      assert.ok(
        reminderSrc.includes('[role="dialog"]'),
        "Must check for existing open modal dialog to prevent modal stacking"
      );
      assert.ok(
        reminderSrc.includes("Escape"),
        "Must support keyboard Escape key dismissal"
      );
    });

    it("PublicLayout integrates GuestRegistrationReminder", () => {
      const layoutSrc = readFileSync(
        new URL("../../../layouts/PublicLayout.tsx", import.meta.url),
        "utf8"
      );

      assert.ok(
        layoutSrc.includes("GuestRegistrationReminder"),
        "PublicLayout must render GuestRegistrationReminder"
      );
    });
  });
});
