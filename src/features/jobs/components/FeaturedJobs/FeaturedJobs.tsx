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

import styles from "./FeaturedJobs.module.css";

const FeaturedJobs = () => {
  const [jobsList, setJobsList] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError(null);
    publicApi
      .listJobs({ page: 1, pageSize: 6 })
      .then((paged) => {
        const mapped: JobRecord[] = paged.data.map((dto) => ({
          id: dto.id,
          title: dto.title,
          company: dto.companyName || "Doanh nghiệp",
          category: dto.categoryName || "Chung",
          skills: [],
          location: "Việt Nam",
          workplace: dto.workplaceType ? WORKPLACE_TYPE_LABEL[dto.workplaceType] : "Tại văn phòng",
          type: dto.employmentType ? EMPLOYMENT_TYPE_LABEL[dto.employmentType] : "Toàn thời gian",
          experience: dto.experienceMinMonths
            ? `${Math.floor(dto.experienceMinMonths / 12)} năm kinh nghiệm`
            : "Không yêu cầu",
          salary: formatSalary(dto),
          postedAt: dto.publishedAt ? new Date(dto.publishedAt).toLocaleDateString("vi-VN") : "Mới đăng",
          matchScore: 0,
          isMock: false,
        }));
        setJobsList(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Không thể kết nối đến máy chủ tin tuyển dụng.");
        setJobsList([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 className={styles.title}>
              Việc làm nổi bật
            </h2>

            <p className={styles.description}>
              Khám phá những cơ hội việc làm mới và phù hợp.
            </p>
          </div>
          <Link to="/jobs" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, fontSize: "0.9375rem" }}>
            Xem tất cả việc làm →
          </Link>
        </div>

        {loading ? (
          <LoadingBlock rows={3} label="Đang nạp việc làm nổi bật..." />
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
            title="Chưa có việc làm nổi bật"
            text="Hệ thống đang cập nhật các vị trí tuyển dụng mới. Vui lòng quay lại sau."
            actionLabel="Khám phá trang việc làm"
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
