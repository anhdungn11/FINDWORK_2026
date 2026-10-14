import { useEffect, useRef } from "react";

import { useAuthStore } from "@/store/authStore";

import { getHeaderAuthView, shouldCheckAuth, shouldRecheckAuth } from "./headerAuth";

const useHeaderAuth = () => {
  const lastCheckAt = useRef(0);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const logoutError = useAuthStore((state) => state.logoutError);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Public pages do not mount CandidateRoute, so they must verify a restored session here.
    if (shouldCheckAuth(status)) {
      lastCheckAt.current = Date.now();
      void checkAuth();
    }
  }, [status, checkAuth]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const recheck = () => {
      const now = Date.now();
      if (!shouldRecheckAuth(useAuthStore.getState().status, document.visibilityState === "visible", now - lastCheckAt.current)) return;
      lastCheckAt.current = now;
      void checkAuth();
    };

    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    const interval = window.setInterval(recheck, 5 * 60_000);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
      window.clearInterval(interval);
    };
  }, [status, checkAuth]);

  return {
    view: getHeaderAuthView(status, user, accessToken),
    user,
    logoutError,
    logout,
  };
};

export default useHeaderAuth;
