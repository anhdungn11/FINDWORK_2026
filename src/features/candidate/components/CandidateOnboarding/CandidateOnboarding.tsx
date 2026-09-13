import { useNavigate } from "react-router-dom";

import { useCandidateOnboarding } from "@/features/candidate/hooks/useCandidateOnboarding";

import OnboardingActions from "./components/OnboardingActions";
import OnboardingContentHeader from "./components/OnboardingContentHeader";
import OnboardingSidebar from "./components/OnboardingSidebar";
import OnboardingStepContent from "./components/OnboardingStepContent";

import layoutStyles from "./styles/CandidateOnboardingLayout.module.css";
import contentStyles from "./styles/OnboardingContent.module.css";

const CandidateOnboarding = () => {
  const navigate = useNavigate();

  const {
    data,
    updateSection,
    steps,
    currentStep,
    currentStepIndex,
    progress,
    isFirstStep,
    isLastStep,
    goNext,
    goPrevious,
    goToStep,
  } = useCandidateOnboarding();

  const handleNext = () => {
    if (isLastStep) {
      console.log("Candidate onboarding:", data);
      navigate("/candidate");
      return;
    }

    goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className={layoutStyles.page}>
      <div className={layoutStyles.container}>
        <OnboardingSidebar
          steps={steps}
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          progress={progress}
          onStepChange={goToStep}
        />

        <section className={contentStyles.content}>
          <OnboardingContentHeader
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
          />

          <div className={contentStyles.card}>
            <OnboardingStepContent
              currentStep={currentStep}
              data={data}
              updateSection={updateSection}
            />

            <OnboardingActions
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onPrevious={goPrevious}
              onNext={handleNext}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default CandidateOnboarding;
