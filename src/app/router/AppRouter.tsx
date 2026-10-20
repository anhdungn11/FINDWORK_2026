import { lazy, Suspense } from "react";
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
import { LoadingBlock } from "@/components/ui";

import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage/RegisterPage";
import CompaniesPage from "@/pages/public/CompaniesPage";
import CompanyDetailPage from "@/pages/public/CompanyDetailPage";
import HomePage from "@/pages/public/HomePage";
import JobDetailPage from "@/pages/public/JobDetailPage/JobDetailPage";
import JobsPage from "@/pages/public/JobsPage";

import EmployerDashboardPage, { EmployerWorkspaceOutlet } from "@/pages/employer/EmployerDashboardPage";

// Lazy-loaded routes for performance & code-splitting
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage/VerifyEmailPage"));
const CompanyInvitationAcceptPage = lazy(() => import("@/pages/company/CompanyInvitationAcceptPage"));

const CandidateDashboardPage = lazy(() => import("@/pages/candidate/CandidateDashboardPage"));
const CandidateOnboardingPage = lazy(() => import("@/pages/candidate/CandidateOnboardingPage"));
const CandidateProfilePage = lazy(() => import("@/pages/candidate/CandidateProfilePage"));
const CandidateSavedJobsPage = lazy(() => import("@/pages/candidate/CandidateSavedJobsPage"));
const CandidateApplicationsPage = lazy(() => import("@/pages/candidate/CandidateApplicationsPage"));
const CvCenterPage = lazy(() => import("@/pages/candidate/CvCenterPage"));
const JobApplicationPage = lazy(() => import("@/pages/candidate/JobApplicationPage"));
const ResumeBuilderPage = lazy(() => import("@/pages/candidate/ResumeBuilderPage"));
const ResumePreviewPage = lazy(() => import("@/pages/candidate/ResumePreviewPage"));

const CareerPage = lazy(() => import("@/pages/public/CareerPage/CareerPage"));
const EmployerRegisterPage = lazy(() => import("@/pages/employer/EmployerRegisterPage"));
const EmployerOnboardingPage = lazy(() => import("@/pages/employer/EmployerOnboardingPage"));
const EmployerJobsPage = lazy(() => import("@/pages/employer/EmployerJobsPage"));
const EmployerJobFormPage = lazy(() => import("@/pages/employer/EmployerJobFormPage"));
const EmployerProfilePage = lazy(() => import("@/pages/employer/EmployerProfilePage"));
const EmployerLocationsPage = lazy(() => import("@/pages/employer/EmployerLocationsPage"));
const EmployerMembersPage = lazy(() => import("@/pages/employer/EmployerMembersPage"));
const EmployerApplicantsPage = lazy(() => import("@/pages/employer/EmployerApplicantsPage"));

const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminCompaniesPage = lazy(() => import("@/pages/admin/AdminCompaniesPage"));
const AdminJobsPage = lazy(() => import("@/pages/admin/AdminJobsPage"));
const AdminSystemPage = lazy(() => import("@/pages/admin/AdminSystemPage"));

const PageFallback = () => (
  <div className="container" style={{ padding: "48px 16px" }}>
    <LoadingBlock rows={5} label="Đang tải trang..." />
  </div>
);

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
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
              element={<CareerPage />}
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
              element={<EmployerRegisterPage />}
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

              <Route
                path="saved-jobs"
                element={<CandidateSavedJobsPage />}
              />

              <Route
                path="applications"
                element={<CandidateApplicationsPage />}
              />
            </Route>
          </Route>

          {/* EMPLOYER / COMPANY WORKSPACE */}
          <Route element={<EmployerRoute />}>
            <Route
              path="employer/onboarding"
              element={<EmployerOnboardingPage />}
            />

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
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
