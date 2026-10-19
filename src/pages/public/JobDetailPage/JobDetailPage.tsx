import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useParams,
} from "react-router-dom";

import { parseJobId } from "@/app/router/jobId";
import {
  jobs,
} from "@/data/mock/jobs.mock";
import { publicApi } from "@/services/api/publicApi";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORKPLACE_TYPE_LABEL,
  formatSalary,
} from "@/services/api/apiTypes";
import { isDemoFixturesAllowed } from "@/config/featureFlags";

import JobDescriptionPlaceholder from "./components/JobDescriptionPlaceholder";
import JobDetailHero from "./components/JobDetailHero";
import JobDetailNotFound from "./components/JobDetailNotFound";
import JobDetailSectionHeader from "./components/JobDetailSectionHeader";
import JobDetailSidebar from "./components/JobDetailSidebar";
import JobOverviewCard from "./components/JobOverviewCard";
import JobSkillsCard from "./components/JobSkillsCard";
import type { JobDetailRecord } from "./types/job-detail.types";

import cardStyles from "./styles/JobDetailCards.module.css";
import styles from "./styles/JobDetailLayout.module.css";

const BackendJobDetailPage = ({ jobId }: { jobId: string }) => {
  const [job, setJob] = useState<JobDetailRecord | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    publicApi
      .getJob(jobId)
      .then((dto) => {
        if (!active) return;
        const mapped: JobDetailRecord = {
          id: dto.id,
          title: dto.title,
          company: dto.companyName || "Doanh nghiệp",
          category: dto.categoryName || "Chung",
          skills: [],
          location: "Việt Nam",
          type: dto.employmentType ? EMPLOYMENT_TYPE_LABEL[dto.employmentType] : "Toàn thời gian",
          workplace: dto.workplaceType ? WORKPLACE_TYPE_LABEL[dto.workplaceType] : "Tại văn phòng",
          experience: dto.experienceMinMonths
            ? `${Math.floor(dto.experienceMinMonths / 12)} năm kinh nghiệm`
            : "Không yêu cầu kinh nghiệm",
          salary: formatSalary(dto),
          postedAt: dto.publishedAt ? new Date(dto.publishedAt).toLocaleDateString("vi-VN") : "Mới đăng",
          matchScore: 0,
          isMock: false,
        };
        setJob(mapped);
        setDescription(dto.description);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Tin tuyển dụng từ hệ thống chính chưa được kết nối với trang này.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
          <p>Đang tải thông tin việc làm từ hệ thống...</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className={styles.page}>
        <div className="container">
          <h1>Chưa hỗ trợ hiển thị tin tuyển dụng này</h1>
          <p>{error || "Tin tuyển dụng từ hệ thống chính chưa được kết nối với trang này."}</p>
          <Link to="/jobs">Quay lại danh sách việc làm</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <JobDetailHero job={job} isMock={false} />

      <section className={styles.contentSection}>
        <div className={`container ${styles.contentGrid}`}>
          <div className={styles.mainContent}>
            <JobOverviewCard job={job} />

            {description ? (
              <section className={cardStyles.card}>
                <JobDetailSectionHeader label="MÔ TẢ CÔNG VIỆC" title="Chi tiết vị trí" />
                <div style={{ padding: "16px 0", lineHeight: "1.7", whiteSpace: "pre-line", color: "var(--color-text-secondary)" }}>
                  {description}
                </div>
              </section>
            ) : (
              <JobDescriptionPlaceholder />
            )}
          </div>

          <JobDetailSidebar job={job} />
        </div>
      </section>
    </main>
  );
};

const JobDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const parsedJobId = parseJobId(id);

  if (parsedJobId.kind === "invalid") {
    return <JobDetailNotFound />;
  }

  if (parsedJobId.kind === "backend") {
    return <BackendJobDetailPage key={parsedJobId.id} jobId={parsedJobId.id} />;
  }

  if (!isDemoFixturesAllowed(location.search)) {
    return <JobDetailNotFound />;
  }

  const job = jobs.find((item) => item.id === parsedJobId.id);

  if (!job) {
    return <JobDetailNotFound />;
  }

  return (
    <main className={styles.page}>
      <JobDetailHero job={job} isMock={true} />

      <section
        className={
          styles.contentSection
        }
      >
        <div
          className={`container ${styles.contentGrid}`}
        >
          <div className={styles.mainContent}>
            <JobOverviewCard job={job} />

            <JobSkillsCard job={job} />

            <JobDescriptionPlaceholder />
          </div>

          <JobDetailSidebar job={job} />
        </div>
      </section>
    </main>
  );
};

export default JobDetailPage;
