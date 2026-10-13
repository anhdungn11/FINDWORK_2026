import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const CandidateLayout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div>
      <header>
        <h2>FINDWORK Candidate</h2>
        <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </header>

      <aside>
        <p>Candidate Sidebar</p>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default CandidateLayout;
