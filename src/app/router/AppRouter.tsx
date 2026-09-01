import { BrowserRouter, Route, Routes } from "react-router-dom";

import PublicLayout from "@/layouts/PublicLayout";
import AuthLayout from "@/layouts/AuthLayout";
import CandidateLayout from "@/layouts/CandidateLayout";
import EmployerLayout from "@/layouts/EmployerLayout";
import AdminLayout from "@/layouts/AdminLayout";
import HomePage from "@/pages/public/HomePage";
import CandidateDashboardPage from "@/pages/candidate/CandidateDashboardPage";
import CandidateProfilePage from "@/pages/candidate/CandidateProfilePage";
import JobsPage from "@/pages/public/JobsPage";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="companies" element={<h1>Companies Page</h1>} />
        </Route>

        {/* AUTH */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<h1>Login Page</h1>} />
          <Route path="register" element={<h1>Register Page</h1>} />
        </Route>

        {/* CANDIDATE */}
        <Route path="candidate" element={<CandidateLayout />}>
          <Route index element={<CandidateDashboardPage />} />
          <Route path="profile" element={<CandidateProfilePage />} />
        </Route>

        {/* EMPLOYER */}
        <Route path="employer" element={<EmployerLayout />}>
          <Route index element={<h1>Employer Dashboard</h1>} />
        </Route>

        {/* ADMIN */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<h1>Admin Dashboard</h1>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;