import styles from "./CoverLetterSection.module.css";

interface CoverLetterSectionProps {
  value: string;

  onChange: (
    value: string,
  ) => void;
}

const CoverLetterSection = ({
  value,
  onChange,
}: CoverLetterSectionProps) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3>Thư giới thiệu</h3>

        <p>
          Không bắt buộc. Nên viết ngắn gọn về sự phù hợp
          của bạn với vị trí.
        </p>
      </header>

      <div className={styles.field}>
        <textarea
          rows={8}
          maxLength={2000}
          value={value}
          placeholder="Giới thiệu ngắn gọn về kinh nghiệm, thế mạnh và lý do bạn quan tâm đến vị trí này..."
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
        />

        <div className={styles.counter}>
          {value.length}/2000
        </div>
      </div>
    </section>
  );
};

export default CoverLetterSection;