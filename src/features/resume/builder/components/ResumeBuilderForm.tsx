import type {
  ResumeBuilderActivityItem,
  ResumeBuilderAwardItem,
  ResumeBuilderCertificationItem,
  ResumeBuilderContent,
  ResumeBuilderCustomItem,
  ResumeBuilderCustomSection,
  ResumeBuilderEducationItem,
  ResumeBuilderEditorSection,
  ResumeBuilderExperienceItem,
  ResumeBuilderLanguageItem,
  ResumeBuilderLinkItem,
  ResumeBuilderProjectItem,
  ResumeBuilderReferenceItem,
  ResumeBuilderSettings,
  ResumeBuilderSkillGroup,
  ResumeBuilderVolunteerItem,
  ResumeIndustryPreset,
  ResumeSectionId,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";
import ActivitiesSection from "./sections/ActivitiesSection";
import AwardsSection from "./sections/AwardsSection";
import BasicsSection from "./sections/BasicsSection";
import CertificationsSection from "./sections/CertificationsSection";
import CustomSection from "./sections/CustomSection";
import DesignSection from "./sections/DesignSection";
import EducationSection from "./sections/EducationSection";
import ExperienceSection from "./sections/ExperienceSection";
import LanguagesSection from "./sections/LanguagesSection";
import ProjectsSection from "./sections/ProjectsSection";
import ReferencesSection from "./sections/ReferencesSection";
import SkillsSection from "./sections/SkillsSection";
import SummarySection from "./sections/SummarySection";
import VolunteeringSection from "./sections/VolunteeringSection";
import styles from "./ResumeEditor.module.css";

interface Props {
  activeSection: ResumeBuilderEditorSection;
  content: ResumeBuilderContent;
  settings: ResumeBuilderSettings;
  templateCode: ResumeTemplateCode;
  onTemplateChange: (value: ResumeTemplateCode) => void;
  onContentChange: <K extends keyof ResumeBuilderContent>(key: K, value: ResumeBuilderContent[K]) => void;
  onSettingsChange: <K extends keyof ResumeBuilderSettings>(key: K, value: ResumeBuilderSettings[K]) => void;
  onApplyIndustryPreset: (value: ResumeIndustryPreset) => void;
  onPhotoFileChange: (file: File | null) => void;
  onAddLink: () => void;
  onUpdateLink: (id: string, patch: Partial<ResumeBuilderLinkItem>) => void;
  onRemoveLink: (id: string) => void;
  onAddExperience: () => void;
  onUpdateExperience: (id: string, patch: Partial<ResumeBuilderExperienceItem>) => void;
  onRemoveExperience: (id: string) => void;
  onAddEducation: () => void;
  onUpdateEducation: (id: string, patch: Partial<ResumeBuilderEducationItem>) => void;
  onRemoveEducation: (id: string) => void;
  onAddSkillGroup: () => void;
  onUpdateSkillGroup: (id: string, patch: Partial<ResumeBuilderSkillGroup>) => void;
  onRemoveSkillGroup: (id: string) => void;
  onAddLanguage: () => void;
  onUpdateLanguage: (id: string, patch: Partial<ResumeBuilderLanguageItem>) => void;
  onRemoveLanguage: (id: string) => void;
  onAddCertification: () => void;
  onUpdateCertification: (id: string, patch: Partial<ResumeBuilderCertificationItem>) => void;
  onRemoveCertification: (id: string) => void;
  onAddProject: () => void;
  onUpdateProject: (id: string, patch: Partial<ResumeBuilderProjectItem>) => void;
  onRemoveProject: (id: string) => void;
  onAddAward: () => void;
  onUpdateAward: (id: string, patch: Partial<ResumeBuilderAwardItem>) => void;
  onRemoveAward: (id: string) => void;
  onAddActivity: () => void;
  onUpdateActivity: (id: string, patch: Partial<ResumeBuilderActivityItem>) => void;
  onRemoveActivity: (id: string) => void;
  onAddVolunteer: () => void;
  onUpdateVolunteer: (id: string, patch: Partial<ResumeBuilderVolunteerItem>) => void;
  onRemoveVolunteer: (id: string) => void;
  onAddReference: () => void;
  onUpdateReference: (id: string, patch: Partial<ResumeBuilderReferenceItem>) => void;
  onRemoveReference: (id: string) => void;
  onAddCustomSection: () => void;
  onUpdateCustomSection: (id: string, patch: Partial<ResumeBuilderCustomSection>) => void;
  onRemoveCustomSection: (id: string) => void;
  onAddCustomItem: (sectionId: string) => void;
  onUpdateCustomItem: (sectionId: string, itemId: string, patch: Partial<ResumeBuilderCustomItem>) => void;
  onRemoveCustomItem: (sectionId: string, itemId: string) => void;
  onToggleSectionVisibility: (sectionId: ResumeSectionId) => void;
  onMoveSection: (sectionId: ResumeSectionId, direction: -1 | 1) => void;
}

const ResumeBuilderForm = (props: Props) => {
  const { activeSection, content } = props;
  let section = null;
  switch (activeSection) {
    case "basics": section = <BasicsSection content={content} onChange={props.onContentChange} onPhotoFileChange={props.onPhotoFileChange} onAddLink={props.onAddLink} onUpdateLink={props.onUpdateLink} onRemoveLink={props.onRemoveLink} />; break;
    case "summary": section = <SummarySection content={content} onChange={props.onContentChange} />; break;
    case "experience": section = <ExperienceSection items={content.experience} onAdd={props.onAddExperience} onUpdate={props.onUpdateExperience} onRemove={props.onRemoveExperience} />; break;
    case "education": section = <EducationSection items={content.education} onAdd={props.onAddEducation} onUpdate={props.onUpdateEducation} onRemove={props.onRemoveEducation} />; break;
    case "skills": section = <SkillsSection items={content.skills} onAdd={props.onAddSkillGroup} onUpdate={props.onUpdateSkillGroup} onRemove={props.onRemoveSkillGroup} />; break;
    case "languages": section = <LanguagesSection items={content.languages} onAdd={props.onAddLanguage} onUpdate={props.onUpdateLanguage} onRemove={props.onRemoveLanguage} />; break;
    case "certifications": section = <CertificationsSection items={content.certifications} onAdd={props.onAddCertification} onUpdate={props.onUpdateCertification} onRemove={props.onRemoveCertification} />; break;
    case "projects": section = <ProjectsSection items={content.projects} onAdd={props.onAddProject} onUpdate={props.onUpdateProject} onRemove={props.onRemoveProject} />; break;
    case "awards": section = <AwardsSection items={content.awards} onAdd={props.onAddAward} onUpdate={props.onUpdateAward} onRemove={props.onRemoveAward} />; break;
    case "activities": section = <ActivitiesSection items={content.activities} onAdd={props.onAddActivity} onUpdate={props.onUpdateActivity} onRemove={props.onRemoveActivity} />; break;
    case "volunteering": section = <VolunteeringSection items={content.volunteering} onAdd={props.onAddVolunteer} onUpdate={props.onUpdateVolunteer} onRemove={props.onRemoveVolunteer} />; break;
    case "references": section = <ReferencesSection items={content.references} onAdd={props.onAddReference} onUpdate={props.onUpdateReference} onRemove={props.onRemoveReference} />; break;
    case "custom": section = <CustomSection sections={content.customSections} onAddSection={props.onAddCustomSection} onUpdateSection={props.onUpdateCustomSection} onRemoveSection={props.onRemoveCustomSection} onAddItem={props.onAddCustomItem} onUpdateItem={props.onUpdateCustomItem} onRemoveItem={props.onRemoveCustomItem} />; break;
    case "design": section = <DesignSection templateCode={props.templateCode} settings={props.settings} onTemplateChange={props.onTemplateChange} onSettingsChange={props.onSettingsChange} onApplyIndustryPreset={props.onApplyIndustryPreset} onToggleSectionVisibility={props.onToggleSectionVisibility} onMoveSection={props.onMoveSection} />; break;
  }
  return <section className={styles.editorPanel}>{section}</section>;
};
export default ResumeBuilderForm;
