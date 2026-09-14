import {
  CheckIcon,
  SearchIcon,
} from "./JobSearchIcons";

import styles from "../styles/LocationPanel.module.css";

interface LocationPanelProps {
  location: string;
  locationKeyword: string;
  filteredLocations: string[];

  onKeywordChange: (
    value: string,
  ) => void;

  onSelect: (
    value: string,
  ) => void;
}

const LocationPanel = ({
  location,
  locationKeyword,
  filteredLocations,
  onKeywordChange,
  onSelect,
}: LocationPanelProps) => {
  return (
    <div className={styles.locationPanel}>
      <div
        className={
          styles.locationPanelHeader
        }
      >
        <div>
          <span
            className={
              styles.panelEyebrow
            }
          >
            FINDWORK LOCATION
          </span>

          <h3>
            Bạn muốn làm việc ở đâu?
          </h3>
        </div>

        <span className={styles.liveMark}>
          LIVE
        </span>
      </div>

      <div
        className={styles.locationSearch}
      >
        <span>
          <SearchIcon />
        </span>

        <input
          type="text"
          value={locationKeyword}
          placeholder="Tìm tỉnh, thành phố..."
          onChange={(event) =>
            onKeywordChange(
              event.target.value,
            )
          }
          autoFocus
        />
      </div>

      <div className={styles.locationList}>
        <LocationOption
          value=""
          label="Tất cả khu vực"
          description="Khám phá toàn bộ cơ hội"
          isActive={location === ""}
          onSelect={onSelect}
        />

        {filteredLocations.map(
          (item) => (
            <LocationOption
              key={item}
              value={item}
              label={item}
              description="Xem việc làm tại khu vực này"
              isActive={
                location === item
              }
              onSelect={onSelect}
            />
          ),
        )}

        {filteredLocations.length ===
          0 && (
          <div
            className={
              styles.noLocation
            }
          >
            Không tìm thấy khu vực.
          </div>
        )}
      </div>

      <div className={styles.locationFooter}>
        <span className={styles.pulse} />

        Khu vực được lấy từ các công việc
        đang tuyển
      </div>
    </div>
  );
};

interface LocationOptionProps {
  value: string;
  label: string;
  description: string;
  isActive: boolean;

  onSelect: (
    value: string,
  ) => void;
}

const LocationOption = ({
  value,
  label,
  description,
  isActive,
  onSelect,
}: LocationOptionProps) => {
  return (
    <button
      type="button"
      className={`${styles.locationOption} ${
        isActive
          ? styles.activeOption
          : ""
      }`}
      onClick={() =>
        onSelect(value)
      }
    >
      <span>
        <strong>{label}</strong>

        <small>{description}</small>
      </span>

      {isActive && (
        <span className={styles.checkIcon}>
          <CheckIcon />
        </span>
      )}
    </button>
  );
};

export default LocationPanel;
