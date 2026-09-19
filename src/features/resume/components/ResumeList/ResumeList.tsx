import ResumeCard from "@/features/resume/components/ResumeCard";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeList.module.css";

interface ResumeListProps {
  resumes: Resume[];
  onSetDefault: (resumeId: string) => void;
}

const ResumeList = ({ resumes, onSetDefault }: ResumeListProps) => {
  return (
    <div className={styles.list}>
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onSetDefault={onSetDefault}
        />
      ))}
    </div>
  );
};

export default ResumeList;
