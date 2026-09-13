import type { OnboardingStep } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/OnboardingContent.module.css";

interface OnboardingContentHeaderProps {
  currentStep: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
}

const OnboardingContentHeader = ({ currentStep, currentStepIndex, totalSteps }: OnboardingContentHeaderProps) => (
  <div className={styles.contentHeader}>
    <span className={styles.stepCounter}>Bước {currentStepIndex + 1} / {totalSteps}</span>
    <h2>{currentStep.title}</h2>
    <p>{currentStep.description}</p>
  </div>
);

export default OnboardingContentHeader;
