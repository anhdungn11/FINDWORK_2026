import { PageHeader, UnavailableState } from "@/components/ui";

const AdminCompaniesPage = () => {
  return (
    <>
      <PageHeader
        title="Quản lý doanh nghiệp & Xét duyệt hồ sơ"
        subtitle="Kiểm tra thông tin pháp lý, mã số thuế và cấp trạng thái xác minh doanh nghiệp."
      />
      <UnavailableState
        title="API Quản trị danh sách toàn bộ doanh nghiệp chưa được mở"
        text="Máy chủ chưa hỗ trợ endpoint tìm kiếm/liệt kê danh sách doanh nghiệp trên toàn hệ thống cho quản trị viên."
      />
    </>
  );
};

export default AdminCompaniesPage;
