import type {
  ApplicationStep,
} from "@/features/applications/types/application.types";

import styles from "./ApplicationStepper.module.css";

interface ApplicationStepperProps {
  currentStep: ApplicationStep;
}

const steps: {
  id: ApplicationStep;
  label: string;
}[] = [
  {
    id: "resume",
    label: "Chọn CV",
  },
  {
    id: "details",
    label: "Thông tin ứng tuyển",
  },
  {
    id: "questions",
    label: "Câu hỏi",
  },
  {
    id: "review",
    label: "Xem lại",
  },
];

const ApplicationStepper = ({
  currentStep,
}: ApplicationStepperProps) => {
  const currentIndex = steps.findIndex(
    (step) => step.id === currentStep,
  );

  return (
    <nav
      className={styles.stepper}
      aria-label="Tiến trình ứng tuyển"
    >
      {steps.map((step, index) => {
        const isActive =
          step.id === currentStep;

        const isCompleted =
          index < currentIndex;

        return (
          <div
            key={step.id}
            className={`${styles.step} ${
              isActive ? styles.active : ""
            } ${
              isCompleted
                ? styles.completed
                : ""
            }`}
          >
            <div
              className={styles.stepNumber}
            >
              {isCompleted
                ? "✓"
                : index + 1}
            </div>

            <div
              className={styles.stepContent}
            >
              <span>
                Bước {index + 1}
              </span>

              <strong>
                {step.label}
              </strong>
            </div>

            {index < steps.length - 1 && (
              <div
                className={styles.connector}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default ApplicationStepper;