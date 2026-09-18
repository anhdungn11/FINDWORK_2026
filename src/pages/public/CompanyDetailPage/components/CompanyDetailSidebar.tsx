import {
  Link,
} from "react-router-dom";

import type {
  CompanyDetailRecord,
} from "../types/company-detail.types";

import {
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  LocationIcon,
} from "./CompanyDetailIcons";

import CompanyInfoItem from "./CompanyInfoItem";

import styles from "../styles/CompanyDetailSidebar.module.css";

interface CompanyDetailSidebarProps {
  company: CompanyDetailRecord;
}

const CompanyDetailSidebar = ({
  company,
}: CompanyDetailSidebarProps) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.infoCard}>
        <span className={styles.sectionLabel}>
          THÔNG TIN CÔNG TY
        </span>

        <div className={styles.infoList}>
          <CompanyInfoItem
            icon={<BuildingIcon />}
            label="Quy mô"
          >
            <strong>{company.size}</strong>
          </CompanyInfoItem>

          <CompanyInfoItem
            icon={<CalendarIcon />}
            label="Thành lập"
          >
            <strong>
              {company.foundedYear}
            </strong>
          </CompanyInfoItem>

          <CompanyInfoItem
            icon={<LocationIcon />}
            label="Địa điểm"
          >
            <strong>
              {company.location}
            </strong>
          </CompanyInfoItem>

          <CompanyInfoItem
            icon={<GlobeIcon />}
            label="Website"
          >
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
            >
              Truy cập website
            </a>
          </CompanyInfoItem>
        </div>
      </div>

      <Link
        to="/companies"
        className={styles.backLink}
      >
        ← Quay lại danh sách công ty
      </Link>
    </aside>
  );
};

export default CompanyDetailSidebar;
