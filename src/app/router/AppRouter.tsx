import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "@/layouts/AdminLayout";
import AdminRoute from "@/app/guards/AdminRoute";
import EmployerRoute from "@/app/guards/EmployerRoute";
import CandidateRoute from "@/app/guards/CandidateRoute";
import AuthLayout from "@/layouts/AuthLayout";
import CandidateLayout from "@/layouts/CandidateLayout";
import EmployerLayout from "@/layouts/EmployerLayout";
import PublicLayout from "@/layouts/PublicLayout";

import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage/ForgotPasswordPage";
import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage/RegisterPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage/ResetPasswordPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage/VerifyEmailPage";
import CompanyInvitationAcceptPage from "@/pages/company/CompanyInvitationAcceptPage";

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

import EmployerDashboardPage, { EmployerWorkspaceOutlet } from "@/pages/employer/EmployerDashboardPage";
import EmployerJobsPage from "@/pages/employer/EmployerJobsPage";
import EmployerJobFormPage from "@/pages/employer/EmployerJobFormPage";
import EmployerProfilePage from "@/pages/employer/EmployerProfilePage";
import EmployerLocationsPage from "@/pages/employer/EmployerLocationsPage";
import EmployerMembersPage from "@/pages/employer/EmployerMembersPage";
import EmployerApplicantsPage from "@/pages/employer/EmployerApplicantsPage";

import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import AdminJobsPage from "@/pages/admin/AdminJobsPage";
import AdminSystemPage from "@/pages/admin/AdminSystemPage";

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

          <Route element={<CandidateRoute />}>
            <Route path="jobs/:id/apply" element={<JobApplicationPage />} />
            <Route path="cv" element={<CvCenterPage />} />
            <Route path="cv/create" element={<ResumeBuilderPage />} />
            <Route path="cv/:resumeId/edit" element={<ResumeBuilderPage />} />
            <Route path="cv/:resumeId/preview" element={<ResumePreviewPage />} />
          </Route>

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
            path="company-invitations/accept"
            element={<CompanyInvitationAcceptPage />}
          />

          <Route
            path="employer/login"
            element={<LoginPage />}
          />

          <Route
            path="employer/register"
            element={<RegisterPage />}
          />
        </Route>

        {/* CANDIDATE */}
        <Route element={<CandidateRoute />}>
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
        </Route>

        {/* EMPLOYER / COMPANY WORKSPACE */}
        <Route element={<EmployerRoute />}>
          <Route
            path="employer"
            element={<EmployerLayout />}
          >
            <Route element={<EmployerWorkspaceOutlet />}>
              <Route
                index
                element={<EmployerDashboardPage />}
              />

              <Route
                path="jobs"
                element={<EmployerJobsPage />}
              />

              <Route
                path="jobs/new"
                element={<EmployerJobFormPage />}
              />

              <Route
                path="jobs/create"
                element={<EmployerJobFormPage />}
              />

              <Route
                path="jobs/:jobId/edit"
                element={<EmployerJobFormPage />}
              />

              <Route
                path="profile"
                element={<EmployerProfilePage />}
              />

              <Route
                path="locations"
                element={<EmployerLocationsPage />}
              />

              <Route
                path="members"
                element={<EmployerMembersPage />}
              />

              <Route
                path="applicants"
                element={<EmployerApplicantsPage />}
              />
            </Route>
          </Route>
        </Route>

        {/* ADMIN WORKSPACE */}
        <Route element={<AdminRoute />}>
          <Route
            path="admin"
            element={<AdminLayout />}
          >
            <Route
              index
              element={<AdminDashboardPage />}
            />

            <Route
              path="users"
              element={<AdminUsersPage />}
            />

            <Route
              path="companies"
              element={<AdminCompaniesPage />}
            />

            <Route
              path="jobs"
              element={<AdminJobsPage />}
            />

            <Route
              path="system"
              element={<AdminSystemPage />}
            />
          </Route>
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
