import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getReturnDestination } from "../returnDestination";

describe("FINDWORK Email Verification & Admin Companies Action Regression", () => {
  describe("AdminCompaniesPage Action Count Regression", () => {
    const adminCompaniesSrc = readFileSync(
      new URL("../../../pages/admin/AdminCompaniesPage.tsx", import.meta.url),
      "utf8",
    );

    it("renders exactly one status-action block per company in table rows", () => {
      // Find all handleStatusChange calls in JSX
      const statusActionCalls = adminCompaniesSrc.match(/handleStatusChange\(/g) || [];
      // Exactly 2 occurrences: one for ACTIVE -> SUSPENDED, one for SUSPENDED -> ACTIVE inside the single ternary block
      assert.equal(
        statusActionCalls.length,
        2,
        `Expected exactly 2 handleStatusChange occurrences in JSX (one ternary block), found ${statusActionCalls.length}`,
      );

      // Verify no duplicate "Đình chỉ" or "Kích hoạt" button labels in table rows
      const suspendButtons = adminCompaniesSrc.match(/>\s*Đình chỉ\s*<\/button>/g) || [];
      const activateButtons = adminCompaniesSrc.match(/>\s*Kích hoạt\s*<\/button>/g) || [];
      assert.equal(suspendButtons.length, 1, "Must render exactly 1 'Đình chỉ' button template");
      assert.equal(activateButtons.length, 1, "Must render exactly 1 'Kích hoạt' button template");
    });

    it("preserves Chi tiết & Quyền action and verification approval/rejection actions", () => {
      assert.ok(
        adminCompaniesSrc.includes("Chi tiết & Quyền"),
        "Must preserve 'Chi tiết & Quyền' details modal trigger",
      );
      assert.ok(
        adminCompaniesSrc.includes("handleApproveVerification"),
        "Must preserve verification approval action",
      );
      assert.ok(
        adminCompaniesSrc.includes("setRejectingCompany"),
        "Must preserve verification rejection action modal trigger",
      );
    });
  });

  describe("Verify Email Flow (/verify-email)", () => {
    const verifyEmailSrc = readFileSync(
      new URL("../../../pages/auth/VerifyEmailPage/VerifyEmailPage.tsx", import.meta.url),
      "utf8",
    );
    const loginHookSrc = readFileSync(
      new URL("../../../features/auth/hooks/useLoginForm.ts", import.meta.url),
      "utf8",
    );

    it("getReturnDestination permits /verify-email as a valid return destination", () => {
      assert.equal(getReturnDestination("/verify-email"), "/verify-email");
      assert.equal(getReturnDestination("/verify-email?step=2"), "/verify-email?step=2");
    });

    it("useLoginForm supports returning to /verify-email from location state or query parameter", () => {
      assert.ok(
        loginHookSrc.includes('requestedPath !== "/verify-email"'),
        "Admin rolePath check should not strip /verify-email",
      );
      assert.ok(
        loginHookSrc.includes('get("returnTo")'),
        "useLoginForm must read returnTo from query params or location.state",
      );
    });

    it("waits for auth initialization before showing signed-out state", () => {
      assert.ok(
        verifyEmailSrc.includes('authStatus === "idle" || authStatus === "loading"'),
        "Must check idle or loading authStatus before showing signed-out state",
      );
      assert.ok(
        verifyEmailSrc.includes("Đang kiểm tra tài khoản"),
        "Must provide an auth-checking shell title while initializing",
      );
    });

    it("displays a clear request UI for authenticated unverified user without a token", () => {
      assert.ok(
        verifyEmailSrc.includes("Yêu cầu xác minh email") || verifyEmailSrc.includes("Xác thực địa chỉ email"),
        "Must display clear verification request UI",
      );
      assert.ok(
        verifyEmailSrc.includes("user.email"),
        "Must display user email in verification prompt",
      );
      assert.ok(
        verifyEmailSrc.includes("Gửi email xác minh"),
        "Must provide explicit action button to request email verification",
      );
    });

    it("never requests or sends email verification automatically on mount", () => {
      // Must not call emailVerificationApi.request inside any useEffect
      const useEffectBlocks = verifyEmailSrc.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?\},/g) || [];
      for (const block of useEffectBlocks) {
        assert.ok(
          !block.includes("emailVerificationApi.request"),
          "Automatic verification request in useEffect is prohibited",
        );
      }
    });

    it("signed-out user sees clear login prompt that returns to verification", () => {
      assert.ok(
        verifyEmailSrc.includes('state={{ from: "/verify-email" }}'),
        "Login link must preserve return state to /verify-email",
      );
    });

    it("rejects invalid or malformed tokens honestly", () => {
      assert.ok(
        verifyEmailSrc.includes("Mã xác minh không hợp lệ hoặc đã hết hạn") ||
        verifyEmailSrc.includes("Liên kết xác minh không có mã token hợp lệ hoặc sai định dạng"),
        "Must reject invalid token with clear error message",
      );
      assert.ok(
        verifyEmailSrc.includes("TOKEN_REGEX"),
        "Must validate 43-character base64url token pattern",
      );
    });
  });
});
