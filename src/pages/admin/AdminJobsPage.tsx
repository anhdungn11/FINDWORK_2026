import { PageHeader, UnavailableState } from "@/components/ui";

const AdminJobsPage = () => {
  return (
    <>
      <PageHeader
        title="Kiểm duyệt tin tuyển dụng"
        subtitle="Rà soát nội dung tin đăng, hạn chế tin rác, vi phạm chính sách hoặc sai lệch thông tin."
      />
      <UnavailableState
        title="API Kiểm duyệt tin đăng chưa được mở trên Backend"
        text="Quy trình phê duyệt hoặc gỡ bỏ tin tuyển dụng từ tầng quản trị sàn (Admin Job Moderation) đang chờ bổ sung trên máy chủ."
      />
    </>
  );
};

export default AdminJobsPage;
