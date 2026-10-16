import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const ITEMS = [
  { to: "/admin", label: "Tổng quan", end: true },
  { to: "/admin/users", label: "Người dùng" },
  { to: "/admin/companies", label: "Doanh nghiệp" },
  { to: "/admin/jobs", label: "Kiểm duyệt tin" },
  { to: "/admin/system", label: "Hệ thống & Audit" },
];

const AdminLayout = () => <WorkspaceShell tag="Quản trị" navLabel="Điều hướng quản trị" items={ITEMS} />;

export default AdminLayout;