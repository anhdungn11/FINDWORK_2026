import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import { ROUTES } from "@/app/router/router";

import AdminLayout from "@/layouts/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";
import CandidateLayout from "@/layouts/CandidateLayout";
import EmployerLayout from "@/layouts/EmployerLayout";
import PublicLayout from "@/layouts/PublicLayout";

import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage/ForgotPasswordPage";
import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage/RegisterPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage/ResetPasswordPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage/VerifyEmailPage";

import CandidateDashboardPage from "@/pages/candidate/CandidateDashboardPage";
import CandidateOnboardingPage from "@/pages/candidate/CandidateOnboardingPage";
import CandidateProfilePage from "@/pages/candidate/CandidateProfilePage";
import CvCenterPage from "@/pages/candidate/CvCenterPage";
import JobApplicationPage from "@/pages/candidate/JobApplicationPage";
import ResumeBuilderPage from "@/pages/candidate/ResumeBuilderPage";
import ResumePreviewPage from "@/pages/candidate/ResumePreviewPage";

import CompaniesPage from "@/pages/public/CompaniesPage";
import CompanyDetailPage from "@/pages/public/CompanyDetailPage";
import HomePage from "@/pages/public/HomePage";
import JobDetailPage from "@/pages/public/JobDetailPage/JobDetailPage";
import JobsPage from "@/pages/public/JobsPage";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* TEST ROUTE */}
        <Route
          path="/route-test"
          element={<h1>ROUTER TEST OK</h1>}
        />

        {/* PUBLIC */}
        <Route element={<PublicLayout />}>
          <Route
            index
            element={<HomePage />}
          />

          <Route
            path="jobs"
            element={<JobsPage />}
          />

          <Route
            path="/jobs/:id/apply"
            element={<JobApplicationPage />}
          />

          <Route
            path="jobs/:id"
            element={<JobDetailPage />}
          />

          <Route
            path="companies"
            element={<CompaniesPage />}
          />

          <Route
            path="companies/:id"
            element={<CompanyDetailPage />}
          />

          <Route
            path="cv"
            element={<CvCenterPage />}
          />

          <Route
            path="cv/create"
            element={<ResumeBuilderPage />}
          />

          <Route
            path="cv/:resumeId/edit"
            element={<ResumeBuilderPage />}
          />

          <Route
            path="cv/:resumeId/preview"
            element={<ResumePreviewPage />}
          />

          <Route
            path="career"
            element={<h1>Career Discovery Page</h1>}
          />
        </Route>

        {/* AUTH */}
        <Route element={<AuthLayout />}>
          <Route
            path="login"
            element={<LoginPage />}
          />

          <Route
            path="register"
            element={<RegisterPage />}
          />

          <Route
            path="forgot-password"
            element={<ForgotPasswordPage />}
          />

          <Route
            path="reset-password"
            element={<ResetPasswordPage />}
          />

          <Route
            path="verify-email"
            element={<VerifyEmailPage />}
          />

          <Route
            path="employer/login"
            element={<h1>Employer Login Page</h1>}
          />

          <Route
            path="employer/register"
            element={<h1>Employer Register Page</h1>}
          />
        </Route>

        {/* CANDIDATE */}
        <Route
          path="candidate"
          element={<CandidateLayout />}
        >
          <Route
            index
            element={<CandidateDashboardPage />}
          />

          <Route
            path="profile"
            element={<CandidateProfilePage />}
          />

          <Route
            path="onboarding"
            element={<CandidateOnboardingPage />}
          />
        </Route>

        {/* EMPLOYER */}
        <Route
          path="employer"
          element={<EmployerLayout />}
        >
          <Route
            index
            element={<h1>Employer Dashboard</h1>}
          />

          <Route
            path="jobs/create"
            element={<h1>Create Employer Job Page</h1>}
          />
        </Route>

        {/* ADMIN */}
        <Route
          path="admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<h1>Admin Dashboard</h1>}
          />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={<h1>404 - Page Not Found</h1>}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;