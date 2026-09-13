import {
  useMemo,
  useState,
} from "react";

import {
  INITIAL_ONBOARDING_DATA,
  ONBOARDING_STEPS,
} from "@/features/candidate/utils/onboarding.constants";

import type {
  CandidateOnboardingData,
  OnboardingStepId,
} from "@/features/candidate/types/onboarding.types";

export const useCandidateOnboarding = () => {
  const [currentStepIndex, setCurrentStepIndex] =
    useState(0);

  const [data, setData] =
    useState<CandidateOnboardingData>(
      INITIAL_ONBOARDING_DATA,
    );

  const currentStep =
    ONBOARDING_STEPS[currentStepIndex];

  const progress = useMemo(() => {
    return Math.round(
      ((currentStepIndex + 1) /
        ONBOARDING_STEPS.length) *
        100,
    );
  }, [currentStepIndex]);

  const isFirstStep =
    currentStepIndex === 0;

  const isLastStep =
    currentStepIndex ===
    ONBOARDING_STEPS.length - 1;

  const updateSection = <
    Section extends keyof CandidateOnboardingData,
  >(
    section: Section,
    value: CandidateOnboardingData[Section],
  ) => {
    setData((current) => ({
      ...current,
      [section]: value,
    }));
  };

  const goNext = () => {
    if (isLastStep) {
      return;
    }

    setCurrentStepIndex(
      (current) => current + 1,
    );
  };

  const goPrevious = () => {
    if (isFirstStep) {
      return;
    }

    setCurrentStepIndex(
      (current) => current - 1,
    );
  };

  const goToStep = (
    stepId: OnboardingStepId,
  ) => {
    const index =
      ONBOARDING_STEPS.findIndex(
        (step) => step.id === stepId,
      );

    if (index === -1) {
      return;
    }

    setCurrentStepIndex(index);
  };

  const reset = () => {
    setData(INITIAL_ONBOARDING_DATA);
    setCurrentStepIndex(0);
  };

  return {
    data,
    setData,
    updateSection,

    steps: ONBOARDING_STEPS,
    currentStep,
    currentStepIndex,
    progress,

    isFirstStep,
    isLastStep,
    goNext,
    goPrevious,
    goToStep,
    reset,
  };
};