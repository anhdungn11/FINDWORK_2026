import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div>
      <header>
        <h2>FINDWORK Admin</h2>
      </header>

      <aside>
        <p>Admin Sidebar</p>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;