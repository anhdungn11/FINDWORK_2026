import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  Copy,
  Check,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Layers,
  Ban,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  JobStatusBadge,
  LoadingBlock,
  PageHeader,
  Pagination,
  ui,
} from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminJobDto, type AdminJobDetailDto } from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái tin" },
  { value: "PUBLISHED", label: "Đang công khai (PUBLISHED)" },
  { value: "DRAFT", label: "Bản nháp (DRAFT)" },
  { value: "PAUSED", label: "Tạm dừng (PAUSED)" },
  { value: "CLOSED", label: "Đã đóng (CLOSED)" },
  { value: "EXPIRED", label: "Hết hạn (EXPIRED)" },
  { value: "ARCHIVED", label: "Đã lưu trữ (ARCHIVED)" },
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

function formatSalaryText(min: number | null, max: number | null, currency = "VND", negotiable = false): string {
  if (negotiable) return "Thương lượng";
  if (!min && !max) return "Thương lượng";
  const fmt = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} tr` : v.toLocaleString());
  if (min && max) return `${fmt(min)} - ${fmt(max)} ${currency}`;
  if (min) return `Từ ${fmt(min)} ${currency}`;
  if (max) return `Lên đến ${fmt(max)} ${currency}`;
  return "Thương lượng";
}

const AdminJobsPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const companyId = params.get("companyId") ?? "";

  const [companyIdInput, setCompanyIdInput] = useState(companyId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Job Detail Modal State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<AdminJobDetailDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const writes = isWorkspaceWritesEnabled();

  const jobs = useAsyncData(
    (signal) =>
      adminApi.listJobs(
        { page, pageSize: 20, status: status || undefined, companyId: companyId || undefined },
        signal,
      ),
    [page, status, companyId],
  );

  useEffect(() => {
    setCompanyIdInput(companyId);
  }, [companyId]);

  // Load Job Detail
  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      return;
    }
    let isMounted = true;
    setModalLoading(true);
    adminApi
      .getJob(selectedJobId)
      .then((res) => {
        if (isMounted) setJobDetail(res);
      })
      .catch((err) => {
        if (isMounted) setNotice({ tone: "error", text: toApiFailure(err).message });
      })
      .finally(() => {
        if (isMounted) setModalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedJobId]);

  // Escape key support
  useEffect(() => {
    if (!selectedJobId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedJobId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedJobId]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const handleCompanyFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter("companyId", companyIdInput.trim());
  };

  const handleClearFilters = () => {
    setCompanyIdInput("");
    setParams(new URLSearchParams());
  };

  const handleCloseJob = async (job: AdminJobDto) => {
    if (
      !window.confirm(
        `Xác nhận cưỡng chế gỡ bỏ / đóng tin tuyển dụng “${job.title}”? Hành động này sẽ được ghi nhận vào nhật ký kiểm toán hệ thống.`,
      )
    ) {
      return;
    }

    setBusyId(job.id);
    setNotice(null);
    try {
      const updated = await adminApi.closeJob(job.id);
      setNotice({
        tone: "ok",
        text: `Đã kiểm duyệt cưỡng chế đóng tin tuyển dụng “${job.title}”.`,
      });
      if (jobDetail && jobDetail.id === job.id) {
        setJobDetail({ ...jobDetail, status: "CLOSED", version: updated.version });
      }
      jobs.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Kiểm duyệt tin tuyển dụng toàn hệ thống"
        subtitle="Rà soát nội dung tin đăng tuyển, theo dõi thời hạn ứng tuyển và cưỡng chế đóng các tin đăng vi phạm quy chuẩn."
        actions={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnOutline}`}
            onClick={jobs.reload}
            disabled={jobs.loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} className={jobs.loading ? "spin" : ""} />
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

      {/* FILTER TOOLBAR */}
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
        <form onSubmit={handleCompanyFilterSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className={ui.input}
              placeholder="Lọc theo mã công ty (Company UUID)..."
              value={companyIdInput}
              onChange={(e) => setCompanyIdInput(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`}>
            Lọc theo công ty
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Filter size={16} color="#64748b" />
          <select
            className={ui.select}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
            style={{ minWidth: 210 }}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {(status || companyId) && (
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
      {jobs.loading ? (
        <LoadingBlock rows={5} label="Đang nạp danh sách tin tuyển dụng toàn hệ thống" />
      ) : jobs.error ? (
        <ApiErrorState error={jobs.error} onRetry={jobs.reload} />
      ) : !jobs.data || jobs.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy tin tuyển dụng"
          text={
            status || companyId
              ? "Không có tin đăng nào phù hợp với bộ lọc hiện tại. Thử xóa bộ lọc để xem toàn bộ danh sách."
              : "Hệ thống chưa có tin tuyển dụng nào được tạo."
          }
          action={
            status || companyId ? (
              <button type="button" className={`${ui.btn} ${ui.btnOutline}`} onClick={handleClearFilters}>
                Xóa bộ lọc
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách tin tuyển dụng kiểm duyệt</caption>
              <thead>
                <tr>
                  <th scope="col">Tiêu đề tin tuyển dụng</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày đăng tin</th>
                  <th scope="col">Hạn nộp hồ sơ</th>
                  <th scope="col" style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.data.map((j) => {
                  const isBusy = busyId === j.id;
                  const canClose = j.status === "PUBLISHED" || j.status === "PAUSED";
                  return (
                    <tr key={j.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                            {j.title}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                            Mã công ty: {j.companyId.slice(0, 8)}… · Phiên bản: v{j.version}
                          </span>
                        </div>
                      </td>
                      <td>
                        <JobStatusBadge status={j.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          {formatDate(j.publishedAt || j.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          {formatDate(j.applicationDeadline)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnOutline}`}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => setSelectedJobId(j.id)}
                            title="Xem chi tiết nội dung tin đăng"
                          >
                            <Eye size={14} />
                            <span>Chi tiết</span>
                          </button>

                          {writes && canClose && (
                            <button
                              type="button"
                              className={`${ui.btn} ${ui.btnOutline}`}
                              style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5" }}
                              disabled={isBusy}
                              onClick={() => handleCloseJob(j)}
                              title="Cưỡng chế đóng tin tuyển dụng vi phạm"
                            >
                              <Ban size={13} style={{ marginRight: 3 }} />
                              <span>Đóng tin</span>
                            </button>
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
              page={jobs.data.pagination.page}
              totalPages={jobs.data.pagination.totalPages}
              total={jobs.data.pagination.total}
              onPageChange={(p) => setFilter("page", String(p))}
            />
          </div>
        </>
      )}

      {/* JOB DETAIL INSPECTION MODAL */}
      {selectedJobId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-modal-title"
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
          onClick={() => setSelectedJobId(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3 id="job-modal-title" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>
                    {jobDetail?.title || "Chi tiết tin tuyển dụng"}
                  </h3>
                  {jobDetail && <JobStatusBadge status={jobDetail.status} />}
                </div>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Mã tin: {selectedJobId} · Doanh nghiệp: {jobDetail?.company?.name || jobDetail?.companyId}
                </span>
              </div>
              <button
                type="button"
                className={ui.btn}
                style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setSelectedJobId(null)}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {modalLoading ? (
                <LoadingBlock rows={4} label="Đang tải dữ liệu chi tiết tin đăng" />
              ) : !jobDetail ? (
                <p style={{ color: "#dc2626" }}>Không thể nạp thông tin tin tuyển dụng. Vui lòng thử lại.</p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {/* Meta Pills */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: 8, fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} color="#64748b" />
                      <span>{jobDetail.company?.name || "Doanh nghiệp ẩn danh"}</span>
                    </div>

                    <div style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: 8, fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <DollarSign size={14} color="#16a34a" />
                      <span>{formatSalaryText(jobDetail.salaryMin, jobDetail.salaryMax, jobDetail.currency, jobDetail.salaryNegotiable)}</span>
                    </div>

                    <div style={{ padding: "6px 12px", background: "#f1f5f9", borderRadius: 8, fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Clock size={14} color="#64748b" />
                      <span>Hình thức: {jobDetail.workplaceType} · {jobDetail.employmentType}</span>
                    </div>

                    <div style={{ padding: "6px 12px", background: "#e0f2fe", borderRadius: 8, fontSize: "0.825rem", color: "#0369a1", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <strong>{jobDetail.applicationsCount}</strong> ứng viên đã nộp
                    </div>
                  </div>

                  {/* Description Box */}
                  <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                      NỘI DUNG MÔ TẢ CÔNG VIỆC
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        maxHeight: 280,
                        overflowY: "auto",
                      }}
                    >
                      {jobDetail.description || "(Không có nội dung mô tả)"}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: "0.8rem", color: "#64748b" }}>
                    <div>
                      <span>Ngày tạo:</span> <strong style={{ color: "#1e293b" }}>{formatDate(jobDetail.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Ngày công khai:</span> <strong style={{ color: "#1e293b" }}>{formatDate(jobDetail.publishedAt)}</strong>
                    </div>
                    <div>
                      <span>Hạn ứng tuyển:</span> <strong style={{ color: "#1e293b" }}>{formatDate(jobDetail.applicationDeadline)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
              {jobDetail && writes && (jobDetail.status === "PUBLISHED" || jobDetail.status === "PAUSED") ? (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnDanger}`}
                  disabled={busyId === jobDetail.id}
                  onClick={() => handleCloseJob(jobDetail)}
                >
                  Cưỡng chế đóng tin
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                className={`${ui.btn} ${ui.btnOutline}`}
                onClick={() => setSelectedJobId(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminJobsPage;
