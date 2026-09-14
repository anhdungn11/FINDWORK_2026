import type {
  ReactNode,
} from "react";

import styles from "../styles/JobsPageLayout.module.css";

interface JobsResultsSectionProps {
  resultsContent: ReactNode;
  sidebarContent: ReactNode;
}

const JobsResultsSection = ({
  resultsContent,
  sidebarContent,
}: JobsResultsSectionProps) => {
  return (
    <section
      className={styles.resultsSection}
    >
      <div className="container">
        <div
          className={
            styles.contentLayout
          }
        >
          {resultsContent}

          {sidebarContent}
        </div>
      </div>
    </section>
  );
};

export default JobsResultsSection;
