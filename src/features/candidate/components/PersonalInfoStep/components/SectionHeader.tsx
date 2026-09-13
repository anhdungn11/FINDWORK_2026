import styles from "../PersonalInfoStep.module.css";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

const SectionHeader = ({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) => {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <span className={styles.eyebrow}>
          {eyebrow}
        </span>

        <h3>{title}</h3>

        <p>{description}</p>
      </div>
    </div>
  );
};

export default SectionHeader;
