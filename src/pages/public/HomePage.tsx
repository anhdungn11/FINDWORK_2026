import CTA from "@/components/common/CTA/CTA";
import FeaturedCompanies from "@/features/companies/components/FeaturedCompanies/FeaturedCompanies";
import FeaturedJobs from "@/features/jobs/components/FeaturedJobs/FeaturedJobs";
import JobSearchHero from "@/features/jobs/components/JobSearchHero/JobSearchHero";

const HomePage = () => {
  return (
    <>
      <JobSearchHero />
      <FeaturedJobs />
      <FeaturedCompanies />
      <CTA />
    </>
  );
};

export default HomePage;