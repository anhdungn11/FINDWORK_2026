/**
 * FINDWORK CP8B — PROFILE OVERVIEW CARD
 *
 * Thẻ danh thiếp tổng quan: Avatar Initials, Họ tên, Chức danh,
 * Trạng thái tìm việc, Bio tóm tắt và nút chỉnh sửa nhanh.
 */

import { useState } from "react";
import { Briefcase, Calendar, Mail, MapPin, Pencil } from "lucide-react";
import type { CandidateCareerStatus } from "../types/candidateProfile.types";
import type { ProfileOverviewCardProps } from "../types/uiProfileProps.types";
import { formatCareerStatusLabel, getAvatarInitials } from "../utils/profileFormatters";
import { ProfileOverviewEditModal } from "./ProfileOverviewEditModal";
import styles from "../styles/ProfileSections.module.css";

interface Props extends ProfileOverviewCardProps {
  onSaveOverview?: (data: {
    fullName: string;
    headline?: string;
    bio?: string | null;
    careerStatus: CandidateCareerStatus | null;
  }) => Promise<void> | void;
}

export const ProfileOverviewCard = ({
  fullName,
  email,
  headline,
  careerStatus,
  bio,
  locationName,
  updatedAt,
  onSaveOverview,
  isSaving = false,
  isPreview = false,
  isLiveWritesEnabled = false,
}: Props) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const initials = getAvatarInitials(fullName);

  const getStatusPillClass = (status: CandidateCareerStatus | null) => {
    if (status === "LOOKING_FOR_JOB") {
      return `${styles.statusPill} ${styles.statusPillLooking}`;
    }
    if (status === "EMPLOYED" || status === "STUDENT" || status === "INTERN") {
      return styles.statusPill;
    }
    return `${styles.statusPill} ${styles.statusPillMuted}`;
  };

  const formattedUpdateDate = () => {
    try {
      const d = new Date(updatedAt);
      if (isNaN(d.getTime())) return updatedAt;
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return updatedAt;
    }
  };

  return (
    <>
      <section
        id="section-overview"
        className={styles.overviewCard}
        aria-labelledby="profile-overview-name"
      >
        <div className={styles.overviewContent}>
          {/* Avatar dạng Initials Circle */}
          <div className={styles.avatarContainer}>
            <div
              className={styles.avatarInitialsCircle}
              role="img"
              aria-label={`Ảnh đại diện ký tự ${initials} của ${fullName}`}
            >
              {initials}
            </div>
          </div>

          {/* Metadata & Headline */}
          <div className={styles.overviewMeta}>
            <div className={styles.nameRow}>
              <div>
                <h2 id="profile-overview-name" className={styles.profileName}>
                  {fullName || "Ứng viên chưa đặt tên"}
                </h2>
                {headline && <p className={styles.headlineText}>{headline}</p>}
              </div>

              <button
                type="button"
                className={styles.editButton}
                onClick={() => setIsEditModalOpen(true)}
                aria-label="Chỉnh sửa thông tin tổng quan và giới thiệu ngắn"
              >
                <Pencil size={14} aria-hidden="true" />
                <span>Chỉnh sửa</span>
              </button>
            </div>

            {/* Trạng thái nghề nghiệp */}
            <div>
              <span className={getStatusPillClass(careerStatus)}>
                <Briefcase size={12} aria-hidden="true" />
                <span>{formatCareerStatusLabel(careerStatus)}</span>
              </span>
            </div>

            {/* Thông tin liên hệ nhanh */}
            <div className={styles.quickContactRow}>
              <span className={styles.contactItem}>
                <Mail size={13} aria-hidden="true" />
                <span>{email}</span>
              </span>

              {locationName && (
                <span className={styles.contactItem}>
                  <MapPin size={13} aria-hidden="true" />
                  <span>{locationName}</span>
                </span>
              )}

              <span className={styles.contactItem}>
                <Calendar size={13} aria-hidden="true" />
                <span>Cập nhật: {formattedUpdateDate()}</span>
              </span>
            </div>

            {/* Đoạn Bio giới thiệu */}
            {bio ? (
              <div className={styles.bioBlock}>
                <p style={{ margin: 0 }}>{bio}</p>
              </div>
            ) : (
              <div className={styles.bioBlock} style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>
                <span>Chưa có đoạn giới thiệu ngắn (Bio). Hãy thêm tóm tắt để hồ sơ ấn tượng hơn.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal Chỉnh Sửa Tổng Quan */}
      {isEditModalOpen && (
        <ProfileOverviewEditModal
          isOpen={isEditModalOpen}
          initialData={{ fullName, headline, bio, careerStatus }}
          isSaving={isSaving}
          isPreview={isPreview}
          isLiveWritesEnabled={isLiveWritesEnabled}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (data) => {
            if (onSaveOverview) {
              await onSaveOverview(data);
            }
          }}
        />
      )}
    </>
  );
};
