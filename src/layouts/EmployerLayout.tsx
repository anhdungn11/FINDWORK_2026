import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const ITEMS = [
  { to: "/employer", label: "Tổng quan", end: true },
  { to: "/employer/jobs", label: "Tin tuyển dụng" },
  { to: "/employer/applicants", label: "Ứng viên" },
  { to: "/employer/profile", label: "Hồ sơ công ty" },
  { to: "/employer/locations", label: "Địa điểm" },
  { to: "/employer/members", label: "Thành viên & Lời mời" },
];

const EmployerLayout = () => <WorkspaceShell tag="Nhà tuyển dụng" navLabel="Điều hướng nhà tuyển dụng" items={ITEMS} />;

export default EmployerLayout;