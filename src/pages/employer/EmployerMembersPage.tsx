import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserCheck,
  Mail,
  ShieldAlert,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, ui } from "@/components/ui";
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

  const handleRemoveMember = async (member: CompanyMemberDto) => {
    const targetName = member.user?.email || member.id;
    if (!window.confirm(`Xác nhận xóa thành viên "${targetName}" khỏi doanh nghiệp?`)) return;

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
  };

  const handleTransferOwnership = async (member: CompanyMemberDto) => {
    const targetName = member.user?.email || member.id;
    if (
      !window.confirm(
        `XÁC NHẬN CHUYỂN QUYỀN CHỦ SỞ HỮU (OWNER):\nBạn có chắc chắn muốn chuyển toàn bộ quyền Chủ sở hữu của công ty "${active.name}" cho "${targetName}"?\nSau khi chuyển, vai trò của bạn sẽ chuyển thành Quản trị viên (Admin).`
      )
    )
      return;

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
  };

  const handleRevokeInvitation = async (inv: CompanyInvitationDto) => {
    if (!window.confirm(`Xác nhận thu hồi lời mời gửi tới "${inv.emailNormalized}"?`)) return;

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
          {/* USER'S ROLE CARD */}
          <div
            style={{
              padding: 16,
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className={ui.hint}>Tài khoản hiện tại của bạn:</span>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary, #1e293b)" }}>
                {currentUser?.email || "Bạn"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {active.memberRoleNames.map((role) => (
                <Badge key={role} tone="info">
                  {ROLE_LABELS[role] || role.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* INTERNAL MEMBERS TABLE */}
          <Card title="Danh sách nhân sự quản trị doanh nghiệp">
            {members.loading ? (
              <LoadingBlock rows={3} label="Đang tải danh sách thành viên..." />
            ) : members.error ? (
              <ApiErrorState error={members.error} onRetry={members.reload} />
            ) : !members.data || members.data.length === 0 ? (
              <EmptyState
                title="Chưa có thành viên nào"
                text="Doanh nghiệp chưa có thành viên nội bộ nào ngoài chủ sở hữu."
              />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Danh sách thành viên quản trị nội bộ của công ty</caption>
                  <thead>
                    <tr>
                      <th scope="col">Thành viên</th>
                      <th scope="col">Vai trò trong công ty</th>
                      <th scope="col">Ngày gia nhập</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Phân quyền & Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.data.map((m) => {
                      const isSelf = currentUser?.id && m.user?.id === currentUser.id;
                      const isCurrentOwner = Boolean(
                        members.data?.some((mem) => mem.isOwner && currentUser?.id && mem.user?.id === currentUser.id),
                      );
                      const canModify = writes && userCanManage && !m.isOwner && !isSelf;
                      const primaryRole = m.roles?.[0]?.role?.name || "VIEWER";

                      return (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{m.user?.email || m.id}</div>
                            {m.isOwner && (
                              <Badge tone="success" style={{ marginTop: 4 }}>
                                Chủ sở hữu (Owner)
                              </Badge>
                            )}
                            {isSelf && (
                              <Badge tone="neutral" style={{ marginTop: 4, marginLeft: 4 }}>
                                Chính bạn
                              </Badge>
                            )}
                          </td>
                          <td>
                            {canModify ? (
                              <select
                                aria-label={`Thay đổi vai trò cho ${m.user?.email || m.id}`}
                                className={ui.select}
                                style={{ width: "auto", minWidth: 180, padding: "5px 10px", fontSize: "0.85rem" }}
                                value={primaryRole}
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
                                {m.roles && m.roles.length > 0 ? (
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
                    disabled={!writes || inviting}
                  />
                </div>
                <button
                  type="submit"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  disabled={!writes || inviting || !inviteEmail.trim()}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <UserPlus size={16} />
                  <span>{inviting ? "Đang gửi thư mời..." : "Gửi lời mời nội bộ"}</span>
                </button>
              </form>
            )}
            <p style={{ margin: "10px 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)" }}>
              * Thành viên sau khi chấp nhận lời mời sẽ mặc định có quyền <strong>Người xem (Viewer)</strong> và có thể được phân quyền bổ sung bởi Quản trị viên.
            </p>
          </Card>

          {/* INVITATIONS TABLE */}
          <Card title="Danh sách lời mời nội bộ đang chờ hoặc đã xử lý">
            {invitations.loading ? (
              <LoadingBlock rows={2} label="Đang tải danh sách lời mời..." />
            ) : invitations.error ? (
              <ApiErrorState error={invitations.error} onRetry={invitations.reload} />
            ) : !invitations.data || invitations.data.length === 0 ? (
              <EmptyState
                title="Không có lời mời nào"
                text="Chưa có lời mời tham gia quản trị nội bộ nào được gửi đi."
              />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Danh sách lời mời thành viên nội bộ</caption>
                  <thead>
                    <tr>
                      <th scope="col">Email người nhận</th>
                      <th scope="col">Ngày gửi</th>
                      <th scope="col">Thời hạn lời mời</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.data.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.emailNormalized || "—"}</div>
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
    </>
  );
};

export default EmployerMembersPage;
