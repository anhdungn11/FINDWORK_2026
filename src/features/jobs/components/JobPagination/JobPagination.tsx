import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./JobPagination.module.css";

interface JobPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const JobPagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: JobPaginationProps) => {
  if (totalPages <= 1) {
    if (totalItems > 0) {
      return (
        <div className={styles.paginationContainer} style={{ borderTop: "none", marginTop: 24 }}>
          <p className={styles.summaryText}>
            Hiển thị tất cả <strong>{totalItems}</strong> việc làm
          </p>
        </div>
      );
    }
    return null;
  }

  const fromItem = (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers window
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className={styles.paginationContainer}
      role="navigation"
      aria-label="Phân trang việc làm"
      data-testid="job-pagination"
    >
      <p className={styles.summaryText}>
        Hiển thị <strong>{fromItem}</strong> - <strong>{toItem}</strong> trong tổng số{" "}
        <strong>{totalItems}</strong> việc làm (Trang {currentPage} / {totalPages})
      </p>

      <div className={styles.controlsRow}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          data-testid="pagination-prev"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Trước</span>
        </button>

        {pageNumbers.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis} aria-hidden="true">
                ...
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={`page-${item}`}
              type="button"
              className={`${styles.pageButton} ${isActive ? styles.activePage : ""}`}
              onClick={() => onPageChange(item)}
              aria-label={`Trang ${item}`}
              aria-current={isActive ? "page" : undefined}
              data-testid={`pagination-page-${item}`}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          className={styles.navButton}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
          data-testid="pagination-next"
        >
          <span>Sau</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default JobPagination;
