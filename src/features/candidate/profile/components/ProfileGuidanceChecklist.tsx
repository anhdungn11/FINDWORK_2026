/**
 * FINDWORK CP8B — PROFILE GUIDANCE CHECKLIST (RIGHT RAIL)
 * 
 * Bảng kiểm hướng dẫn gợi ý bổ sung thông tin hồ sơ.
 * ĐẢM BẢO RÀNG BUỘC:
 * - Không tính phần trăm (%).
 * - Không bắt buộc kinh nghiệm hoặc số kỹ năng cố định.
 * - Phân biệt rõ với tiến độ Onboarding 7 bước.
 */

import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { ProfileGuidanceChecklistProps } from "../types/uiProfileProps.types";
import styles from "../styles/ProfileGuidance.module.css";

export const ProfileGuidanceChecklist = ({
  items = [],
  onItemClick,
}: ProfileGuidanceChecklistProps) => {
  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;

  const handleItemClick = (anchorId: string) => {
    if (onItemClick) {
      onItemClick(anchorId);
    } else {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <section
      className={styles.checklistCard}
      aria-labelledby="guidance-checklist-title"
    >
      <div className={styles.checklistHeader}>
        <h3 id="guidance-checklist-title" className={styles.checklistTitle}>
          <Sparkles size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Gợi ý hoàn thiện hồ sơ</span>
        </h3>
        <span className={styles.countBadge}>
          {completedCount}/{totalCount} mục
        </span>
      </div>

      <p className={styles.checklistNotice}>
        Danh sách gợi ý giúp hồ sơ đạt chất lượng cao. Các tiêu chí được thiết kế linh hoạt cho cả người có kinh nghiệm và sinh viên mới tốt nghiệp.
      </p>

      <ul className={styles.checklistsList}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.checklistItemBtn}
              onClick={() => handleItemClick(item.anchorId)}
              aria-label={`${item.title}: ${item.isCompleted ? "Đã hoàn thành" : "Chưa hoàn thành"}`}
            >
              {item.isCompleted ? (
                <CheckCircle2 size={16} className={styles.checkIconDone} aria-hidden="true" />
              ) : (
                <Circle size={16} className={styles.checkIconPending} aria-hidden="true" />
              )}

              <div className={styles.itemMeta}>
                <p
                  className={`${styles.itemTitle} ${
                    item.isCompleted ? styles.itemTitleCompleted : ""
                  }`}
                >
                  <span>{item.title}</span>
                  {item.isOptional && (
                    <span className={styles.optionalTag}>(Tùy chọn)</span>
                  )}
                </p>
                <p className={styles.itemDescription}>{item.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
