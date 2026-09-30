import styles from "./ApplicationDetailsNotice.module.css";

const ApplicationDetailsNotice = () => {
  return (
    <div className={styles.notice}>
      <div className={styles.icon}>
        i
      </div>

      <div>
        <strong>
          Bạn vẫn có thể kiểm tra lại trước khi gửi
        </strong>

        <p>
          Toàn bộ thông tin ứng tuyển sẽ được hiển thị lại
          ở bước xem xét cuối cùng.
        </p>
      </div>
    </div>
  );
};

export default ApplicationDetailsNotice;