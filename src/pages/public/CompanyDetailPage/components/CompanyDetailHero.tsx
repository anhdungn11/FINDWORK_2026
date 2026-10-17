import type {
  CompanyDetailRecord,
} from "../types/company-detail.types";

import heroStyles from "../styles/CompanyDetailHero.module.css";
import badgeStyles from "../styles/CompanyDetailJobsBadge.module.css";
import headerStyles from "../styles/CompanyDetailHeroHeader.module.css";

interface CompanyDetailHeroProps {
  company: CompanyDetailRecord;
}

const CompanyDetailHero = ({
  company,
}: CompanyDetailHeroProps) => {
  return (
    <section className={heroStyles.hero}>
      <div className="container">
        <div className={heroStyles.cover}>
          {company.cover ? (
            <img
              src={company.cover}
              alt={`${company.name} cover`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>

        <div className={headerStyles.companyHeader}>
          <div className={headerStyles.logo}>
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            <span>
              {company.name.charAt(0)}
            </span>
          </div>

          <div className={headerStyles.companyInfo}>
            <span className={headerStyles.eyebrow}>
              COMPANY PROFILE
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
              <h1 style={{ margin: 0 }}>{company.name}</h1>
              {company.isVerified && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0369a1",
                    backgroundColor: "#e0f2fe",
                    border: "1px solid #bae6fd",
                  }}
                  title="Doanh nghiệp đã được xác thực"
                >
                  ✓ Đã xác thực
                </span>
              )}
            </div>

            <div className={headerStyles.meta}>
              <span>{company.industry}</span>

              <span className={headerStyles.dot} />

              <span>{company.location}</span>
            </div>
          </div>

          <div className={badgeStyles.jobsBadge}>
            <strong>
              {company.jobsCount}
            </strong>

            <span>
              việc làm đang tuyển
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyDetailHero;
