import type {
  ResumeInfo,
} from "@/features/candidate/types/onboarding.types";

import ResumeCard from "./components/ResumeCard";
import ResumeCreateLaterOption from "./components/ResumeCreateLaterOption";
import ResumeUploadZone from "./components/ResumeUploadZone";
import { useResumeStep } from "./hooks/useResumeStep";

import styles from "./styles/ResumeStep.module.css";

interface ResumeStepProps {
  value: ResumeInfo;
  onChange: (
    value: ResumeInfo,
  ) => void;
}

const ResumeStep = ({
  value,
  onChange,
}: ResumeStepProps) => {
  const form = useResumeStep({
    value,
    onChange,
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.intro}>
        <div className={styles.introIcon}>
          CV
        </div>

        <div>
          <strong>
            Chuẩn bị CV để sẵn sàng ứng tuyển.
          </strong>
          <p>
            Trong onboarding, bạn chỉ cần chuẩn bị một CV ban đầu. Sau này CV Center sẽ cho phép quản lý nhiều CV và chọn CV phù hợp cho từng công việc.
          </p>
        </div>
      </div>

      {value.hasExistingResume ? (
        <ResumeCard
          value={value}
          error={form.error}
          onFileSelect={form.selectFile}
          onResumeNameChange={
            form.updateResumeName
          }
          onResumeNameBlur={
            form.commitResumeName
          }
          onPreview={form.previewResume}
          onRemove={form.removeResume}
        />
      ) : (
        <>
          <ResumeUploadZone
            error={form.error}
            onFileSelect={form.selectFile}
          />

          <ResumeCreateLaterOption
            selected={value.createLater}
            onSelect={form.toggleCreateLater}
          />
        </>
      )}

      <div className={styles.privacyNote}>
        <span>🔒</span>
        <p>
          CV của bạn không tự động công khai cho mọi nhà tuyển dụng. Quyền hiển thị và tải CV sẽ được kiểm soát riêng ở bước Quyền riêng tư và trong từng lần ứng tuyển.
        </p>
      </div>
    </div>
  );
};

export default ResumeStep;
