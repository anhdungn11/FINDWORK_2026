import type {
  ReactNode,
} from "react";

import styles from "../styles/CompanyDetailSidebar.module.css";

interface CompanyInfoItemProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

const CompanyInfoItem = ({
  icon,
  label,
  children,
}: CompanyInfoItemProps) => {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoIcon}>
        {icon}
      </span>

      <div>
        <span>{label}</span>
        {children}
      </div>
    </div>
  );
};

export default CompanyInfoItem;
