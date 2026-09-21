import ResumeCard from "@/features/resume/components/ResumeCard";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeList.module.css";

interface ResumeListProps {
  resumes: Resume[];
  onPreview: (resume: Resume) => void;
  onEdit: (resume: Resume) => void;
  onReplace: (resume: Resume) => void;
  onRename: (resume: Resume) => void;
  onDelete: (resume: Resume) => void;
  onSetDefault: (resumeId: string) => void;
}

const ResumeList = ({
  resumes,
  onPreview,
  onEdit,
  onReplace,
  onRename,
  onDelete,
  onSetDefault,
}: ResumeListProps) => {
  return (
    <div className={styles.list}>
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          onPreview={onPreview}
          onEdit={onEdit}
          onReplace={onReplace}
          onRename={onRename}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
        />
      ))}
    </div>
  );
};

export default ResumeList;
