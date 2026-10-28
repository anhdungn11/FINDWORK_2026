import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  RefreshCw,
  FileText,
  Download,
  ExternalLink,
  Layers,
  MapPin,
} from "lucide-react";
import { Badge, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  adminApi,
  type AdminCompanyDto,
  type AdminCompanyDetailDto,
  type AdminCompanyLegalDto,
  type AdminCompanyCapabilitiesDto,
} from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái hoạt động" },
  { value: "ACTIVE", label: "Đang hoạt động (ACTIVE)" },
  { value: "SUSPENDED", label: "Tạm đình chỉ (SUSPENDED)" },
  { value: "ARCHIVED", label: "Đã lưu trữ (ARCHIVED)" },
];

const VERIFICATION_FILTERS = [
  { value: "", label: "Tất cả trạng thái xác minh" },
  { value: "PENDING", label: "Chờ xét duyệt (PENDING)" },
  { value: "VERIFIED", label: "Đã xác minh (VERIFIED)" },
  { value: "REJECTED", label: "Bị từ chối (REJECTED)" },
  { value: "UNVERIFIED", label: "Chưa gửi hồ sơ (UNVERIFIED)" },
];

// The 10 Platform Capabilities required by the owner
interface PlatformCapabilityDef {
  code: string;
  name: string;
  description: string;
  category: "RECRUITMENT" | "APPLICANT" | "TEAM" | "ADVANCED";
}

const PLATFORM_CAPABILITIES: PlatformCapabilityDef[] = [
  {
    code: "job.draft.create",
    name: "Tạo bản nháp tin tuyển dụng",
    description: "Cho phép doanh nghiệp khởi tạo tin tuyển dụng ở trạng thái nháp (DRAFT).",
    category: "RECRUITMENT",
  },
  {
    code: "job.draft.edit",
    name: "Chỉnh sửa tin tuyển dụng",
    description: "Cho phép chỉnh sửa mô tả, mức lương, yêu cầu kinh nghiệm của tin nháp hoặc đang mở.",
    category: "RECRUITMENT",
  },
  {
    code: "job.publish",
    name: "Đăng công khai tin tuyển dụng",
    description: "Quyền mở công khai tin tuyển dụng lên sàn Findwork. Việc cấp quyền này do Super Admin quyết định riêng với xác minh pháp lý.",
    category: "RECRUITMENT",
  },
  {
    code: "job.close",
    name: "Đóng và lưu trữ tin tuyển dụng",
    description: "Cho phép chủ động dừng hoặc đóng vĩnh viễn tin tuyển dụng khi đã đủ ứng viên.",
    category: "RECRUITMENT",
  },
  {
    code: "application.view",
    name: "Xem danh sách & hồ sơ ứng viên",
    description: "Truy cập thông tin ứng viên, câu trả lời sàng lọc và hồ sơ CV đã nộp vào các vị trí tuyển dụng.",
    category: "APPLICANT",
  },
  {
    code: "application.pipeline.manage",
    name: "Quản lý quy trình ứng viên",
    description: "Chuyển trạng thái ứng viên (Reviewing → Shortlisted → Interview → Offered → Rejected).",
    category: "APPLICANT",
  },
  {
    code: "interview.schedule",
    name: "Lên lịch & điều phối phỏng vấn",
    description: "Thiết lập lịch phỏng vấn (Trực tiếp, Điện thoại, Video Call) và gửi thông báo tới ứng viên.",
    category: "APPLICANT",
  },
  {
    code: "team.invite",
    name: "Mời & quản lý thành viên nội bộ",
    description: "Mời đồng nghiệp vào tổ chức và phân quyền vai trò nội bộ (HR Manager, Recruiter, Hiring Manager).",
    category: "TEAM",
  },
  {
    code: "recruitment.analytics.view",
    name: "Báo cáo & phân tích tuyển dụng",
    description: "Xem các chỉ số hiệu quả chuyển đổi ứng viên, thời gian tuyển dụng và hiệu suất tin đăng.",
    category: "TEAM",
  },
  {
    code: "ai.business.access",
    name: "Sử dụng trợ lý AI Doanh nghiệp",
    description: "Truy cập trợ lý Findwork AI để gợi ý câu hỏi sàng lọc, tóm tắt CV và soạn thảo mô tả công việc.",
    category: "ADVANCED",
  },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const AdminCompaniesPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const verificationStatus = params.get("verificationStatus") ?? "";
  const q = params.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Detail Modal State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<AdminCompanyDetailDto | null>(null);
  const [companyLegal, setCompanyLegal] = useState<AdminCompanyLegalDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<AdminCompanyCapabilitiesDto | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const [capabilityBusy, setCapabilityBusy] = useState<string | null>(null);
  const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "legal" | "permissions">("overview");

  // Rejection Dialog State
  const [rejectingCompany, setRejectingCompany] = useState<AdminCompanyDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  const writes = isWorkspaceWritesEnabled();

  const companies = useAsyncData(
    (signal) =>
      adminApi.listCompanies(
        {
          page,
          pageSize: 20,
          status: status || undefined,
          verificationStatus: verificationStatus || undefined,
          q: q || undefined,
        },
        signal,
      ),
    [page, status, verificationStatus, q],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Load details when modal opens
  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyDetail(null);
      setCompanyLegal(null);
      return;
    }

    let isMounted = true;
    setModalLoading(true);

    Promise.all([
      adminApi.getCompany(selectedCompanyId).catch(() => null),
      adminApi.getCompanyLegal(selectedCompanyId).catch(() => null),
    ])
      .then(([detail, legal]) => {
        if (!isMounted) return;
        setCompanyDetail(detail);
        setCompanyLegal(legal);
      })
      .finally(() => {
        if (isMounted) setModalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || activeTab !== "permissions") {
      setCapabilities(null);
      setCapabilitiesError(null);
      return;
    }
    const controller = new AbortController();
    setCapabilitiesLoading(true);
    setCapabilitiesError(null);
    adminApi.getCompanyCapabilities(selectedCompanyId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setCapabilities(data); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCapabilitiesError(toApiFailure(error).message);
      })
      .finally(() => { if (!controller.signal.aborted) setCapabilitiesLoading(false); });
    return () => controller.abort();
  }, [selectedCompanyId, activeTab]);

  const changeCapability = async (code: string, isGranted: boolean) => {
    if (!selectedCompanyId) return;
    if (!isGranted && !window.confirm(`Thu hồi quyền ${code} của doanh nghiệp này? Thao tác tiếp theo sẽ bị từ chối.`)) return;
    const reason = window.prompt(`Nhập lý do ${isGranted ? "cấp" : "thu hồi"} quyền ${code} (ít nhất 10 ký tự):`);
    if (reason === null) return;
    if (reason.trim().length < 10 || reason.trim().length > 500) {
      setCapabilitiesError("Lý do phải dài từ 10 đến 500 ký tự.");
      return;
    }
    setCapabilityBusy(code);
    setCapabilitiesError(null);
    setCapabilityNotice(null);
    try {
      await adminApi.setCompanyCapability(selectedCompanyId, code, isGranted, reason.trim());
      const refreshed = await adminApi.getCompanyCapabilities(selectedCompanyId);
      setCapabilities(refreshed);
      setCapabilityNotice(`${isGranted ? "Đã cấp" : "Đã thu hồi"} quyền ${code}.`);
    } catch (error) {
      setCapabilitiesError(toApiFailure(error).message);
      try { setCapabilities(await adminApi.getCompanyCapabilities(selectedCompanyId)); } catch { /* preserve the original failure */ }
    } finally {
      setCapabilityBusy(null);
    }
  };

  // Escape key support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (rejectingCompany) setRejectingCompany(null);
        else if (selectedCompanyId) setSelectedCompanyId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCompanyId, rejectingCompany]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter("q", searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setParams(new URLSearchParams());
  };

  // Verification Approvals
  const handleApproveVerification = async (company: AdminCompanyDto) => {
    setBusyId(company.id);
    setNotice(null);
    try {
      await adminApi.verifyCompany(company.id, "VERIFIED");
      setNotice({
        tone: "ok",
        text: `Đã phê duyệt xác minh thành công cho doanh nghiệp “${company.name}”.`,
      });
      if (companyDetail && companyDetail.id === company.id) {
        setCompanyDetail({ ...companyDetail, verificationStatus: "VERIFIED", verifiedAt: new Date().toISOString() });
      }
      companies.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  // Rejection Submission
  const submitRejection = async () => {
    if (!rejectingCompany) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 10) {
      setRejectionError("Lý do từ chối bắt buộc phải có ít nhất 10 ký tự để phản hồi rõ cho doanh nghiệp.");
      return;
    }

    setBusyId(rejectingCompany.id);
    setRejectionError("");
    try {
      await adminApi.verifyCompany(rejectingCompany.id, "REJECTED", trimmed);
      setNotice({
        tone: "ok",
        text: `Đã từ chối xác minh doanh nghiệp “${rejectingCompany.name}”. Lý do đã được lưu vào hệ thống kiểm toán.`,
      });
      if (companyDetail && companyDetail.id === rejectingCompany.id) {
        setCompanyDetail({
          ...companyDetail,
          verificationStatus: "REJECTED",
          verificationRejectionReason: trimmed,
        });
      }
      setRejectingCompany(null);
      setRejectionReason("");
      companies.reload();
    } catch (e) {
      setRejectionError(toApiFailure(e).message);
    } finally {
      setBusyId(null);
    }
  };

  // Status Toggles
  const handleStatusChange = async (company: AdminCompanyDto, nextStatus: "ACTIVE" | "SUSPENDED") => {
    setBusyId(company.id);
    setNotice(null);
    try {
      await adminApi.setCompanyStatus(company.id, nextStatus);
      setNotice({
        tone: "ok",
        text: `Đã cập nhật trạng thái hoạt động của “${company.name}” thành ${nextStatus}.`,
      });
      if (companyDetail && companyDetail.id === company.id) {
        setCompanyDetail({ ...companyDetail, status: nextStatus });
      }
      companies.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý doanh nghiệp & Xét duyệt hồ sơ"
        subtitle="Kiểm tra thẩm định hồ sơ pháp lý, phê duyệt cấp quyền tuyển dụng và giám sát hoạt động doanh nghiệp."
        actions={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnOutline}`}
            onClick={companies.reload}
            disabled={companies.loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} className={companies.loading ? "spin" : ""} />
            <span>Làm mới</span>
          </button>
        }
      />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 20 }}
        >
          {notice.text}
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
          background: "#ffffff",
          padding: 16,
          borderRadius: 10,
          border: "1px solid var(--color-border, #e2e8f0)",
          alignItems: "center",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className={ui.input}
              placeholder="Tìm kiếm theo tên doanh nghiệp..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`}>
            Tìm kiếm
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Filter size={16} color="#64748b" />
          <select
            className={ui.select}
            value={verificationStatus}
            onChange={(e) => setFilter("verificationStatus", e.target.value)}
            style={{ minWidth: 190 }}
          >
            {VERIFICATION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            className={ui.select}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
            style={{ minWidth: 180 }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {(q || status || verificationStatus) && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleClearFilters}
              title="Xóa bộ lọc"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      {companies.loading ? (
        <LoadingBlock rows={5} label="Đang nạp danh sách hồ sơ doanh nghiệp" />
      ) : companies.error ? (
        <ApiErrorState error={companies.error} onRetry={companies.reload} />
      ) : !companies.data || companies.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy doanh nghiệp phù hợp"
          text={
            q || status || verificationStatus
              ? "Không có doanh nghiệp nào khớp với tiêu chí tìm kiếm. Thử đặt lại bộ lọc để xem toàn bộ danh sách."
              : "Hệ thống chưa có doanh nghiệp nào đăng ký."
          }
          actionLabel={q || status || verificationStatus ? "Xóa bộ lọc" : undefined}
          onAction={q || status || verificationStatus ? handleClearFilters : undefined}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách doanh nghiệp trên hệ thống</caption>
              <thead>
                <tr>
                  <th scope="col">Doanh nghiệp</th>
                  <th scope="col">Trạng thái xác minh</th>
                  <th scope="col">Hoạt động</th>
                  <th scope="col">Ngày đăng ký</th>
                  <th scope="col" style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {companies.data.data.map((c) => {
                  const isBusy = busyId === c.id;
                  const isPending = c.verificationStatus === "PENDING";
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            slug: {c.slug || "—"} · ID: {c.id.slice(0, 8)}…
                          </span>
                        </div>
                      </td>
                      <td>
                        {c.verificationStatus === "VERIFIED" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#16a34a", fontSize: "0.825rem", fontWeight: 700 }}>
                            <CheckCircle2 size={16} />
                            <span>Đã xác minh</span>
                          </span>
                        ) : c.verificationStatus === "PENDING" ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "#b45309",
                              background: "#fef3c7",
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: "0.8rem",
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={15} />
                            <span>Chờ xét duyệt</span>
                          </span>
                        ) : c.verificationStatus === "REJECTED" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#dc2626", fontSize: "0.825rem", fontWeight: 600 }}>
                            <XCircle size={16} />
                            <span>Bị từ chối</span>
                          </span>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "0.825rem" }}>
                            Chưa nộp hồ sơ
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={
                            c.status === "ACTIVE"
                              ? "success"
                              : c.status === "SUSPENDED"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {c.status === "ACTIVE"
                            ? "Hoạt động"
                            : c.status === "SUSPENDED"
                            ? "Tạm đình chỉ"
                            : "Đã lưu trữ"}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          {formatDate(c.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnOutline}`}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setActiveTab("overview");
                            }}
                            title="Xem chi tiết doanh nghiệp & thẩm định hồ sơ"
                          >
                            <Eye size={14} />
                            <span>Chi tiết & Quyền</span>
                          </button>

                          {writes && (
                            c.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "SUSPENDED")}
                                title="Tạm đình chỉ hoạt động doanh nghiệp"
                              >
                                Đình chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "ACTIVE")}
                                title="Kích hoạt lại doanh nghiệp"
                              >
                                Kích hoạt
                              </button>
                            )
                          )}

                          {writes && (
                            c.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "SUSPENDED")}
                                title="Tạm đình chỉ hoạt động doanh nghiệp"
                              >
                                Đình chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "ACTIVE")}
                                title="Kích hoạt lại doanh nghiệp"
                              >
                                Kích hoạt
                              </button>
                            )
                          )}

                          {writes && (
                            c.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "SUSPENDED")}
                                title="Tạm đình chỉ hoạt động doanh nghiệp"
                              >
                                Đình chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "ACTIVE")}
                                title="Kích hoạt lại doanh nghiệp"
                              >
                                Kích hoạt
                              </button>
                            )
                          )}

                          {writes && (
                            c.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "SUSPENDED")}
                                title="Tạm đình chỉ hoạt động doanh nghiệp"
                              >
                                Đình chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "ACTIVE")}
                                title="Kích hoạt lại doanh nghiệp"
                              >
                                Kích hoạt
                              </button>
                            )
                          )}

                          {writes && (
                            c.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "SUSPENDED")}
                                title="Tạm đình chỉ hoạt động doanh nghiệp"
                              >
                                Đình chỉ
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a" }}
                                disabled={isBusy}
                                onClick={() => handleStatusChange(c, "ACTIVE")}
                                title="Kích hoạt lại doanh nghiệp"
                              >
                                Kích hoạt
                              </button>
                            )
                          )}

                          {writes && isPending && (
                            <>
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnPrimary}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                disabled={isBusy}
                                onClick={() => handleApproveVerification(c)}
                                title="Phê duyệt xác minh ngay"
                              >
                                Phê duyệt
                              </button>

                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnOutline}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5" }}
                                disabled={isBusy}
                                onClick={() => {
                                  setRejectingCompany(c);
                                  setRejectionReason("");
                                  setRejectionError("");
                                }}
                                title="Từ chối xác minh kèm lý do"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20 }}>
            <Pagination
              page={companies.data.pagination.page}
              totalPages={companies.data.pagination.totalPages}
              onChange={(p: number) => setFilter("page", String(p))}
            />
          </div>
        </>
      )}

      {/* COMPANY DETAIL & BUSINESS PERMISSION CENTER MODAL */}
      {selectedCompanyId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="company-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setSelectedCompanyId(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 860,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 id="company-modal-title" style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                    {companyDetail?.name || "Hồ sơ doanh nghiệp"}
                  </h3>
                  {companyDetail && (
                    <Badge tone={companyDetail.verificationStatus === "VERIFIED" ? "success" : companyDetail.verificationStatus === "PENDING" ? "warning" : "neutral"}>
                      {companyDetail.verificationStatus}
                    </Badge>
                  )}
                </div>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Mã hệ thống: {selectedCompanyId}
                </span>
              </div>
              <button
                type="button"
                className={ui.btn}
                style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setSelectedCompanyId(null)}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 24px 0",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === "overview" ? "var(--color-primary, #4f6ef7)" : "#64748b",
                  borderBottom: activeTab === "overview" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
                }}
              >
                Tổng quan & Vận hành
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("legal")}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === "legal" ? "var(--color-primary, #4f6ef7)" : "#64748b",
                  borderBottom: activeTab === "legal" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
                }}
              >
                Hồ sơ Pháp lý & Thẩm định
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("permissions")}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === "permissions" ? "var(--color-primary, #4f6ef7)" : "#64748b",
                  borderBottom: activeTab === "permissions" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Layers size={15} />
                <span>Trung tâm Phân quyền (Permission Center)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {modalLoading ? (
                <LoadingBlock rows={4} label="Đang tải dữ liệu chi tiết doanh nghiệp" />
              ) : !companyDetail ? (
                <p style={{ color: "#dc2626" }}>Không thể nạp thông tin doanh nghiệp. Vui lòng thử lại.</p>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === "overview" && (
                    <div style={{ display: "grid", gap: 16 }}>
                      {/* Metric Counts */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Thành viên công ty</span>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                            {companyDetail.counts.members}
                          </div>
                        </div>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tin tuyển dụng</span>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                            {companyDetail.counts.jobs}
                          </div>
                        </div>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Hồ sơ ứng tuyển</span>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                            {companyDetail.counts.applications}
                          </div>
                        </div>
                      </div>

                      {/* General Info Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>TÊN PHÁP LÝ DOANH NGHIỆP</div>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{companyDetail.legalName || "—"}</div>
                        </div>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>MÃ SỐ THUẾ</div>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{companyDetail.taxCode || "—"}</div>
                        </div>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>WEBSITE DOANH NGHIỆP</div>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>
                            {companyDetail.website ? (
                              <a href={companyDetail.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary, #4f6ef7)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span>{companyDetail.website}</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : "—"}
                          </div>
                        </div>
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>QUY MÔ NHÂN SỰ</div>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{companyDetail.employeeSizeRange || "—"}</div>
                        </div>
                      </div>

                      {/* Locations List */}
                      <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6 }}>ĐỊA ĐIỂM HOẠT ĐỘNG ({companyDetail.locations.length})</div>
                        {companyDetail.locations.length === 0 ? (
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Chưa đăng ký địa điểm làm việc.</span>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {companyDetail.locations.map((loc) => (
                              <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#1e293b" }}>
                                <MapPin size={14} color="#64748b" />
                                <span>{loc.addressLine || "Địa chỉ chưa cập nhật"}</span>
                                {loc.isHeadquarters && (
                                  <Badge tone="info">Trụ sở chính</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LEGAL & VERIFICATION */}
                  {activeTab === "legal" && (
                    <div style={{ display: "grid", gap: 16 }}>
                      {companyDetail.verificationStatus === "REJECTED" && companyDetail.verificationRejectionReason && (
                        <div style={{ padding: 14, background: "#fee2e2", borderRadius: 8, border: "1px solid #fca5a5" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>LÝ DO TỪ CHỐI XÁC MINH TRƯỚC ĐÓ:</div>
                          <div style={{ fontSize: "0.875rem", color: "#7f1d1d" }}>{companyDetail.verificationRejectionReason}</div>
                        </div>
                      )}

                      {/* Legal Profile */}
                      <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                          Thông tin đăng ký kinh doanh chính thức
                        </h4>
                        {companyLegal?.profile ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.85rem" }}>
                            <div>
                              <span style={{ color: "#64748b" }}>Người đại diện pháp luật:</span>{" "}
                              <strong>{companyLegal.profile.representativeName}</strong>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Chức danh:</span>{" "}
                              <strong>{companyLegal.profile.representativeTitle || "—"}</strong>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Email liên hệ pháp lý:</span>{" "}
                              <strong>{companyLegal.profile.contactEmail}</strong>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Số điện thoại:</span>{" "}
                              <strong>{companyLegal.profile.contactPhone}</strong>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <span style={{ color: "#64748b" }}>Địa chỉ đăng ký doanh nghiệp:</span>{" "}
                              <strong>{companyLegal.profile.registeredAddress}</strong>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                            Doanh nghiệp chưa cập nhật hồ sơ pháp lý chi tiết.
                          </span>
                        )}
                      </div>

                      {/* Legal Evidences / Uploaded Documents */}
                      <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                          Chứng từ pháp lý đính kèm ({companyLegal?.evidences.length || 0})
                        </h4>
                        {!companyLegal || companyLegal.evidences.length === 0 ? (
                          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                            Chưa có chứng từ nào được tải lên (cần giấy phép ĐKKD để phê duyệt).
                          </span>
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            {companyLegal.evidences.map((ev) => (
                              <div
                                key={ev.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  background: "#ffffff",
                                  borderRadius: 6,
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <FileText size={16} color="var(--color-primary, #4f6ef7)" />
                                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                                    {ev.originalName}
                                  </span>
                                  <Badge tone="info">{ev.kind}</Badge>
                                </div>

                                <a
                                  href={adminApi.getLegalEvidenceDownloadUrl(companyDetail.id, ev.id)}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${ui.btn} ${ui.btnOutline}`}
                                  style={{ padding: "4px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Download size={13} />
                                  <span>Tải xuống</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Verification Decision Bar */}
                      {writes && (
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                          {companyDetail.verificationStatus !== "VERIFIED" && (
                            <button
                              type="button"
                              className={`${ui.btn} ${ui.btnPrimary}`}
                              disabled={busyId === companyDetail.id}
                              onClick={() => handleApproveVerification(companyDetail)}
                            >
                              Phê duyệt xác minh (Verify)
                            </button>
                          )}

                          {companyDetail.verificationStatus !== "REJECTED" && (
                            <button
                              type="button"
                              className={`${ui.btn} ${ui.btnOutline}`}
                              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                              disabled={busyId === companyDetail.id}
                              onClick={() => {
                                setRejectingCompany(companyDetail);
                                setRejectionReason("");
                                setRejectionError("");
                              }}
                            >
                              Từ chối hồ sơ (Reject)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Platform capabilities are loaded from the server for this company. */}
                  {activeTab === "permissions" && (
                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={{ padding: 16, background: "#eff6ff", borderRadius: 8, color: "#1e40af" }}>
                        Quyền hiệu lực cần năng lực nền tảng, quyền vai trò nội bộ và trạng thái doanh nghiệp hợp lệ.
                        Xác minh pháp lý và cấp năng lực là hai quyết định riêng.
                      </div>
                      {capabilitiesLoading && <div role="status">Đang tải năng lực doanh nghiệp…</div>}
                      {capabilitiesError && (
                        <div role="alert" style={{ color: "#b91c1c" }}>
                          {capabilitiesError}
                          <button type="button" className={ui.btn} onClick={() => {
                            if (!selectedCompanyId) return;
                            setCapabilitiesLoading(true);
                            setCapabilitiesError(null);
                            adminApi.getCompanyCapabilities(selectedCompanyId)
                              .then(setCapabilities)
                              .catch((error: unknown) => setCapabilitiesError(toApiFailure(error).message))
                              .finally(() => setCapabilitiesLoading(false));
                          }}>Thử lại</button>
                        </div>
                      )}
                      {capabilityNotice && <div role="status" style={{ color: "#166534" }}>{capabilityNotice}</div>}
                      {capabilities && !capabilitiesLoading && (
                        <div style={{ display: "grid", gap: 10 }}>
                          {PLATFORM_CAPABILITIES.map((cap) => {
                            const record = capabilities.capabilities.find((item) => item.code === cap.code);
                            const granted = record?.isGranted === true;
                            return (
                              <label key={cap.code} style={{ display: "flex", gap: 12, padding: 14,
                                border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
                                <input type="checkbox" checked={granted}
                                  disabled={!writes || !record?.available || capabilityBusy !== null}
                                  onChange={(event) => void changeCapability(cap.code, event.target.checked)}
                                  aria-label={cap.name} />
                                <span style={{ flex: 1 }}>
                                  <strong>{cap.name}</strong> <code>{cap.code}</code>
                                  <span style={{ float: "right" }}>
                                    <Badge tone={!record?.available ? "neutral" : granted ? "success" : "warning"}>
                                      {!record?.available ? "Chưa triển khai" : granted ? "Đã cấp" : "Chưa cấp"}
                                    </Badge>
                                  </span>
                                  <span style={{ display: "block", color: "#64748b", fontSize: "0.825rem" }}>{cap.description}</span>
                                  {capabilityBusy === cap.code && <span role="status">Đang lưu…</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--color-border, #e2e8f0)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                borderBottomLeftRadius: 14,
                borderBottomRightRadius: 14,
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Nhấn <strong>Esc</strong> hoặc nút đóng để quay lại danh sách
              </span>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnOutline}`}
                onClick={() => setSelectedCompanyId(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL (Backend requirement >= 10 chars) */}
      {rejectingCompany && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejection-dialog-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: 16,
          }}
          onClick={() => setRejectingCompany(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="rejection-dialog-title" style={{ margin: "0 0 8px", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
              Từ chối xác minh: {rejectingCompany.name}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
              Vui lòng cung cấp lý do từ chối cụ thể để gửi thông báo hướng dẫn doanh nghiệp hoàn thiện lại hồ sơ (tối thiểu 10 ký tự).
            </p>

            {rejectionError && (
              <div className={`${ui.notice} ${ui.noticeWarn}`} style={{ marginBottom: 14 }}>
                {rejectionError}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="rejection-textarea" style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                Lý do từ chối hồ sơ:
              </label>
              <textarea
                id="rejection-textarea"
                rows={4}
                className={ui.input}
                placeholder="Ví dụ: Giấy chứng nhận ĐKKD bị mờ không đọc được mã số thuế; cần bổ sung giấy ủy quyền người đại diện..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ width: "100%", resize: "vertical" }}
              />
              <span style={{ fontSize: "0.75rem", color: rejectionReason.trim().length >= 10 ? "#16a34a" : "#94a3b8" }}>
                Số ký tự: {rejectionReason.trim().length}/10 (tối thiểu)
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnOutline}`}
                onClick={() => setRejectingCompany(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnDanger}`}
                disabled={busyId === rejectingCompany.id || rejectionReason.trim().length < 10}
                onClick={submitRejection}
              >
                Xác nhận từ chối hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCompaniesPage;
