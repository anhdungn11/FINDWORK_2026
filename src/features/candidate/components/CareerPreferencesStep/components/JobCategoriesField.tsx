import {
  JOB_CATEGORY_OPTIONS,
  getJobCategoryByCode,
} from "@/data/reference/jobs/job-categories";

import {
  MAX_PREFERRED_CATEGORIES,
} from "../utils/career-preferences.constants";

import styles from "../styles/PreferenceField.module.css";

interface JobCategoriesFieldProps {
  selectedCodes: string[];
  onAdd: (
    categoryCode: string,
  ) => void;
  onRemove: (
    categoryCode: string,
  ) => void;
}

const JobCategoriesField = ({
  selectedCodes,
  onAdd,
  onRemove,
}: JobCategoriesFieldProps) => {
  const availableCategories =
    JOB_CATEGORY_OPTIONS.filter(
      (category) =>
        !selectedCodes.includes(
          category.code,
        ),
    );

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            NGÀNH NGHỀ
          </span>
          <h4>Nhóm nghề bạn quan tâm</h4>
        </div>

        <span className={styles.counter}>
          {selectedCodes.length}/
          {MAX_PREFERRED_CATEGORIES}
        </span>
      </div>

      <p className={styles.helper}>
        Danh mục này dùng chung với Job Search và sau này sẽ được lấy từ reference API.
      </p>

      <select
        value=""
        disabled={
          selectedCodes.length >=
          MAX_PREFERRED_CATEGORIES
        }
        onChange={(event) => {
          onAdd(event.target.value);
        }}
      >
        <option value="">
          Chọn ngành nghề
        </option>

        {availableCategories.map(
          (category) => (
            <option
              key={category.code}
              value={category.code}
            >
              {category.name}
            </option>
          ),
        )}
      </select>

      {selectedCodes.length > 0 && (
        <div className={styles.chips}>
          {selectedCodes.map((code) => {
            const category =
              getJobCategoryByCode(code);

            return (
              <span
                key={code}
                className={styles.chip}
              >
                {category?.name ?? code}
                <button
                  type="button"
                  aria-label={`Xóa ${category?.name ?? code}`}
                  onClick={() =>
                    onRemove(code)
                  }
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default JobCategoriesField;
