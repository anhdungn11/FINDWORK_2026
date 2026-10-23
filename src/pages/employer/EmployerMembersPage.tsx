import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserCheck,
  Mail,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ConfirmationModal, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { useAuthStore } from "@/store/authStore";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import {
  ASSIGNABLE_COMPANY_ROLES,
  type AssignableCompanyRole,
  type CompanyMemberDto,
  type CompanyInvitationDto,
} from "@/services/api/apiTypes";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { canManageMembers, canInviteMembers } from "@/features/company/companyWorkspacePermissions";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên (Admin)",
  HR_MANAGER: "Trưởng phòng nhân sự (HR Manager)",
  RECRUITER: "Chuyên viên tuyển dụng (Recruiter)",
  HIRING_MANAGER: "Quản lý tuyển dụng (Hiring Manager)",
  VIEWER: "Người xem (Viewer)",
};

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary" | "warning";
  action: () => Promise<void>;
}

const EmployerMembersPage = () => {
  const { active, reload: reloadWorkspace } = useCompanyWorkspace();
  const currentUser = useAuthStore((s) => s.user);
  const writes = isWorkspaceWritesEnabled();
  const userCanManage = canManageMembers(active.memberRoleNames);
  const userCanInvite = canInviteMembers(active.memberRoleNames);

  const [params, setParams] = useSearchParams();
  const currentTab = params.get("tab") === "invitations" ? "invitations" : "members";

  const members = useAsyncData((s) => companyWorkspaceApi.listMembers(active.id, s), [active.id]);
  const invitations = useAsyncData((s) => companyWorkspaceApi.listInvitations(active.id, s), [active.id]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Xác nhận",
    tone: "primary",
    action: async () => {},
  });
  const [dialogLoading, setDialogLoading] = useState(false);

  const setTab = (tab: "members" | "invitations") => {
    const next = new URLSearchParams(params);
    if (tab === "invitations") next.set("tab", "invitations");
    else next.delete("tab");
    setParams(next);
    setNotice(null);
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    try {
      await companyWorkspaceApi.createInvitation(active.id, email);
      setNotice({ tone: "ok", text: `Đã gửi lời mời tham gia quản trị nội bộ thành công tới "${email}".` });
      setInviteEmail("");
      invitations.reload();
    } catch (err) {
      setNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: CompanyMemberDto, newRole: AssignableCompanyRole) => {
    setBusyMemberId(member.id);
    setNotice(null);
    try {
      await companyWorkspaceApi.updateMemberRole(active.id, member.id, newRole);
      setNotice({
        tone: "ok",
        text: `Đã cập nhật vai trò của thành viên "${member.user?.email || member.id}" thành "${ROLE_LABELS[newRole] || newRole}".`,
      });
      members.reload();
    } catch (err) {
      setNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = (member: CompanyMemberDto) => {
    const targetName = member.user?.email || member.id;
    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa thành viên",
      description: `Bạn có chắc chắn muốn xóa thành viên "${targetName}" khỏi doanh nghiệp? Thành viên này sẽ không thể truy cập vào dữ liệu tuyển dụng của công ty nữa.`,
      confirmLabel: "Xóa thành viên",
      tone: "danger",
      action: async () => {
        setBusyMemberId(member.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.removeMember(active.id, member.id);
          setNotice({ tone: "ok", text: `Đã xóa thành viên "${targetName}" khỏi doanh nghiệp.` });
          members.reload();
        } catch (err) {
          setNotice({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setBusyMemberId(null);
        }
      },
    });
  };

  const handleTransferOwnership = (member: CompanyMemberDto) => {
    const targetName = member.user?.email || member.id;
    setConfirmDialog({
      isOpen: true,
      title: "Chuyển giao quyền Chủ sở hữu (Owner)",
      description: `Bạn có chắc chắn muốn chuyển toàn bộ quyền Chủ sở hữu của công ty "${active.name}" cho "${targetName}"? Sau khi chuyển, vai trò của bạn sẽ chuyển thành Quản trị viên (Admin).`,
      confirmLabel: "Chuyển quyền sở hữu",
      tone: "danger",
      action: async () => {
        setBusyMemberId(member.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.transferOwnership(active.id, member.id);
          setNotice({
            tone: "ok",
            text: `Đã chuyển giao toàn bộ quyền Chủ sở hữu doanh nghiệp cho "${targetName}".`,
          });
          members.reload();
          reloadWorkspace();
        } catch (err) {
          setNotice({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setBusyMemberId(null);
        }
      },
    });
  };

  const handleRevokeInvitation = (inv: CompanyInvitationDto) => {
    setConfirmDialog({
      isOpen: true,
      title: "Thu hồi lời mời nội bộ",
      description: `Bạn có chắc chắn muốn thu hồi lời mời gửi tới "${inv.emailNormalized}"? Liên kết lời mời đã gửi trước đây sẽ mất hiệu lực ngay lập tức.`,
      confirmLabel: "Thu hồi lời mời",
      tone: "warning",
      action: async () => {
        setBusyInvitationId(inv.id);
        setNotice(null);
        try {
          await companyWorkspaceApi.revokeInvitation(active.id, inv.id);
          setNotice({ tone: "ok", text: `Đã thu hồi lời mời gửi tới "${inv.emailNormalized}".` });
          invitations.reload();
        } catch (err) {
          setNotice({ tone: "error", text: toApiFailure(err).message });
        } finally {
          setBusyInvitationId(null);
        }
      },
    });
  };

  const handleExecuteDialog = async () => {
    setDialogLoading(true);
    try {
      await confirmDialog.action();
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setDialogLoading(false);
    }
  };

  const pendingInvitationsCount = (invitations.data ?? []).filter((i) => i.status === "PENDING").length;

  return (
    <>
      <PageHeader
        title="Quản trị nhân sự & Thành viên nội bộ"
        subtitle="Quản lý các tài khoản nhân sự nội bộ, phân quyền vai trò quản trị và theo dõi lời mời tham gia doanh nghiệp."
      />
      <WritesDisabledNotice />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 16 }}
        >
          {notice.text}
        </div>
      )}

      {/* TABS HEADER */}
      <div
        role="tablist"
        aria-label="Phân loại quản trị nhân sự"
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--color-border, #e2e8f0)",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "members"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: currentTab === "members" ? "var(--color-primary, #4f6ef7)" : "var(--color-text-secondary, #64748b)",
            borderBottom: currentTab === "members" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            transition: "all 140ms ease",
          }}
          onClick={() => setTab("members")}
        >
          <UserCheck size={18} />
          <span>Thành viên nội bộ & Phân quyền</span>
          <Badge tone="neutral" style={{ fontSize: "0.75rem" }}>
            {members.data?.length ?? 0}
          </Badge>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "invitations"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: currentTab === "invitations" ? "var(--color-primary, #4f6ef7)" : "var(--color-text-secondary, #64748b)",
            borderBottom: currentTab === "invitations" ? "2px solid var(--color-primary, #4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            transition: "all 140ms ease",
          }}
          onClick={() => setTab("invitations")}
        >
          <Mail size={18} />
          <span>Lời mời nội bộ & Cài đặt</span>
          {pendingInvitationsCount > 0 && (
            <Badge tone="warning" style={{ fontSize: "0.75rem" }}>
              {pendingInvitationsCount} đang chờ
            </Badge>
          )}
        </button>
      </div>

      {currentTab === "members" ? (
        /* ========================================================================= */
        /* TAB 1: INTERNAL MEMBERS & ROLES                                           */
        /* ========================================================================= */
        <div style={{ display: "grid", gap: 20 }}>
          <Card title="Danh sách thành viên quản trị doanh nghiệp">
            {members.loading ? (
              <LoadingBlock rows={3} label="Đang tải danh sách thành viên..." />
            ) : members.error ? (
              <ApiErrorState error={members.error} onRetry={members.reload} />
            ) : !members.data || members.data.length === 0 ? (
              <EmptyState title="Chưa có thành viên" text="Doanh nghiệp chưa có thành viên nào." />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Danh sách thành viên quản trị nội bộ của doanh nghiệp</caption>
                  <thead>
                    <tr>
                      <th scope="col">Thành viên</th>
                      <th scope="col">Vai trò hiện tại</th>
                      <th scope="col">Ngày tham gia</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.data.map((m) => {
                      const isSelf = m.user?.id === currentUser?.id;
                      const isOwner = m.isOwner;
                      const isCurrentOwner = active.memberRoleNames.includes("COMPANY_OWNER");
                      const canModify = userCanManage && writes && !isOwner && !isSelf;

                      return (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary, #1e293b)" }}>
                              {m.user?.email || "Thành viên"}
                              {isSelf && (
                                <span style={{ marginLeft: 6, fontSize: "0.75rem", color: "var(--color-primary, #4f6ef7)" }}>
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <div className={ui.hint}>{m.user?.email}</div>
                          </td>
                          <td>
                            {isOwner ? (
                              <Badge tone="warning" style={{ fontWeight: 700 }}>
                                Chủ sở hữu (Owner)
                              </Badge>
                            ) : canModify ? (
                              <select
                                className={ui.select}
                                style={{ width: "auto", minWidth: 200, padding: "4px 8px", fontSize: "0.85rem" }}
                                value={m.roles[0]?.role.name || "VIEWER"}
                                disabled={busyMemberId === m.id}
                                onChange={(e) => handleRoleChange(m, e.target.value as AssignableCompanyRole)}
                              >
                                {ASSIGNABLE_COMPANY_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABELS[r] || r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {m.roles.length > 0 ? (
                                  m.roles.map((r) => (
                                    <Badge key={r.role.id} tone="info">
                                      {ROLE_LABELS[r.role.name] || r.role.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge tone="neutral">Người xem (Viewer)</Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("vi-VN") : "—"}</td>
                          <td>
                            <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>
                              {m.status === "ACTIVE" ? "Đang hoạt động" : m.status}
                            </Badge>
                          </td>
                          <td>
                            {canModify ? (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                {isCurrentOwner && (
                                  <button
                                    type="button"
                                    className={ui.btn}
                                    style={{ padding: "4px 8px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                    disabled={busyMemberId === m.id}
                                    onClick={() => handleTransferOwnership(m)}
                                    title="Chuyển giao quyền Chủ sở hữu cho thành viên này"
                                  >
                                    <ArrowRightLeft size={13} />
                                    <span>Chuyển Owner</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`${ui.btn} ${ui.btnDanger}`}
                                  style={{ padding: "4px 10px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                                  disabled={busyMemberId === m.id}
                                  onClick={() => handleRemoveMember(m)}
                                >
                                  <Trash2 size={13} />
                                  <span>{busyMemberId === m.id ? "Đang xử lý..." : "Xóa"}</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--color-text-secondary, #64748b)", fontSize: "0.85rem" }}>
                                {m.isOwner ? "Chủ sở hữu (Bảo vệ)" : isSelf ? "Tài khoản hiện tại" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: INTERNAL TEAM INVITATIONS                                          */
        /* ========================================================================= */
        <div style={{ display: "grid", gap: 20 }}>
          {/* DISTINCTION NOTICE */}
          <div
            style={{
              padding: 16,
              background: "var(--color-surface-soft, #f8fafc)",
              border: "1px solid var(--color-border, #cbd5e1)",
              borderRadius: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Info size={20} color="var(--color-primary, #4f6ef7)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--color-text-primary, #1e293b)" }}>
              <strong>Phân biệt rõ Lời mời nội bộ với Lời mời phỏng vấn ứng viên:</strong> Lời mời tại khu vực này dùng để cấp quyền cho đồng nghiệp/nhân sự tham gia quản trị tin đăng và xem hồ sơ ứng tuyển của công ty. Lời mời này <em>không</em> gửi tới ứng viên tìm việc.
            </div>
          </div>

          {/* INVITE FORM */}
          <Card title="Mời nhân sự nội bộ tham gia quản trị">
            {!userCanInvite ? (
              <div className={`${ui.notice}`} role="note" style={{ marginBottom: 12 }}>
                Tài khoản của bạn hiện không có quyền gửi lời mời thành viên. Chỉ Chủ sở hữu, Quản trị viên hoặc Trưởng phòng nhân sự mới có thẩm quyền này.
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 320px" }}>
                  <label htmlFor="inviteEmailInput" className={ui.label}>
                    Địa chỉ Email của đồng nghiệp cần mời
                  </label>
                  <input
                    id="inviteEmailInput"
                    type="email"
                    className={ui.input}
                    placeholder="dongnghiep@congty.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviting || !writes}
                  />
                </div>
                <button
                  type="submit"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  disabled={inviting || !inviteEmail.trim() || !writes}
                  aria-disabled={!writes}
                  title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <UserPlus size={16} />
                  <span>{inviting ? "Đang gửi..." : "Gửi lời mời"}</span>
                </button>
              </form>
            )}
          </Card>

          {/* INVITATIONS LIST */}
          <Card title="Danh sách lời mời đã gửi">
            {invitations.loading ? (
              <LoadingBlock rows={2} label="Đang tải danh sách lời mời..." />
            ) : invitations.error ? (
              <ApiErrorState error={invitations.error} onRetry={invitations.reload} />
            ) : !invitations.data || invitations.data.length === 0 ? (
              <EmptyState title="Chưa có lời mời nào" text="Chưa có lời mời nội bộ nào được gửi đi." />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Danh sách lời mời tham gia quản trị nội bộ</caption>
                  <thead>
                    <tr>
                      <th scope="col">Email người nhận</th>
                      <th scope="col">Ngày gửi</th>
                      <th scope="col">Hết hạn vào</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.data.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.emailNormalized}</strong>
                        </td>
                        <td>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                        <td>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString("vi-VN") : "—"}</td>
                        <td>
                          <Badge
                            tone={
                              inv.status === "PENDING"
                                ? "warning"
                                : inv.status === "ACCEPTED"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {inv.status === "PENDING"
                              ? "Đang chờ chấp nhận"
                              : inv.status === "ACCEPTED"
                              ? "Đã chấp nhận"
                              : inv.status === "REVOKED"
                              ? "Đã thu hồi"
                              : inv.status === "EXPIRED"
                              ? "Hết hạn"
                              : inv.status}
                          </Badge>
                        </td>
                        <td>
                          {inv.status === "PENDING" && writes ? (
                            <button
                              type="button"
                              className={`${ui.btn} ${ui.btnDanger}`}
                              style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                              disabled={busyInvitationId === inv.id}
                              onClick={() => handleRevokeInvitation(inv)}
                            >
                              {busyInvitationId === inv.id ? "Đang xử lý..." : "Thu hồi"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--color-text-secondary, #64748b)", fontSize: "0.85rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteDialog}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        loading={dialogLoading}
      />
    </>
  );
};

export default EmployerMembersPage;
