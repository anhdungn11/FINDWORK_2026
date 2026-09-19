import {
  VIETNAM_PROVINCES,
  getProvinceByCode,
} from "@/data/reference/locations/provinces";

import styles from "../styles/PreferenceField.module.css";

interface PreferredLocationsFieldProps {
  mode: "selected" | "nationwide";
  provinceCodes: string[];
  onNationwideChange: (
    checked: boolean,
  ) => void;
  onAddProvince: (
    provinceCode: string,
  ) => void;
  onRemoveProvince: (
    provinceCode: string,
  ) => void;
}

const PreferredLocationsField = ({
  mode,
  provinceCodes,
  onNationwideChange,
  onAddProvince,
  onRemoveProvince,
}: PreferredLocationsFieldProps) => {
  const isNationwide =
    mode === "nationwide";

  const availableProvinces =
    VIETNAM_PROVINCES.filter(
      (province) =>
        !provinceCodes.includes(
          province.code,
        ),
    );

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            ĐỊA ĐIỂM
          </span>
          <h4>Bạn muốn làm việc ở đâu?</h4>
        </div>
      </div>

      <p className={styles.helper}>
        Chọn tỉnh/thành mong muốn. Remote được quản lý riêng ở hình thức làm việc, không phải là địa điểm.
      </p>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isNationwide}
          onChange={(event) =>
            onNationwideChange(
              event.target.checked,
            )
          }
        />
        <span>
          Tôi có thể làm việc trên toàn quốc
        </span>
      </label>

      {!isNationwide && (
        <>
          <select
            value=""
            onChange={(event) =>
              onAddProvince(
                event.target.value,
              )
            }
          >
            <option value="">
              Chọn tỉnh / thành phố
            </option>

            {availableProvinces.map(
              (province) => (
                <option
                  key={province.code}
                  value={province.code}
                >
                  {province.name}
                </option>
              ),
            )}
          </select>

          {provinceCodes.length > 0 && (
            <div className={styles.chips}>
              {provinceCodes.map(
                (provinceCode) => {
                  const province =
                    getProvinceByCode(
                      provinceCode,
                    );

                  return (
                    <span
                      key={provinceCode}
                      className={styles.chip}
                    >
                      {province?.name ??
                        provinceCode}
                      <button
                        type="button"
                        aria-label={`Xóa ${province?.name ?? provinceCode}`}
                        onClick={() =>
                          onRemoveProvince(
                            provinceCode,
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  );
                },
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PreferredLocationsField;
