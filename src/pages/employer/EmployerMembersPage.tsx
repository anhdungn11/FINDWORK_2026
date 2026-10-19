import { useState, type FormEvent } from "react";
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

  const members = useAsyncData((s) => companyWorkspaceApi.listMembers(active.id, s), [active.id]);
  const invitations = useAsyncData((s) => companyWorkspaceApi.listInvitations(active.id, s), [active.id]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    try {
      await companyWorkspaceApi.createInvitation(active.id, email);
      setNotice({ tone: "ok", text: `Đã gửi thư mời tham gia thành công tới ${email}.` });
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
        text: `Đã cập nhật vai trò của ${member.user?.email || member.id} thành "${ROLE_LABELS[newRole] || newRole}".`,
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
    if (!window.confirm(`Xác nhận xóa thành viên "${targetName}" khỏi công ty?`)) return;

    setBusyMemberId(member.id);
    setNotice(null);
    try {
      await companyWorkspaceApi.removeMember(active.id, member.id);
      setNotice({ tone: "ok", text: `Đã xóa thành viên "${targetName}" khỏi công ty.` });
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
        `Xác nhận chuyển toàn bộ quyền Chủ sở hữu (Owner) của công ty "${active.name}" cho "${targetName}"?\nSau khi chuyển, vai trò của bạn sẽ chuyển thành Quản trị viên (Admin).`
      )
    )
      return;

    setBusyMemberId(member.id);
    setNotice(null);
    try {
      await companyWorkspaceApi.transferOwnership(active.id, member.id);
      setNotice({
        tone: "ok",
        text: `Đã chuyển thành công quyền Chủ sở hữu công ty cho "${targetName}".`,
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

  return (
    <>
      <PageHeader
        title="Thành viên & Quyền hạn"
        subtitle="Quản lý nhân sự nội bộ, phân quyền vai trò và theo dõi trạng thái lời mời tham gia doanh nghiệp."
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

      <div style={{ display: "grid", gap: 20 }}>
        {/* Workspace role info */}
        <Card title="Vai trò hiện tại của bạn trong công ty">
          <p style={{ margin: "0 0 8px", color: "var(--color-text-secondary)" }}>
            Tài khoản của bạn ({currentUser?.email || "Bạn"}) đang quản lý doanh nghiệp{" "}
            <strong>{active.name}</strong>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {active.memberRoleNames.map((role) => (
              <Badge key={role} tone="info">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Invite Member Card */}
        <Card title="Mời thành viên mới">
          <form onSubmit={handleInvite} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label htmlFor="inviteEmailInput" className={ui.label}>
                Email thành viên cần mời
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
            >
              {inviting ? "Đang gửi lời mời..." : "Gửi lời mời"}
            </button>
          </form>
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            * Thành viên sau khi chấp nhận lời mời sẽ mặc định có quyền VIEWER và có thể được phân quyền bổ sung bởi Admin.
          </p>
        </Card>

        {/* Internal Members Table */}
        <Card title="Danh sách thành viên nội bộ">
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
                <thead>
                  <tr>
                    <th scope="col">Thành viên</th>
                    <th scope="col">Vai trò</th>
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
                    const canModify = writes && !m.isOwner && !isSelf;
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
                              className={ui.input}
                              style={{ width: "auto", minWidth: 160, padding: "4px 8px", fontSize: "0.875rem" }}
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
                                <Badge tone="neutral">VIEWER</Badge>
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
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {isCurrentOwner && (
                                <button
                                  type="button"
                                  className={ui.btn}
                                  style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                  disabled={busyMemberId === m.id}
                                  onClick={() => handleTransferOwnership(m)}
                                  title="Chuyển quyền Chủ sở hữu cho thành viên này"
                                >
                                  Chuyển Owner
                                </button>
                              )}
                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnDanger}`}
                                style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                                disabled={busyMemberId === m.id}
                                onClick={() => handleRemoveMember(m)}
                              >
                                {busyMemberId === m.id ? "Đang xử lý..." : "Xóa"}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                              {m.isOwner ? "Bảo vệ (Owner)" : isSelf ? "Tài khoản hiện tại" : "—"}
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

        {/* Invitations Table */}
        <Card title="Lời mời thành viên đang chờ xử lý">
          {invitations.loading ? (
            <LoadingBlock rows={2} label="Đang tải danh sách lời mời..." />
          ) : invitations.error ? (
            <ApiErrorState error={invitations.error} onRetry={invitations.reload} />
          ) : !invitations.data || invitations.data.length === 0 ? (
            <EmptyState
              title="Không có lời mời nào đang chờ"
              text="Chưa có lời mời tham gia doanh nghiệp nào được gửi hoặc tất cả đã được xử lý."
            />
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th scope="col">Email người nhận</th>
                    <th scope="col">Ngày gửi</th>
                    <th scope="col">Hạn lời mời</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.data.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.emailNormalized || "—"}</strong>
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
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>—</span>
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
    </>
  );
};

export default EmployerMembersPage;
