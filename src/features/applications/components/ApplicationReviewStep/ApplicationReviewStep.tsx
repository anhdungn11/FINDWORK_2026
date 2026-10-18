import { Edit2, ShieldAlert, AlertTriangle, Briefcase, FileText, User, Clock, MessageSquare, HelpCircle } from "lucide-react";
import type { Resume } from "@/features/resume/types/resume.types";
import type { ApplicationStep, ScreeningAnswerValue } from "@/features/applications/types/application.types";
import type { ScreeningQuestionItem } from "@/features/applications/utils/applicationValidation";

import styles from "./ApplicationReviewStep.module.css";

const AVAILABILITY_LABELS: Record<string, string> = {
  immediately: "Có thể đi làm ngay",
  "within-1-week": "Trong vòng 1 tuần",
  "within-2-weeks": "Trong vòng 2 tuần",
  "within-1-month": "Trong vòng 1 tháng",
  negotiable: "Thương lượng thời gian",
};

export interface ApplicationReviewStepProps {
  job: {
    id: string | number;
    title: string;
    companyName?: string | null;
    categoryName?: string | null;
    employmentTypeLabel?: string | null;
    workplaceTypeLabel?: string | null;
    salaryText?: string | null;
    locationText?: string | null;
  };
  selectedResume: Resume | null;
  details: {
    contact: {
      fullName: string;
      email: string;
      phone: string;
    };
    currentLocation?: string;
    availability?: string;
    preferredContactMethod?: "email" | "phone";
    coverLetter?: string;
  };
  questions: ScreeningQuestionItem[];
  screeningAnswers: Record<string, ScreeningAnswerValue>;
  onEditStep: (step: ApplicationStep) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isDemo?: boolean;
  isLiveWritesEnabled?: boolean;
}

export const ApplicationReviewStep = ({
  job,
  selectedResume,
  details,
  questions,
  screeningAnswers,
  onEditStep,
  onSubmit,
  isSubmitting = false,
  isDemo = false,
  isLiveWritesEnabled = false,
}: ApplicationReviewStepProps) => {
  const availabilityText = details.availability
    ? AVAILABILITY_LABELS[details.availability] ?? details.availability
    : "Chưa chọn";

  const contactMethodText =
    details.preferredContactMethod === "phone" ? "Số điện thoại" : "Email";

  const renderScreeningAnswer = (q: ScreeningQuestionItem) => {
    const rawVal = screeningAnswers[q.id];

    if (rawVal === undefined || rawVal === null || rawVal === "") {
      return <span className={styles.fieldValueEmpty}>Chưa trả lời</span>;
    }

    if (typeof rawVal === "boolean") {
      return rawVal ? (
        <span className={styles.yesBadge}>Có</span>
      ) : (
        <span className={styles.noBadge}>Không</span>
      );
    }

    if (Array.isArray(rawVal)) {
      if (rawVal.length === 0) {
        return <span className={styles.fieldValueEmpty}>Chưa chọn lựa chọn nào</span>;
      }
      return (
        <div className={styles.pillList}>
          {rawVal.map((item) => (
            <span key={item} className={styles.pillBadge}>
              {item}
            </span>
          ))}
        </div>
      );
    }

    return <span className={styles.fieldValue}>{String(rawVal)}</span>;
  };

  return (
    <section className={styles.card} aria-labelledby="review-step-title">
      <header className={styles.header}>
        <span className={styles.stepBadge}>Bước 4 / 4</span>
        <h2 id="review-step-title" className={styles.title}>
          Xem lại và xác nhận hồ sơ ứng tuyển
        </h2>
        <p className={styles.subtitle}>
          Vui lòng kiểm tra kỹ lưỡng toàn bộ thông tin đã nhập trước khi chính thức gửi hồ sơ đến nhà tuyển dụng.
        </p>
      </header>

      <div className={styles.sectionsList}>
        {/* MỤC 1: Thông tin việc làm và Doanh nghiệp */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Briefcase size={16} aria-hidden="true" color="#2563eb" />
              1. Vị trí ứng tuyển & Doanh nghiệp
            </h3>
            {isDemo ? (
              <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Bản tin mẫu (Demo)
              </span>
            ) : (
              <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                Tin tuyển dụng chính thức
              </span>
            )}
          </div>
          <div className={styles.gridTwoCols}>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Vị trí ứng tuyển</span>
              <span className={styles.fieldValue} style={{ fontWeight: 700, color: "#1d4ed8" }}>
                {job.title}
              </span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Doanh nghiệp</span>
              <span className={styles.fieldValue}>{job.companyName || "Chưa cập nhật"}</span>
            </div>
            {job.categoryName && (
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Ngành nghề</span>
                <span className={styles.fieldValue}>{job.categoryName}</span>
              </div>
            )}
            {job.locationText && (
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Địa điểm làm việc</span>
                <span className={styles.fieldValue}>{job.locationText}</span>
              </div>
            )}
            {job.employmentTypeLabel && (
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Hình thức làm việc</span>
                <span className={styles.fieldValue}>{job.employmentTypeLabel}</span>
              </div>
            )}
            {job.salaryText && (
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Mức lương</span>
                <span className={styles.fieldValue}>{job.salaryText}</span>
              </div>
            )}
          </div>
        </div>

        {/* MỤC 2: CV đính kèm */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FileText size={16} aria-hidden="true" color="#2563eb" />
              2. Bản CV đính kèm
            </h3>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => onEditStep("resume")}
              aria-label="Thay đổi CV ứng tuyển"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>Thay đổi</span>
            </button>
          </div>
          <div className={styles.gridTwoCols}>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Tên bản CV</span>
              <span className={styles.fieldValue} style={{ fontWeight: 700 }}>
                {selectedResume?.name || "CV mặc định"}
              </span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Phiên bản</span>
              <span className={styles.fieldValue}>
                v{selectedResume?.currentVersion?.versionNumber || 1}
              </span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Hình thức tạo CV</span>
              <span className={styles.fieldValue}>
                {selectedResume?.sourceType === "builder" ? "Tạo trực tuyến (CV Builder)" : "Tệp tin PDF tải lên"}
              </span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Cập nhật gần nhất</span>
              <span className={styles.fieldValue}>
                {selectedResume?.updatedAt
                  ? new Date(selectedResume.updatedAt).toLocaleDateString("vi-VN")
                  : "Hôm nay"}
              </span>
            </div>
          </div>
        </div>

        {/* MỤC 3: Thông tin liên hệ ứng viên */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <User size={16} aria-hidden="true" color="#2563eb" />
              3. Thông tin liên hệ ứng viên
            </h3>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => onEditStep("details")}
              aria-label="Chỉnh sửa thông tin liên hệ"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>Chỉnh sửa</span>
            </button>
          </div>
          <div className={styles.gridTwoCols}>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Họ và tên</span>
              <span className={styles.fieldValue}>{details.contact.fullName || "Chưa nhập"}</span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Email</span>
              <span className={styles.fieldValue}>{details.contact.email || "Chưa nhập"}</span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Số điện thoại</span>
              <span className={styles.fieldValue}>{details.contact.phone || "Chưa nhập"}</span>
            </div>
          </div>
        </div>

        {/* MỤC 4: Thông tin sẵn sàng làm việc */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Clock size={16} aria-hidden="true" color="#2563eb" />
              4. Mức độ sẵn sàng làm việc
            </h3>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => onEditStep("details")}
              aria-label="Chỉnh sửa thời gian và phương thức liên hệ"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>Chỉnh sửa</span>
            </button>
          </div>
          <div className={styles.gridTwoCols}>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Nơi ở hiện tại</span>
              <span className={styles.fieldValue}>
                {details.currentLocation || "Chưa cập nhật"}
              </span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Thời gian có thể bắt đầu làm việc</span>
              <span className={styles.fieldValue}>{availabilityText}</span>
            </div>
            <div className={styles.fieldItem}>
              <span className={styles.fieldLabel}>Phương thức liên hệ ưu tiên</span>
              <span className={styles.fieldValue}>{contactMethodText}</span>
            </div>
          </div>
        </div>

        {/* MỤC 5: Thư giới thiệu */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <MessageSquare size={16} aria-hidden="true" color="#2563eb" />
              5. Thư giới thiệu (Cover Letter)
            </h3>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => onEditStep("details")}
              aria-label="Chỉnh sửa thư giới thiệu"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>Chỉnh sửa</span>
            </button>
          </div>
          {details.coverLetter && details.coverLetter.trim() ? (
            <div className={styles.coverLetterBox}>{details.coverLetter.trim()}</div>
          ) : (
            <span className={styles.fieldValueEmpty}>Không đính kèm thư giới thiệu (Tùy chọn)</span>
          )}
        </div>

        {/* MỤC 6: Câu trả lời câu hỏi sàng lọc */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <HelpCircle size={16} aria-hidden="true" color="#2563eb" />
              6. Câu hỏi sàng lọc của nhà tuyển dụng
            </h3>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => onEditStep("questions")}
              aria-label="Chỉnh sửa câu trả lời sàng lọc"
            >
              <Edit2 size={12} aria-hidden="true" />
              <span>Chỉnh sửa</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div>
              <span className={styles.fieldValueEmpty}>
                Vị trí này không yêu cầu câu hỏi sàng lọc bổ sung bắt buộc.
              </span>
              {typeof screeningAnswers["notes"] === "string" && screeningAnswers["notes"].trim() && (
                <div style={{ marginTop: 12 }}>
                  <span className={styles.fieldLabel}>Ghi chú thêm cho nhà tuyển dụng:</span>
                  <div className={styles.fieldValue} style={{ marginTop: 4 }}>
                    {screeningAnswers["notes"].trim()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.qaList}>
              {questions.map((q, idx) => (
                <div key={q.id} className={styles.qaItem}>
                  <div className={styles.qaQuestion}>
                    {idx + 1}. {q.label}
                  </div>
                  <div className={styles.qaAnswer}>{renderScreeningAnswer(q)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MỤC 7: Trạng thái và Xác nhận nộp đơn */}
      {isDemo && (
        <aside className={`${styles.bannerNotice} ${styles.bannerWarning}`} role="status">
          <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Bản tin mẫu (Demo):</strong> Đây là bản xem trước phục vụ trải nghiệm luồng ứng tuyển 4 bước. Tính năng gửi đơn ứng tuyển chưa được kết nối; Chưa có đơn ứng tuyển nào được gửi tới máy chủ.
          </div>
        </aside>
      )}

      {!isDemo && !isLiveWritesEnabled && (
        <aside className={`${styles.bannerNotice} ${styles.bannerInfo}`} role="note">
          <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Chế độ an toàn kiểm thử (ENABLE_LIVE_WRITES: false):</strong> Cổng ghi cơ sở dữ liệu trực tiếp đang được tạm khóa để bảo đảm an toàn theo quy định sprint. Đơn của bạn chưa được gửi vào máy chủ. Toàn bộ thông tin nộp đơn (POST /api/v1/jobs/:jobId/applications) đã được xác thực hoàn chỉnh theo đúng chuẩn dữ liệu backend.
          </div>
        </aside>
      )}

      <footer className={styles.buttonRow}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => onEditStep("questions")}
        >
          ← Sửa câu hỏi
        </button>
        <button
          type="button"
          className={styles.submitBtn}
          disabled={isDemo || !isLiveWritesEnabled || isSubmitting}
          onClick={onSubmit}
          title={
            isDemo
              ? "Chưa hỗ trợ gửi đơn ứng tuyển cho tin mẫu"
              : !isLiveWritesEnabled
              ? "Cổng ghi an toàn đang khóa theo quy định sprint"
              : "Xác nhận nộp đơn ứng tuyển"
          }
        >
          {isSubmitting
            ? "Đang gửi đơn..."
            : isDemo
            ? "Nộp đơn (Bản xem trước Demo)"
            : isLiveWritesEnabled
            ? "Xác nhận nộp đơn ứng tuyển"
            : "Nộp đơn (Cổng ghi an toàn đang khóa)"}
        </button>
      </footer>
    </section>
  );
};

export default ApplicationReviewStep;
