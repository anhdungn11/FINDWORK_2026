import Button from "@/components/common/Button";

import KeywordSearchField from "./components/KeywordSearchField";
import LocationPicker from "./components/LocationPicker";

import {
  useLocationPicker,
} from "./hooks/useLocationPicker";

import styles from "./styles/JobSearchBarLayout.module.css";

interface JobSearchBarProps {
  keyword: string;
  location: string;
  locations: string[];

  onKeywordChange: (
    value: string,
  ) => void;

  onLocationChange: (
    value: string,
  ) => void;
}

const JobSearchBar = ({
  keyword,
  location,
  locations,
  onKeywordChange,
  onLocationChange,
}: JobSearchBarProps) => {
  const {
    isLocationOpen,
    locationKeyword,
    filteredLocations,
    locationRef,

    setLocationKeyword,
    toggleLocation,
    handleSelectLocation,
  } = useLocationPicker({
    locations,
    onLocationChange,
  });

  return (
    <div className={styles.searchShell}>
      <KeywordSearchField
        keyword={keyword}
        onKeywordChange={
          onKeywordChange
        }
      />

      <div className={styles.divider} />

      <LocationPicker
        location={location}
        isOpen={isLocationOpen}
        locationKeyword={
          locationKeyword
        }
        filteredLocations={
          filteredLocations
        }
        locationRef={locationRef}
        onToggle={toggleLocation}
        onKeywordChange={
          setLocationKeyword
        }
        onSelect={
          handleSelectLocation
        }
      />

      <div className={styles.searchAction}>
        <Button size="large">
          Tìm kiếm
        </Button>
      </div>
    </div>
  );
};

export default JobSearchBar;
