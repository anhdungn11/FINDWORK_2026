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
          <img
            src={company.cover}
            alt={`${company.name} cover`}
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        </div>

        <div className={headerStyles.companyHeader}>
          <div className={headerStyles.logo}>
            <img
              src={company.logo}
              alt={company.name}
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />

            <span>
              {company.name.charAt(0)}
            </span>
          </div>

          <div className={headerStyles.companyInfo}>
            <span className={headerStyles.eyebrow}>
              COMPANY PROFILE
            </span>

            <h1>{company.name}</h1>

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
