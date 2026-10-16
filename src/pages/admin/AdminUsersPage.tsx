import { PageHeader, UnavailableState } from "@/components/ui";

const AdminUsersPage = () => {
  return (
    <>
      <PageHeader
        title="Quản lý người dùng nền tảng"
        subtitle="Tra cứu tài khoản, phân quyền vai trò và khóa/mở khóa người dùng."
      />
      <UnavailableState
        title="API Quản trị người dùng chưa được mở trên Backend"
        text="Endpoint GET /api/v1/admin/users và các chức năng cập nhật quyền quản trị chưa được phát hành trong phạm vi bản MVP hiện tại."
      />
    </>
  );
};

export default AdminUsersPage;
