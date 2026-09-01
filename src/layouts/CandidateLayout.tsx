import { Outlet } from "react-router-dom";

const CandidateLayout = () => {
  return (
    <div>
      <header>
        <h2>FINDWORK Candidate</h2>
      </header>

      <aside>
        <p>Candidate Sidebar</p>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default CandidateLayout;