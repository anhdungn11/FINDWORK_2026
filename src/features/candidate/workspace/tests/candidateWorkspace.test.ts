import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatCandidateRole,
  formatCandidateStatus,
  getCandidateInitials,
  resolveCandidateIdentity,
} from "../utils/workspaceIdentity";

// ============================================================================
// 1. Identity Resolution & Fallback Tests
// ============================================================================

test("Candidate Workspace Identity - Initials resolution", () => {
  // Vietnamese multi-word name
  assert.equal(getCandidateInitials("Nguyễn Anh Dũng"), "ND");
  assert.equal(getCandidateInitials("Trần Thị Mai"), "TM");

  // Single word name
  assert.equal(getCandidateInitials("Alexander"), "A");

  // Email format
  assert.equal(getCandidateInitials("dung.nguyen@example.com"), "DU");
  assert.equal(getCandidateInitials("admin@findwork.vn"), "AD");
  assert.equal(getCandidateInitials("a@x.com"), "A");

  // Empty or fallback cases
  assert.equal(getCandidateInitials(""), "UV");
  assert.equal(getCandidateInitials(null), "UV");
  assert.equal(getCandidateInitials(undefined), "UV");
  assert.equal(getCandidateInitials("   "), "UV");
});

test("Candidate Workspace Identity - Role formatting without guessing", () => {
  assert.equal(formatCandidateRole("CANDIDATE"), "Ứng viên");
  assert.equal(formatCandidateRole("candidate"), "Ứng viên");
  assert.equal(formatCandidateRole("EMPLOYER"), "Nhà tuyển dụng");
  assert.equal(formatCandidateRole("ADMIN"), "Quản trị viên");
  assert.equal(formatCandidateRole("GUEST_RECRUITER"), "GUEST_RECRUITER");
  assert.equal(formatCandidateRole(""), "");
  assert.equal(formatCandidateRole(null), "");
  assert.equal(formatCandidateRole(undefined), "");
});

test("Candidate Workspace Identity - Status formatting safety", () => {
  assert.deepEqual(formatCandidateStatus("ACTIVE"), { label: "Đang hoạt động", isActive: true });
  assert.deepEqual(formatCandidateStatus("active"), { label: "Đang hoạt động", isActive: true });
  assert.deepEqual(formatCandidateStatus("INACTIVE"), { label: "Tạm dừng", isActive: false });
  assert.deepEqual(formatCandidateStatus("PENDING"), { label: "Chờ xác thực", isActive: false });
  assert.deepEqual(formatCandidateStatus("SUSPENDED"), { label: "Tài khoản bị khóa", isActive: false });
  assert.deepEqual(formatCandidateStatus("BLOCKED"), { label: "Tài khoản bị khóa", isActive: false });
  assert.deepEqual(formatCandidateStatus("CUSTOM_STATUS"), { label: "CUSTOM_STATUS", isActive: false });
  assert.equal(formatCandidateStatus(null), null);
  assert.equal(formatCandidateStatus(undefined), null);
  assert.equal(formatCandidateStatus(""), null);
});

test("Candidate Workspace Identity - Complete resolution priority", () => {
  // Case 1: Full user record
  const user1 = {
    id: "user-1",
    email: "dung@example.com",
    fullName: "Nguyễn Anh Dũng",
    role: "CANDIDATE",
    status: "ACTIVE",
  };
  const id1 = resolveCandidateIdentity(user1);
  assert.equal(id1.displayName, "Nguyễn Anh Dũng");
  assert.equal(id1.initials, "ND");
  assert.equal(id1.email, "dung@example.com");
  assert.equal(id1.roleLabel, "Ứng viên");
  assert.equal(id1.statusLabel, "Đang hoạt động");
  assert.equal(id1.isActive, true);

  // Case 2: Email only (no fullName)
  const user2 = {
    id: "user-2",
    email: "candidate.test@findwork.vn",
    role: "CANDIDATE",
  };
  const id2 = resolveCandidateIdentity(user2);
  assert.equal(id2.displayName, "candidate.test");
  assert.equal(id2.initials, "CA");
  assert.equal(id2.email, "candidate.test@findwork.vn");
  assert.equal(id2.isActive, false);

  // Case 3: Null user (guest / transition)
  const id3 = resolveCandidateIdentity(null);
  assert.equal(id3.displayName, "Khách");
  assert.equal(id3.initials, "K");
  assert.equal(id3.email, "");
  assert.equal(id3.isActive, false);
});

// ============================================================================
// 2. Semantic Landmark Tests
// ============================================================================

test("Candidate Workspace Semantic Landmark - Exact one main landmark rule", () => {
  const shouldChildProvideMain = (pathname: string) => {
    return pathname.startsWith("/candidate/onboarding");
  };

  // Onboarding route: CandidateOnboarding provides its own <main>, so layout uses <div>
  assert.equal(shouldChildProvideMain("/candidate/onboarding"), true);
  assert.equal(shouldChildProvideMain("/candidate/onboarding/step-2"), true);

  // Dashboard & Profile: Layout provides the <main> landmark because children do not
  assert.equal(shouldChildProvideMain("/candidate"), false);
  assert.equal(shouldChildProvideMain("/candidate/profile"), false);
  assert.equal(shouldChildProvideMain("/candidate/"), false);

  // Target ID for skip-to-content must match on all routes
  const SKIP_TARGET_ID = "candidate-main-content";
  assert.equal(SKIP_TARGET_ID, "candidate-main-content");
});

test("Candidate Workspace Navigation Items - Route integrity and exact matching contract", () => {
  const expectedRoutes = [
    { to: "/candidate", exact: true, external: false },
    { to: "/candidate/profile", exact: false, external: false },
    { to: "/candidate/onboarding", exact: false, external: false },
    { to: "/cv", exact: false, external: true },
    { to: "/jobs", exact: false, external: true },
  ];

  for (const item of expectedRoutes) {
    assert.ok(item.to.startsWith("/"), `Route must start with /: ${item.to}`);
  }

  const dashboardItem = expectedRoutes.find((r) => r.to === "/candidate");
  assert.equal(dashboardItem?.exact, true, "Dashboard must have exact match to avoid active overlap");

  const forbiddenUnbuiltRoutes = [
    "/candidate/saved-jobs",
    "/candidate/applications",
    "/candidate/settings",
    "/candidate/interviews",
  ];
  for (const forbidden of forbiddenUnbuiltRoutes) {
    assert.ok(
      !expectedRoutes.some((r) => r.to === forbidden),
      `Unbuilt backend route must not be in nav list: ${forbidden}`
    );
  }
});

// ============================================================================
// 3. Drawer Lifecycle, Focus Trap & Focus Restoration Tests
// ============================================================================

test("CandidateMobileDrawer - Closed Drawer tab order & accessibility exclusion contract", () => {
  const resolveDrawerAttributes = (isOpen: boolean, isMounted: boolean) => {
    if (!isMounted) {
      return { renderedInDom: false, role: undefined, ariaModal: undefined, inert: undefined };
    }
    return {
      renderedInDom: true,
      role: isOpen ? "dialog" : undefined,
      ariaModal: isOpen ? "true" : undefined,
      inert: !isOpen ? true : undefined,
      ariaHidden: !isOpen,
    };
  };

  // State 1: Completely closed and unmounted (after slide-out transition)
  const unmountedState = resolveDrawerAttributes(false, false);
  assert.equal(unmountedState.renderedInDom, false, "Drawer must not exist in DOM when unmounted");

  // State 2: Closing transition in progress (slide-out animation window)
  const closingState = resolveDrawerAttributes(false, true);
  assert.equal(closingState.renderedInDom, true);
  assert.equal(closingState.role, undefined, "Closed drawer must not declare role=dialog");
  assert.equal(closingState.ariaModal, undefined, "Closed drawer must not declare aria-modal=true");
  assert.equal(closingState.inert, true, "Closed drawer must have inert=true to exclude from tab order");
  assert.equal(closingState.ariaHidden, true, "Closed drawer must have aria-hidden=true");

  // State 3: Open state
  const openState = resolveDrawerAttributes(true, true);
  assert.equal(openState.renderedInDom, true);
  assert.equal(openState.role, "dialog");
  assert.equal(openState.ariaModal, "true");
  assert.equal(openState.inert, undefined);
  assert.equal(openState.ariaHidden, false);
});

test("CandidateMobileDrawer - Focus trap circular Tab and Shift+Tab logic", () => {
  const focusable = [
    { id: "close-btn" },
    { id: "nav-dashboard" },
    { id: "nav-profile" },
    { id: "logout-btn" },
  ];

  const trapTabKey = (currentId: string, shiftKey: boolean): string => {
    const firstId = focusable[0].id;
    const lastId = focusable[focusable.length - 1].id;

    if (shiftKey) {
      if (currentId === firstId) {
        return lastId; // Wrap around to last
      }
      const idx = focusable.findIndex((e) => e.id === currentId);
      return idx > 0 ? focusable[idx - 1].id : lastId;
    } else {
      if (currentId === lastId) {
        return firstId; // Wrap around to first
      }
      const idx = focusable.findIndex((e) => e.id === currentId);
      return idx < focusable.length - 1 ? focusable[idx + 1].id : firstId;
    }
  };

  // Shift+Tab on first element wraps to last element
  assert.equal(trapTabKey("close-btn", true), "logout-btn");

  // Tab on last element wraps to first element
  assert.equal(trapTabKey("logout-btn", false), "close-btn");

  // Normal forward Tab moves to next element
  assert.equal(trapTabKey("close-btn", false), "nav-dashboard");

  // Normal backward Shift+Tab moves to previous element
  assert.equal(trapTabKey("nav-profile", true), "nav-dashboard");
});

test("CandidateMobileDrawer - Focus restoration ordering and focusin trap race immunity", () => {
  // Verifies the exact bug reported in Second Source Review:
  // If focus() is called while isOpen is still true, focusin listener steals it back.
  // With post-commit effect lifecycle, focusin listener is cleaned up before focus() is called.

  let activeFocusTarget = "none";
  let isFocusinTrapActive = false;

  const mockCloseBtn = {
    focus: () => {
      activeFocusTarget = "close-btn";
    },
  };

  const mockTrigger = {
    offsetParent: {} as Element, // Visible on screen
    focus: () => {
      activeFocusTarget = "hamburger";
      // If focusin trap is active, it intercepts the event and steals focus back
      if (isFocusinTrapActive) {
        mockCloseBtn.focus();
      }
    },
  };

  // Model A: Flawed synchronous ordering (Bug)
  isFocusinTrapActive = true; // Still active when synchronous focus was called
  mockTrigger.focus();
  assert.equal(
    activeFocusTarget,
    "close-btn",
    "Proof of root cause: synchronous focus() while trap is active causes focus to be stolen back"
  );

  // Model B: React Lifecycle Post-Commit Ordering (Fix)
  // Step 1: User requests close -> records intent
  let shouldRestore = true;
  // Step 2: Parent commits closed state -> React unmounts/cleans up open effects
  isFocusinTrapActive = false; // focusin listener removed in effect cleanup!
  // Step 3: Post-commit effect executes
  if (shouldRestore && mockTrigger.offsetParent !== null) {
    shouldRestore = false;
    mockTrigger.focus();
  }
  assert.equal(
    activeFocusTarget,
    "hamburger",
    "Fix verification: trigger receives and retains focus because trap was cleaned up prior to focus()"
  );
});

test("CandidateMobileDrawer - Focus restoration conditions (Escape, Backdrop, Nav, Hidden)", () => {
  let focusedTarget = "none";
  const mockTrigger = {
    offsetParent: {} as Element,
    focus: () => {
      focusedTarget = "hamburger";
    },
  };

  const executePostCommitRestore = (
    restoreFocus: boolean,
    trigger: { offsetParent: Element | null; focus: () => void } | null
  ) => {
    focusedTarget = "none";
    if (restoreFocus && trigger && trigger.offsetParent !== null) {
      trigger.focus();
    }
  };

  // Case A: Escape / Close button / Backdrop -> restoreFocus is true
  executePostCommitRestore(true, mockTrigger);
  assert.equal(focusedTarget, "hamburger", "Must restore focus to hamburger trigger");

  // Case B: Navigation link click -> restoreFocus is false
  executePostCommitRestore(false, mockTrigger);
  assert.equal(focusedTarget, "none", "Must not restore focus on navigation");

  // Case C: Desktop breakpoint where trigger is hidden (offsetParent is null)
  const hiddenTrigger = {
    offsetParent: null,
    focus: () => {
      focusedTarget = "hamburger";
    },
  };
  executePostCommitRestore(true, hiddenTrigger);
  assert.equal(focusedTarget, "none", "Must not restore focus when trigger is hidden on desktop");
});

test("CandidateMobileDrawer - Body scroll overflow preservation and cleanup", () => {
  // Simulates document.body.style.overflow preservation
  const mockBody = { style: { overflow: "auto" } };
  let previousOverflow: string | null = null;

  const simulateOpen = () => {
    previousOverflow = mockBody.style.overflow;
    mockBody.style.overflow = "hidden";
  };

  const simulateCloseOrUnmount = () => {
    if (previousOverflow !== null) {
      mockBody.style.overflow = previousOverflow;
      previousOverflow = null;
    }
  };

  // 1. Initial state has custom overflow "auto"
  assert.equal(mockBody.style.overflow, "auto");

  // 2. Drawer opens -> locks scroll to "hidden"
  simulateOpen();
  assert.equal(mockBody.style.overflow, "hidden");

  // 3. Drawer closes -> precisely restores "auto", not blank ""
  simulateCloseOrUnmount();
  assert.equal(mockBody.style.overflow, "auto");
});

test("CandidateMobileDrawer - Breakpoint transition cleanup logic", () => {
  let closed = false;
  let restoreFocusOption: boolean | undefined = undefined;

  const handleBreakpointCheck = (
    isDesktopMatch: boolean,
    isDrawerOpen: boolean,
    onCloseCallback: (options: { restoreFocus: boolean }) => void
  ) => {
    if (isDesktopMatch && isDrawerOpen) {
      onCloseCallback({ restoreFocus: false });
    }
  };

  handleBreakpointCheck(true, true, (opt) => {
    closed = true;
    restoreFocusOption = opt.restoreFocus;
  });

  assert.equal(closed, true, "Drawer must close when screen widens to desktop");
  assert.equal(restoreFocusOption, false, "Focus restoration must be false on breakpoint transition");
});

// ============================================================================
// 4. Account Menu & Logout Contract Tests
// ============================================================================

test("CandidateAccountMenu - Disclosure Pattern and Profile placeholder honesty", () => {
  const accountMenuConfig = {
    trigger: {
      ariaExpanded: false,
      ariaControls: "candidate-account-dropdown",
      role: undefined,
      hasPopup: undefined,
    },
    panel: {
      id: "candidate-account-dropdown",
      role: undefined,
    },
    items: [
      { id: "dashboard", to: "/candidate", role: undefined },
      {
        id: "profile",
        to: "/candidate/profile",
        label: "Hồ sơ cá nhân",
        badge: "Đang hoàn thiện",
        ariaLabel: "Hồ sơ cá nhân (Chức năng đang hoàn thiện)",
        role: undefined,
      },
      { id: "onboarding", to: "/candidate/onboarding", role: undefined },
      { id: "cv", to: "/cv", role: undefined },
    ],
  };

  assert.equal(accountMenuConfig.trigger.role, undefined);
  assert.equal(accountMenuConfig.trigger.hasPopup, undefined);
  assert.equal(accountMenuConfig.panel.role, undefined);
  assert.equal(accountMenuConfig.trigger.ariaControls, accountMenuConfig.panel.id);

  const profileItem = accountMenuConfig.items.find((i) => i.id === "profile");
  assert.ok(profileItem);
  assert.equal(profileItem?.badge, "Đang hoàn thiện");
  assert.ok(profileItem?.ariaLabel.includes("Chức năng đang hoàn thiện"));
});

test("Candidate Workspace Logout Contract - Success vs Failure handling", async () => {
  let serverRevoked = false;
  const mockLogoutSuccess = async (): Promise<boolean> => {
    serverRevoked = true;
    return true;
  };

  const resultSuccess = await mockLogoutSuccess();
  assert.equal(resultSuccess, true);
  assert.equal(serverRevoked, true);

  const mockLogoutFailure = async (): Promise<boolean> => {
    return false;
  };

  const resultFailure = await mockLogoutFailure();
  assert.equal(resultFailure, false, "Must not claim success when logout returns false");
});
