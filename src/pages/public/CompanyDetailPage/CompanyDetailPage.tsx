import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";

import { parseCompanyId } from "@/app/router/companyId";
import { companies } from "@/data/mock/companies.mock";
import { publicApi } from "@/services/api/publicApi";
import { isDemoFixturesAllowed } from "@/config/featureFlags";
import type { JobDto, PublicCompanyDto } from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { LoadingBlock } from "@/components/ui";

import CompanyAboutCard from "./components/CompanyAboutCard";
import CompanyDetailHero from "./components/CompanyDetailHero";
import CompanyDetailNotFound from "./components/CompanyDetailNotFound";
import CompanyDetailSidebar from "./components/CompanyDetailSidebar";
import CompanyJobsCard from "./components/CompanyJobsCard";
import type { CompanyDetailRecord } from "./types/company-detail.types";

import styles from "./styles/CompanyDetailLayout.module.css";

const CompanyDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const parsedId = parseCompanyId(id);

  if (parsedId.kind === "invalid") {
    return <CompanyDetailNotFound />;
  }

  if (parsedId.kind === "mock") {
    if (!isDemoFixturesAllowed(location.search)) {
      return <CompanyDetailNotFound />;
    }
    const mockCompany = companies.find((item) => item.id === parsedId.id);
    if (!mockCompany) {
      return <CompanyDetailNotFound />;
    }

    return (
      <main className={styles.page}>
        <CompanyDetailHero company={mockCompany} />
        <section className={styles.contentSection}>
          <div className={`container ${styles.contentGrid}`}>
            <div className={styles.mainContent}>
              <CompanyAboutCard company={mockCompany} />
              <CompanyJobsCard company={mockCompany} />
            </div>
            <CompanyDetailSidebar company={mockCompany} />
          </div>
        </section>
      </main>
    );
  }

  // parsedId.kind === "backend"
  return <BackendCompanyDetailPage companyId={parsedId.id} />;
};

const BackendCompanyDetailPage = ({ companyId }: { companyId: string }) => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<PublicCompanyDto | null>(null);
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [error, setError] = useState<ApiFailure | null>(null);

  const fetchData = useCallback(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      publicApi.getCompany(companyId, ctrl.signal),
      publicApi.listCompanyJobs(companyId, { page: 1, pageSize: 50 }, ctrl.signal),
    ])
      .then(([companyRes, jobsRes]) => {
        setCompany(companyRes);
        setJobs(jobsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [companyId]);

  useEffect(() => {
    return fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className="container" style={{ padding: "64px 16px" }}>
          <LoadingBlock rows={6} label="Đang tải thông tin doanh nghiệp..." />
        </div>
      </main>
    );
  }

  if (error) {
    if (error.kind === "not_found") {
      return <CompanyDetailNotFound />;
    }
    return (
      <main className={styles.page}>
        <div className="container" style={{ padding: "64px 16px" }}>
          <ApiErrorState error={error} onRetry={fetchData} />
        </div>
      </main>
    );
  }

  if (!company) {
    return <CompanyDetailNotFound />;
  }

  const record: CompanyDetailRecord = {
    id: company.id,
    name: company.name,
    industry: company.industry?.name || "Chưa cập nhật",
    location: company.headquarters?.province?.name || company.headquarters?.countryCode || "Chưa cập nhật",
    jobsCount: company.jobsCount,
    description: company.description || "Doanh nghiệp chưa cập nhật phần giới thiệu.",
    size: company.employeeSizeRange || "Chưa cập nhật",
    foundedYear: company.foundedYear || "Chưa cập nhật",
    website: company.website || "Chưa cập nhật",
    isVerified: company.isVerified,
    logo: null,
    cover: null,
  };

  return (
    <main className={styles.page}>
      <CompanyDetailHero company={record} />

      <section className={styles.contentSection}>
        <div className={`container ${styles.contentGrid}`}>
          <div className={styles.mainContent}>
            <CompanyAboutCard company={record} />
            <CompanyJobsCard company={record} jobs={jobs} />
          </div>

          <CompanyDetailSidebar company={record} />
        </div>
      </section>
    </main>
  );
};

export default CompanyDetailPage;
