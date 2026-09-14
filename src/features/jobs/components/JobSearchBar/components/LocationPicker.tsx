import type {
  RefObject,
} from "react";

import {
  ChevronIcon,
  LocationIcon,
} from "./JobSearchIcons";

import LocationPanel from "./LocationPanel";

import styles from "../styles/LocationPicker.module.css";

interface LocationPickerProps {
  location: string;
  isOpen: boolean;
  locationKeyword: string;
  filteredLocations: string[];

  locationRef:
    RefObject<HTMLDivElement | null>;

  onToggle: () => void;

  onKeywordChange: (
    value: string,
  ) => void;

  onSelect: (
    value: string,
  ) => void;
}

const LocationPicker = ({
  location,
  isOpen,
  locationKeyword,
  filteredLocations,
  locationRef,
  onToggle,
  onKeywordChange,
  onSelect,
}: LocationPickerProps) => {
  return (
    <div
      ref={locationRef}
      className={styles.locationSection}
    >
      <button
        type="button"
        className={styles.locationTrigger}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span
          className={styles.locationIcon}
        >
          <LocationIcon />
        </span>

        <span
          className={
            styles.locationContent
          }
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
            isOpen
              ? styles.chevronOpen
              : ""
          }`}
        >
          <ChevronIcon />
        </span>
      </button>

      {isOpen && (
        <LocationPanel
          location={location}
          locationKeyword={
            locationKeyword
          }
          filteredLocations={
            filteredLocations
          }
          onKeywordChange={
            onKeywordChange
          }
          onSelect={onSelect}
        />
      )}
    </div>
  );
};

export default LocationPicker;
