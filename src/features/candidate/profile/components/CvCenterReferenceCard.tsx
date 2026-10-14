/**
 * FINDWORK CP8B — CV CENTER REFERENCE CARD
 * 
 * Thẻ tham chiếu trực tiếp đến CV Center (/cv).
 * ĐẢM BẢO RÀNG BUỘC:
 * - Chỉ điều hướng tới /cv.
 * - Không tạo chức năng upload giả hay duplicate CV builder.
 * - Không giả định dữ liệu CV đã lưu ở PostgreSQL.
 */

import { Link } from "react-router-dom";
import { ArrowUpRight, FileText } from "lucide-react";
import styles from "../styles/ProfileGuidance.module.css";

export const CvCenterReferenceCard = () => {
  return (
    <aside className={styles.cvReferenceCard} aria-labelledby="cv-reference-title">
      <h4 id="cv-reference-title" className={styles.cvReferenceTitle}>
        <FileText size={16} aria-hidden="true" />
        <span>Quản lý CV ứng tuyển</span>
      </h4>
      <p className={styles.cvReferenceText}>
        Quản lý các bản CV dùng để nộp đơn vào các vị trí tuyển dụng tại trung tâm CV chuyên biệt.
      </p>
      <Link
        to="/cv"
        className={styles.cvReferenceLink}
        aria-label="Chuyển sang trang Quản lý CV (CV Center)"
      >
        <span>Mở CV Center</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </aside>
  );
};
