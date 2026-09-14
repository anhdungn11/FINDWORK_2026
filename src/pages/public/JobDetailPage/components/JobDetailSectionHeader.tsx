import styles from "../styles/JobDetailCards.module.css";

interface JobDetailSectionHeaderProps {
  label: string;
  title: string;
  description?: string;
}

const JobDetailSectionHeader = ({
  label,
  title,
  description,
}: JobDetailSectionHeaderProps) => {
  return (
    <>
      <span className={styles.sectionLabel}>
        {label}
      </span>

      <h2>{title}</h2>

      {description && (
        <p
          className={
            styles.sectionDescription
          }
        >
          {description}
        </p>
      )}
    </>
  );
};

export default JobDetailSectionHeader;
