import { useState } from "react";
import { Link } from "react-router-dom";
import { resolveApiUrl } from "@/services/http/apiClient";

import type { Company } from "@/data/mock/companies.mock";
import type { PublicCompanyDto } from "@/services/api/apiTypes";

import styles from "./CompanyCard.module.css";

export type CompanyCardData =
  | Company
  | PublicCompanyDto
  | {
      id: string | number;
      name: string;
      industry?: string | { id?: string; code?: string; name: string } | null;
      location?: string | null;
      headquarters?: { countryCode?: string | null; province?: { id?: string; code?: string; name: string } | null } | null;
      jobsCount?: number;
      isVerified?: boolean;
    };

interface CompanyCardProps {
  company: CompanyCardData;
}

const CompanyCard = ({ company }: CompanyCardProps) => {
  const [imgError, setImgError] = useState(false);
  const rawLogo = "logoUrl" in company && company.logoUrl ? company.logoUrl : "logo" in company && typeof company.logo === "string" ? company.logo : null;
  const logoUrl = resolveApiUrl(rawLogo);
  const industryText =
    typeof company.industry === "string"
      ? company.industry
      : company.industry?.name || "Chưa cập nhật";

  const locationText =
    "location" in company && typeof company.location === "string" && company.location
      ? company.location
      : "headquarters" in company && company.headquarters?.province?.name
        ? company.headquarters.province.name
        : "Chưa cập nhật";

  const jobsCount = typeof company.jobsCount === "number" ? company.jobsCount : 0;
  const isVerified = "isVerified" in company && Boolean(company.isVerified);

  return (
    <article className={styles.card}>
      <Link
        to={`/companies/${company.id}`}
        className={styles.cardLink}
      >
        <div className={styles.logo}>
          {logoUrl && !imgError ? (
            <img
              src={logoUrl}
              alt={company.name}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "inherit" }}
            />
          ) : (
            company.name.charAt(0)
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h3 className={styles.name}>
              {company.name}
            </h3>
            {isVerified && (
              <span className={styles.verifiedBadge} title="Doanh nghiệp đã xác thực">
                ✓ Đã xác thực
              </span>
            )}
          </div>

          <p className={styles.industry}>
            {industryText}
          </p>

          <p className={styles.location}>
            {locationText}
          </p>

          <span className={styles.jobsCount}>
            {jobsCount} việc làm đang tuyển
          </span>
        </div>
      </Link>
    </article>
  );
};

export default CompanyCard;