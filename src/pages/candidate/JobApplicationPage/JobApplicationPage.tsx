import { useParams } from "react-router-dom";

const JobApplicationPage = () => {
  const { id } = useParams();

  return (
    <main>
      <h1>Ứng tuyển việc làm</h1>
      <p>Job ID: {id}</p>
    </main>
  );
};

export default JobApplicationPage;