import JobSearchBar from "@/features/jobs/components/JobSearchBar/JobSearchBar";

const JobsPage = () => {
  return (
    <>
      <section
        style={{
          padding: "64px 0",
          backgroundColor: "var(--color-background)",
        }}
      >
        <div className="container">
          <h1>Khám phá việc làm</h1>

          <p>
            Tìm cơ hội phù hợp với kỹ năng và định hướng nghề nghiệp của bạn.
          </p>

          <div style={{ marginTop: "32px" }}>
            <JobSearchBar />
          </div>
        </div>
      </section>
    </>
  );
};

export default JobsPage;