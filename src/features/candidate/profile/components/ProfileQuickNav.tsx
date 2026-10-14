/**
 * FINDWORK CP8B — PROFILE QUICK ANCHOR NAVIGATION
 * 
 * Cho phép người dùng chuyển nhanh đến các phân khu chính của hồ sơ.
 */

import { ArrowRight } from "lucide-react";
import styles from "../styles/ProfileGuidance.module.css";

const SECTIONS = [
  { id: "section-overview", label: "Tổng quan & Bio" },
  { id: "section-personal", label: "Thông tin cá nhân" },
  { id: "section-education", label: "Học vấn & Bằng cấp" },
  { id: "section-experience", label: "Kinh nghiệm làm việc" },
  { id: "section-skills", label: "Kỹ năng chuyên môn" },
  { id: "section-languages", label: "Ngoại ngữ & Chứng chỉ" },
  { id: "section-preferences", label: "Nguyện vọng nghề nghiệp" },
  { id: "section-privacy", label: "Thiết lập quyền riêng tư" },
];

export const ProfileQuickNav = () => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      target.focus({ preventScroll: true });
    }
  };

  return (
    <nav className={styles.quickNavCard} aria-label="Điều hướng nhanh hồ sơ">
      <h4 className={styles.quickNavTitle}>Mục lục hồ sơ</h4>
      <ul className={styles.quickNavList}>
        {SECTIONS.map((sec) => (
          <li key={sec.id}>
            <a
              href={`#${sec.id}`}
              className={styles.quickNavLink}
              onClick={(e) => handleScroll(e, sec.id)}
            >
              <span>{sec.label}</span>
              <ArrowRight size={12} aria-hidden="true" style={{ opacity: 0.6 }} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
