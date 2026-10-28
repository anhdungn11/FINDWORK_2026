import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "@/services/api/publicApi";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORKPLACE_TYPE_LABEL,
  formatSalary,
} from "@/services/api/apiTypes";
import type { JobRecord } from "@/features/jobs/types/job.types";
import JobCard from "@/features/jobs/components/JobCard";
import { LoadingBlock, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n/i18nStore";

import styles from "./FeaturedJobs.module.css";

const isIntegrationTestJob = (dto: { title?: string | null; companyName?: string | null }): boolean => {
  const title = (dto.title || "").toLowerCase();
  const company = (dto.companyName || "").toLowerCase();
  return (
    title.includes("release interview role") ||
    title.includes("test role for interview") ||
    company.startsWith("release main") ||
    company.includes("acceptance category")
  );
};

const FeaturedJobs = () => {
  const [jobsList, setJobsList] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError(null);
    publicApi
      .listJobs({ page: 1, pageSize: 12 })
      .then((paged) => {
        // Filter out integration-test fixtures from public featured homepage
        const realProductionJobs = paged.data.filter((dto) => !isIntegrationTestJob(dto));

        if (realProductionJobs.length > 0) {
          const mapped: JobRecord[] = realProductionJobs.slice(0, 6).map((dto) => ({
            id: dto.id,
            title: dto.title,
            company: dto.companyName || (locale === "en" ? "Employer" : "Doanh nghiệp"),
            category: dto.categoryName || (locale === "en" ? "General" : "Chung"),
            skills: [],
            location: dto.locations?.[0]?.province?.name || (locale === "en" ? "Vietnam" : "Việt Nam"),
            workplace: dto.workplaceType
              ? WORKPLACE_TYPE_LABEL[dto.workplaceType]
              : (locale === "en" ? "On-site" : "Tại văn phòng"),
            type: dto.employmentType
              ? EMPLOYMENT_TYPE_LABEL[dto.employmentType]
              : (locale === "en" ? "Full-time" : "Toàn thời gian"),
            experience: dto.experienceMinMonths
              ? `${Math.floor(dto.experienceMinMonths / 12)} ${locale === "en" ? "years exp" : "năm kinh nghiệm"}`
              : (locale === "en" ? "No experience" : "Không yêu cầu"),
            salary: formatSalary(dto),
            postedAt: dto.publishedAt
              ? new Date(dto.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")
              : (locale === "en" ? "Just posted" : "Mới đăng"),
            matchScore: 0,
            isMock: false,
          }));
          setJobsList(mapped);
        } else {
          // If no real production jobs exist, display empty state
          setJobsList([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Không thể kết nối đến máy chủ tin tuyển dụng.");
        setJobsList([]);
        setLoading(false);
      });
  }, [locale]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 className={styles.title}>
              {t.jobs.featuredTitle}
            </h2>

            <p className={styles.description}>
              {t.jobs.featuredSubtitle}
            </p>
          </div>
          <Link to="/jobs" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "0.9375rem" }}>
            {t.jobs.allJobs}
          </Link>
        </div>

        {loading ? (
          <LoadingBlock rows={3} label={t.common.loading} />
        ) : error ? (
          <div style={{ padding: "36px 20px", textAlign: "center", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
            <p style={{ margin: "0 0 12px", color: "var(--color-danger, #ef4444)", fontWeight: 600 }}>
              {error}
            </p>
            <button
              type="button"
              style={{ padding: "8px 18px", borderRadius: "8px", cursor: "pointer", border: "1px solid var(--color-border)", background: "var(--color-surface)", fontWeight: 600, color: "var(--color-text-primary)" }}
              onClick={fetchJobs}
            >
              Thử lại
            </button>
          </div>
        ) : jobsList.length === 0 ? (
          <EmptyState
            title={t.jobs.featuredTitle}
            text={t.jobs.featuredSubtitle}
            actionLabel={t.jobs.allJobs}
            actionTo="/jobs"
          />
        ) : (
          <div className={styles.grid}>
            {jobsList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedJobs;
