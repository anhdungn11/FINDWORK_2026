import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  CandidateHeader,
  CandidateSidebar,
  CandidateMobileDrawer,
} from "@/features/candidate/workspace";
import styles from "@/features/candidate/workspace/styles/CandidateWorkspace.module.css";

const CandidateLayout = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // CandidateOnboarding already renders its own <main> landmark.
  // To avoid invalid nested <main> landmarks, we render a <div> wrapper when on onboarding,
  // and <main> for other candidate sub-routes (Dashboard, Profile, etc.).
  const isChildProvidingMain = location.pathname.startsWith("/candidate/onboarding");

  return (
    <div className={styles.layout}>
      {/* WCAG Skip-to-content accessible link */}
      <a href="#candidate-main-content" className={styles.skipLink}>
        Chuyển đến nội dung chính
      </a>

      {/* Candidate Top Header with branding, mobile toggle, quick links, and account menu */}
      <CandidateHeader
        hamburgerButtonRef={hamburgerButtonRef}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      {/* Workspace container */}
      <div className={styles.workspaceBody}>
        {/* Desktop Sidebar (hidden on < 1024px) */}
        <CandidateSidebar />

        {/* Dynamic Main Landmark Wrapper */}
        {isChildProvidingMain ? (
          <div
            id="candidate-main-content"
            className={styles.contentWrapper}
            tabIndex={-1}
          >
            <Outlet />
          </div>
        ) : (
          <main
            id="candidate-main-content"
            className={styles.contentWrapper}
            tabIndex={-1}
          >
            <Outlet />
          </main>
        )}
      </div>

      {/* Mobile Drawer Navigation (visible on < 1024px when opened) */}
      <CandidateMobileDrawer
        isOpen={isMobileDrawerOpen}
        triggerRef={hamburgerButtonRef}
        onClose={() => setIsMobileDrawerOpen(false)}
      />
    </div>
  );
};

export default CandidateLayout;
