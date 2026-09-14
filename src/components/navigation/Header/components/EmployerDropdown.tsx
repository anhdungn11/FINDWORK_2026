import { Link } from "react-router-dom";

import dropdownStyles from "../styles/HeaderDropdown.module.css";
import styles from "../styles/EmployerDropdown.module.css";

interface EmployerDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const EmployerDropdown = ({
  isOpen,
  onToggle,
  onClose,
}: EmployerDropdownProps) => {
  return (
    <div
      className={dropdownStyles.dropdown}
    >
      <button
        type="button"
        className={
          dropdownStyles.employerButton
        }
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>
          Dành cho nhà tuyển dụng
        </span>

        <span
          className={`${
            dropdownStyles.chevron
          } ${
            isOpen
              ? dropdownStyles.chevronOpen
              : ""
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          className={`${
            dropdownStyles.dropdownMenu
          } ${styles.employerMenu}`}
        >
          <div
            className={styles.employerIntro}
          >
            <span
              className={`${
                dropdownStyles.dropdownEyebrow
              } ${styles.employerEyebrow}`}
            >
              FINDWORK FOR BUSINESS
            </span>

            <strong>
              Tuyển đúng người, nhanh hơn.
            </strong>

            <p>
              Quản lý tin tuyển dụng và
              ứng viên trong một workspace.
            </p>
          </div>

          <div
            className={styles.menuDivider}
          />

          <Link
            to="/employer/login"
            className={
              styles.employerMenuItem
            }
            onClick={onClose}
          >
            <span
              className={styles.menuItemIcon}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 11V7a3 3 0 0 1 6 0v4" />

                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="9"
                  rx="2"
                />
              </svg>
            </span>

            <span>
              <strong>
                Đăng nhập nhà tuyển dụng
              </strong>

              <small>
                Truy cập workspace tuyển dụng
              </small>
            </span>
          </Link>

          <Link
            to="/employer/register"
            className={
              styles.employerMenuItem
            }
            onClick={onClose}
          >
            <span
              className={styles.menuItemIcon}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 20V8l8-4 8 4v12" />
                <path d="M9 20v-5h6v5" />
                <path d="M8 10h.01M12 10h.01M16 10h.01" />
              </svg>
            </span>

            <span>
              <strong>
                Đăng ký doanh nghiệp
              </strong>

              <small>
                Tạo hồ sơ và bắt đầu tuyển dụng
              </small>
            </span>
          </Link>

          <Link
            to="/employer/jobs/create"
            className={
              styles.employerMenuItem
            }
            onClick={onClose}
          >
            <span
              className={styles.menuItemIcon}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="15"
                  rx="2"
                />

                <path d="M8 3v4M16 3v4M8 11h8M8 15h5" />
              </svg>
            </span>

            <span>
              <strong>
                Đăng tin tuyển dụng
              </strong>

              <small>
                Tạo cơ hội việc làm mới
              </small>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmployerDropdown;
