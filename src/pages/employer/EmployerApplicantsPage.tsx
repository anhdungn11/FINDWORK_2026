import { PageHeader, UnavailableState } from "@/components/ui";

const EmployerApplicantsPage = () => {
  return (
    <>
      <PageHeader
        title="Quản lý ứng viên & Đơn ứng tuyển"
        subtitle="Theo dõi hồ sơ ứng tuyển, trạng thái xét duyệt và quy trình phỏng vấn."
      />

      <UnavailableState
        title="Chức năng hồ sơ ứng tuyển chưa khả dụng trên Backend"
        text="Theo hợp đồng Backend MVP hiện tại, API nộp hồ sơ ứng tuyển và quản lý đơn ứng tuyển (Applications Controller) chưa được triển khai trên máy chủ. Giao diện từ chối tạo số liệu giả mạo hoặc hành động ảo."
      />
    </>
  );
};

export default EmployerApplicantsPage;
