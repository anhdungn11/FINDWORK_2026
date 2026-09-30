import { Link } from "react-router-dom";

import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

import styles from "./ApplicationJobSummary.module.css";

interface ApplicationJobSummaryProps {
  job: JobRecord;
}

const ApplicationJobSummary = ({
  job,
}: ApplicationJobSummaryProps) => {
  return (
    <aside className={styles.card}>
      <div className={styles.heading}>
        <span>Vị trí đang ứng tuyển</span>

        <h2>{job.title}</h2>

        <p>{job.company}</p>
      </div>

      <div className={styles.divider} />

      <dl className={styles.details}>
        <div>
          <dt>Địa điểm</dt>
          <dd>{job.location}</dd>
        </div>

        <div>
          <dt>Loại hình</dt>
          <dd>{job.type}</dd>
        </div>

        <div>
          <dt>Hình thức</dt>
          <dd>{job.workplace}</dd>
        </div>

        <div>
          <dt>Kinh nghiệm</dt>
          <dd>{job.experience}</dd>
        </div>

        <div>
          <dt>Mức lương</dt>
          <dd className={styles.salary}>
            {job.salary}
          </dd>
        </div>
      </dl>

      <div className={styles.category}>
        <span>Nhóm nghề</span>
        <strong>{job.category}</strong>
      </div>

      <Link
        to={`/jobs/${job.id}`}
        className={styles.jobLink}
      >
        Xem tin tuyển dụng
        <span aria-hidden="true">→</span>
      </Link>

      <div className={styles.notice}>
        <strong>Trước khi gửi hồ sơ</strong>

        <p>
          Kiểm tra CV và thông tin ứng tuyển để đảm
          bảo dữ liệu gửi đến nhà tuyển dụng là chính xác.
        </p>
      </div>
    </aside>
  );
};

export default ApplicationJobSummary;