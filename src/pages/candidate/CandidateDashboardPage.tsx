import Button from "@/components/common/Button";

const CandidateDashboardPage = () => {
  const handleApply = () => {
    alert("Applied!");
  };

  return (
    <div>
      <h1>Candidate Dashboard</h1>

      <Button onClick={handleApply}>
        Apply Now
      </Button>
    </div>
  );
};

export default CandidateDashboardPage;