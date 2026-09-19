import {
  useState,
} from "react";

import type {
  CareerPreferences,
} from "@/features/candidate/types/onboarding.types";

import {
  MAX_DESIRED_POSITIONS,
  MAX_PREFERRED_CATEGORIES,
} from "../utils/career-preferences.constants";

interface UseCareerPreferenceTargetsOptions {
  value: CareerPreferences;
  onChange: (
    value: CareerPreferences,
  ) => void;
}

const normalizeText = (
  value: string,
) => value.trim().replace(/\s+/g, " ");

export const useCareerPreferenceTargets = ({
  value,
  onChange,
}: UseCareerPreferenceTargetsOptions) => {
  const [positionInput, setPositionInput] =
    useState("");
  const [positionError, setPositionError] =
    useState("");

  const update = (
    patch: Partial<CareerPreferences>,
  ) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const addDesiredPosition = () => {
    const position = normalizeText(
      positionInput,
    );

    if (!position) {
      return;
    }

    if (
      value.desiredPositions.length >=
      MAX_DESIRED_POSITIONS
    ) {
      setPositionError(
        `Bạn chỉ có thể chọn tối đa ${MAX_DESIRED_POSITIONS} vị trí mong muốn.`,
      );
      return;
    }

    const alreadyExists =
      value.desiredPositions.some(
        (current) =>
          current.toLocaleLowerCase() ===
          position.toLocaleLowerCase(),
      );

    if (alreadyExists) {
      setPositionError(
        "Vị trí này đã có trong danh sách.",
      );
      return;
    }

    update({
      desiredPositions: [
        ...value.desiredPositions,
        position,
      ],
    });

    setPositionInput("");
    setPositionError("");
  };

  const removeDesiredPosition = (
    position: string,
  ) => {
    update({
      desiredPositions:
        value.desiredPositions.filter(
          (current) => current !== position,
        ),
    });
    setPositionError("");
  };

  const addCategory = (
    categoryCode: string,
  ) => {
    if (
      !categoryCode ||
      value.preferredCategoryCodes.includes(
        categoryCode,
      ) ||
      value.preferredCategoryCodes.length >=
        MAX_PREFERRED_CATEGORIES
    ) {
      return;
    }

    update({
      preferredCategoryCodes: [
        ...value.preferredCategoryCodes,
        categoryCode,
      ],
    });
  };

  const removeCategory = (
    categoryCode: string,
  ) => {
    update({
      preferredCategoryCodes:
        value.preferredCategoryCodes.filter(
          (current) =>
            current !== categoryCode,
        ),
    });
  };

  const setNationwide = (
    nationwide: boolean,
  ) => {
    update({
      locationPreference: {
        mode: nationwide
          ? "nationwide"
          : "selected",
        provinceCodes: [],
      },
    });
  };

  const addProvince = (
    provinceCode: string,
  ) => {
    if (
      !provinceCode ||
      value.locationPreference.mode ===
        "nationwide" ||
      value.locationPreference.provinceCodes.includes(
        provinceCode,
      )
    ) {
      return;
    }

    update({
      locationPreference: {
        mode: "selected",
        provinceCodes: [
          ...value.locationPreference
            .provinceCodes,
          provinceCode,
        ],
      },
    });
  };

  const removeProvince = (
    provinceCode: string,
  ) => {
    update({
      locationPreference: {
        ...value.locationPreference,
        provinceCodes:
          value.locationPreference.provinceCodes.filter(
            (current) =>
              current !== provinceCode,
          ),
      },
    });
  };

  return {
    positionInput,
    setPositionInput,
    positionError,
    addDesiredPosition,
    removeDesiredPosition,
    addCategory,
    removeCategory,
    setNationwide,
    addProvince,
    removeProvince,
  };
};
