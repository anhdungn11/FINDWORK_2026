import type { OnboardingStep } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/OnboardingContent.module.css";

interface PendingOnboardingStepProps { step: OnboardingStep; }

const PendingOnboardingStep = ({ step }: PendingOnboardingStepProps) => (
  <div className={styles.pendingStep}>
    <span>STEP {step.number}</span>
    <h3>{step.title}</h3>
    <p>Phần này sẽ được xây ở bước tiếp theo.</p>
  </div>
);

export default PendingOnboardingStep;
