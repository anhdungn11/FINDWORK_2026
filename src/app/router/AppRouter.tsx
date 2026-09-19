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

import CandidateDashboardPage from "@/pages/candidate/CandidateDashboardPage";
import CandidateProfilePage from "@/pages/candidate/CandidateProfilePage";
import CvCenterPage from "@/pages/candidate/CvCenterPage";

import CompaniesPage from "@/pages/public/CompaniesPage";
import CompanyDetailPage from "@/pages/public/CompanyDetailPage";
import HomePage from "@/pages/public/HomePage";
import JobsPage from "@/pages/public/JobsPage";
import JobDetailPage from "@/pages/public/JobDetailPage/JobDetailPage";
import RegisterPage from "@/pages/auth/RegisterPage/RegisterPage";
import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage/ResetPasswordPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage/VerifyEmailPage";
import CandidateOnboardingPage from "@/pages/candidate/CandidateOnboardingPage";
import ResumeBuilderPage from "@/pages/candidate/ResumeBuilderPage";

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* PUBLIC */}
                <Route element={<PublicLayout />}>
                    <Route
                        index
                        element={<HomePage />}
                    />

                    <Route
                        path={ROUTES.JOBS}
                        element={<JobsPage />}
                    />

                    <Route
                        path={ROUTES.JOB_DETAIL}
                        element={<JobDetailPage />}
                    />
                    <Route
                        path={ROUTES.COMPANIES}
                        element={<CompaniesPage />}
                    />

                    <Route
                        path={ROUTES.COMPANY_DETAIL}
                        element={<CompanyDetailPage />}
                    />

                    <Route
                        path={ROUTES.CV}
                        element={<CvCenterPage />}
                    />

                    <Route
                        path={ROUTES.CV_CREATE}
                        element={<ResumeBuilderPage />}
                    />

                    <Route
                        path={ROUTES.CAREER}
                        element={<h1>Career Discovery Page</h1>}
                    />
                </Route>

                {/* AUTH */}
                <Route element={<AuthLayout />}>
                    <Route
                        path={ROUTES.LOGIN}
                        element={<LoginPage />}
                    />

                    <Route
                        path={ROUTES.REGISTER}
                        element={<RegisterPage />}
                    />
                    <Route
                        path={ROUTES.FORGOT_PASSWORD}
                        element={<ForgotPasswordPage />}
                    />
                    <Route
                        path={ROUTES.RESET_PASSWORD}
                        element={<ResetPasswordPage />}
                    />

                    <Route
                        path={ROUTES.VERIFY_EMAIL}
                        element={<VerifyEmailPage />}
                    />
                    <Route
                        path={ROUTES.EMPLOYER_LOGIN}
                        element={<h1>Employer Login Page</h1>}
                    />

                    <Route
                        path={ROUTES.EMPLOYER_REGISTER}
                        element={<h1>Employer Register Page</h1>}
                    />
                </Route>

                {/* CANDIDATE */}
                <Route
                    path={ROUTES.CANDIDATE}
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
                        path={ROUTES.CANDIDATE_ONBOARDING}
                        element={<CandidateOnboardingPage />}
                    />

                </Route>

                {/* EMPLOYER */}
                <Route
                    path={ROUTES.EMPLOYER}
                    element={<EmployerLayout />}
                >
                    <Route
                        index
                        element={<h1>Employer Dashboard</h1>}
                    />

                    <Route
                        path={ROUTES.EMPLOYER_CREATE_JOB}
                        element={<h1>Create Employer Job Page</h1>}
                    />
                </Route>

                {/* ADMIN */}
                <Route
                    path={ROUTES.ADMIN}
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
