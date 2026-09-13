import styles from "../styles/ExperienceOverview.module.css";

interface ExperienceHeaderProps {
  hasItems: boolean;
  onAdd: () => void;
}

const ExperienceHeader = ({ hasItems, onAdd }: ExperienceHeaderProps) => (
  <div className={styles.intro}>
    <div>
      <span className={styles.eyebrow}>KINH NGHIỆM</span>
      <h3>Quá trình làm việc</h3>
      <p>
        Thêm những công việc, kỳ thực tập, freelance hoặc hoạt động thực tế có
        giá trị cho hồ sơ nghề nghiệp.
      </p>
    </div>

    {hasItems && (
      <button type="button" className={styles.addButton} onClick={onAdd}>
        <span>+</span>
        Thêm kinh nghiệm
      </button>
    )}
  </div>
);

export default ExperienceHeader;
