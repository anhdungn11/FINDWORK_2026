import EducationStep from "@/features/candidate/components/EducationStep/EducationStep";
import ExperienceStep from "@/features/candidate/components/ExperienceStep/ExperienceStep";
import PersonalInfoStep from "@/features/candidate/components/PersonalInfoStep/PersonalInfoStep";
import SkillsLanguagesStep from "@/features/candidate/components/SkillsLanguagesStep/SkillsLanguagesStep";
import type {
  CandidateOnboardingData,
  OnboardingStep,
  UpdateCandidateOnboardingSection,
} from "@/features/candidate/types/onboarding.types";
import PendingOnboardingStep from "./PendingOnboardingStep";

interface OnboardingStepContentProps {
  currentStep: OnboardingStep;
  data: CandidateOnboardingData;
  updateSection: UpdateCandidateOnboardingSection;
}

const OnboardingStepContent = ({ currentStep, data, updateSection }: OnboardingStepContentProps) => {
  switch (currentStep.id) {
    case "personal":
      return <PersonalInfoStep value={data.personal} onChange={(value) => updateSection("personal", value)} />;
    case "education":
      return <EducationStep value={data.education} onChange={(value) => updateSection("education", value)} />;
    case "experience":
      return <ExperienceStep value={data.experience} onChange={(value) => updateSection("experience", value)} />;
    case "skills":
      return (
        <SkillsLanguagesStep
          skills={data.skills}
          languages={data.languages}
          onSkillsChange={(value) => updateSection("skills", value)}
          onLanguagesChange={(value) => updateSection("languages", value)}
        />
      );
    default:
      return <PendingOnboardingStep step={currentStep} />;
  }
};

export default OnboardingStepContent;
