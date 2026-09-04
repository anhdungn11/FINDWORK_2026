import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Button from "@/components/common/Button";

import styles from "./JobSearchBar.module.css";

interface JobSearchBarProps {
  keyword: string;
  location: string;
  locations: string[];
  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16L21 21" />
  </svg>
);

const LocationIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M20 10C20 15 12 21 12 21C12 21 4 15 4 10C4 5.6 7.6 2 12 2C16.4 2 20 5.6 20 10Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M7 10L12 15L17 10" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 12L10 17L19 7" />
  </svg>
);

const JobSearchBar = ({
  keyword,
  location,
  locations,
  onKeywordChange,
  onLocationChange,
}: JobSearchBarProps) => {
  const [isLocationOpen, setIsLocationOpen] =
    useState(false);

  const [locationKeyword, setLocationKeyword] =
    useState("");

  const locationRef = useRef<HTMLDivElement>(null);

  const filteredLocations = useMemo(() => {
    const value = locationKeyword
      .trim()
      .toLowerCase();

    if (!value) {
      return locations;
    }

    return locations.filter((item) =>
      item.toLowerCase().includes(value),
    );
  }, [locationKeyword, locations]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        locationRef.current &&
        !locationRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsLocationOpen(false);
      }
    };

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  const handleSelectLocation = (
    value: string,
  ) => {
    onLocationChange(value);
    setIsLocationOpen(false);
    setLocationKeyword("");
  };

  return (
    <div className={styles.searchShell}>
      <div className={styles.keywordSection}>
        <span className={styles.mainIcon}>
          <SearchIcon />
        </span>

        <div className={styles.inputContent}>
          <span className={styles.fieldLabel}>
            Tìm công việc
          </span>

          <input
            type="text"
            value={keyword}
            placeholder="Chức danh, kỹ năng hoặc công ty"
            onChange={(event) =>
              onKeywordChange(
                event.target.value,
              )
            }
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div
        ref={locationRef}
        className={styles.locationSection}
      >
        <button
          type="button"
          className={styles.locationTrigger}
          onClick={() =>
            setIsLocationOpen(
              (current) => !current,
            )
          }
          aria-expanded={isLocationOpen}
        >
          <span
            className={styles.locationIcon}
          >
            <LocationIcon />
          </span>

          <span
            className={styles.locationContent}
          >
            <span
              className={styles.fieldLabel}
            >
              Khu vực làm việc
            </span>

            <strong>
              {location ||
                "Tất cả khu vực"}
            </strong>
          </span>

          <span
            className={`${styles.chevron} ${
              isLocationOpen
                ? styles.chevronOpen
                : ""
            }`}
          >
            <ChevronIcon />
          </span>
        </button>

        {isLocationOpen && (
          <div
            className={styles.locationPanel}
          >
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

              <span
                className={styles.liveMark}
              >
                LIVE
              </span>
            </div>

            <div
              className={
                styles.locationSearch
              }
            >
              <span>
                <SearchIcon />
              </span>

              <input
                type="text"
                value={locationKeyword}
                placeholder="Tìm tỉnh, thành phố..."
                onChange={(event) =>
                  setLocationKeyword(
                    event.target.value,
                  )
                }
                autoFocus
              />
            </div>

            <div
              className={
                styles.locationList
              }
            >
              <button
                type="button"
                className={`${styles.locationOption} ${
                  location === ""
                    ? styles.activeOption
                    : ""
                }`}
                onClick={() =>
                  handleSelectLocation("")
                }
              >
                <span>
                  <strong>
                    Tất cả khu vực
                  </strong>

                  <small>
                    Khám phá toàn bộ cơ hội
                  </small>
                </span>

                {location === "" && (
                  <span
                    className={
                      styles.checkIcon
                    }
                  >
                    <CheckIcon />
                  </span>
                )}
              </button>

              {filteredLocations.map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={`${styles.locationOption} ${
                      location === item
                        ? styles.activeOption
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectLocation(
                        item,
                      )
                    }
                  >
                    <span>
                      <strong>
                        {item}
                      </strong>

                      <small>
                        Xem việc làm tại khu vực này
                      </small>
                    </span>

                    {location === item && (
                      <span
                        className={
                          styles.checkIcon
                        }
                      >
                        <CheckIcon />
                      </span>
                    )}
                  </button>
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

            <div
              className={
                styles.locationFooter
              }
            >
              <span
                className={styles.pulse}
              />

              Khu vực được lấy từ các công
              việc đang tuyển
            </div>
          </div>
        )}
      </div>

      <div className={styles.searchAction}>
        <Button size="large">
          Tìm kiếm
        </Button>
      </div>
    </div>
  );
};

export default JobSearchBar;