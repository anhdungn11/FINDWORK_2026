import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface UseLocationPickerParams {
  locations: string[];
  onLocationChange: (
    value: string,
  ) => void;
}

export const useLocationPicker = ({
  locations,
  onLocationChange,
}: UseLocationPickerParams) => {
  const [
    isLocationOpen,
    setIsLocationOpen,
  ] = useState(false);

  const [
    locationKeyword,
    setLocationKeyword,
  ] = useState("");

  const locationRef =
    useRef<HTMLDivElement>(null);

  const filteredLocations =
    useMemo(() => {
      const value =
        locationKeyword
          .trim()
          .toLowerCase();

      if (!value) {
        return locations;
      }

      return locations.filter(
        (item) =>
          item
            .toLowerCase()
            .includes(value),
      );
    }, [
      locationKeyword,
      locations,
    ]);

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
      if (
        event.key === "Escape"
      ) {
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

  const toggleLocation = () => {
    setIsLocationOpen(
      (current) => !current,
    );
  };

  const handleSelectLocation = (
    value: string,
  ) => {
    onLocationChange(value);
    setIsLocationOpen(false);
    setLocationKeyword("");
  };

  return {
    isLocationOpen,
    locationKeyword,
    filteredLocations,
    locationRef,

    setLocationKeyword,
    toggleLocation,
    handleSelectLocation,
  };
};
