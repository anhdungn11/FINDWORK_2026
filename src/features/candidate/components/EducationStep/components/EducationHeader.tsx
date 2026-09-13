import styles from "../styles/EducationOverview.module.css";

interface EducationHeaderProps {
  hasEducation: boolean;
  onAdd: () => void;
}

const EducationHeader = ({ hasEducation, onAdd }: EducationHeaderProps) => (
  <div className={styles.intro}>
    <div>
      <span className={styles.eyebrow}>HỌC VẤN</span>
      <h3>Quá trình học tập</h3>
      <p>
        Cung cấp thông tin học vấn liên quan đến định hướng nghề nghiệp của bạn.
      </p>
    </div>

    {hasEducation && (
      <button type="button" className={styles.addButton} onClick={onAdd}>
        <span>+</span>
        Thêm học vấn
      </button>
    )}
  </div>
);

export default EducationHeader;
