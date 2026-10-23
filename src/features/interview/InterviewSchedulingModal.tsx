import { useState, type FormEvent } from "react";
import { Calendar, Video, MapPin, AlertCircle, X } from "lucide-react";
import { ui } from "../../components/ui";

export {
  type ScheduledInterviewData,
  getScheduledInterview,
  saveScheduledInterview,
} from "./interviewStorage";
import { type ScheduledInterviewData } from "./interviewStorage";

interface InterviewSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  onScheduleConfirm: (data: ScheduledInterviewData) => Promise<void>;
  loading?: boolean;
}

export const InterviewSchedulingModal = ({
  isOpen,
  onClose,
  candidateName,
  candidateEmail,
  jobTitle,
  onScheduleConfirm,
  loading = false,
}: InterviewSchedulingModalProps) => {
  // Form fields
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [format, setFormat] = useState<"ZOOM" | "MEET" | "IN_PERSON">("ZOOM");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ scheduledAt?: string; meetingUrl?: string; locationAddress?: string }>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!scheduledAt) {
      errs.scheduledAt = "Vui lòng chọn thời gian phỏng vấn.";
    } else {
      const selectedTime = new Date(scheduledAt).getTime();
      if (selectedTime < Date.now()) {
        errs.scheduledAt = "Thời gian phỏng vấn phải ở trong tương lai.";
      }
    }

    if ((format === "ZOOM" || format === "MEET") && !meetingUrl.trim()) {
      errs.meetingUrl = "Vui lòng nhập link phòng họp trực tuyến.";
    }

    if (format === "IN_PERSON" && !locationAddress.trim()) {
      errs.locationAddress = "Vui lòng nhập địa chỉ phòng phỏng vấn trực tiếp.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || loading) return;

    await onScheduleConfirm({
      scheduledAt,
      durationMinutes,
      format,
      meetingUrl: meetingUrl.trim() || undefined,
      locationAddress: locationAddress.trim() || undefined,
      interviewerName: interviewerName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "var(--color-primary, #4f6ef7)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h2 id="interview-modal-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Lên lịch phỏng vấn ứng viên
              </h2>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                {candidateName} • {jobTitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={ui.btn}
            style={{ padding: 6 }}
            disabled={loading}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Format selection */}
          <div className={ui.field}>
            <label className={ui.label}>Hình thức phỏng vấn *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <button
                type="button"
                style={{
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: format === "ZOOM" ? "2px solid var(--color-primary, #4f6ef7)" : "1px solid #cbd5e1",
                  background: format === "ZOOM" ? "#eff6ff" : "#ffffff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => setFormat("ZOOM")}
              >
                <Video size={16} color={format === "ZOOM" ? "var(--color-primary, #4f6ef7)" : "#64748b"} />
                <span>Trực tuyến Zoom</span>
              </button>

              <button
                type="button"
                style={{
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: format === "MEET" ? "2px solid var(--color-primary, #4f6ef7)" : "1px solid #cbd5e1",
                  background: format === "MEET" ? "#eff6ff" : "#ffffff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => setFormat("MEET")}
              >
                <Video size={16} color={format === "MEET" ? "var(--color-primary, #4f6ef7)" : "#64748b"} />
                <span>Google Meet</span>
              </button>

              <button
                type="button"
                style={{
                  padding: "10px 8px",
                  borderRadius: 8,
                  border: format === "IN_PERSON" ? "2px solid var(--color-primary, #4f6ef7)" : "1px solid #cbd5e1",
                  background: format === "IN_PERSON" ? "#eff6ff" : "#ffffff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => setFormat("IN_PERSON")}
              >
                <MapPin size={16} color={format === "IN_PERSON" ? "var(--color-primary, #4f6ef7)" : "#64748b"} />
                <span>Trực tiếp văn phòng</span>
              </button>
            </div>
          </div>

          {/* Honest Zoom integration status alert */}
          {format === "ZOOM" && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor: "#fffbeb",
                border: "1px solid #fef3c7",
                fontSize: "0.8rem",
                color: "#92400e",
                display: "flex",
                gap: 8,
              }}
              role="note"
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>Tích hợp Zoom Meeting:</strong> API OAuth tự động tạo phòng Zoom đang chờ cấu hình trên máy chủ Backend. Bạn có thể dán link phòng họp cá nhân hoặc link phòng họp Google Meet vào ô bên dưới.
              </span>
            </div>
          )}

          {/* Date & Time and Duration Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="scheduled-at">
                Thời gian phỏng vấn *
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                className={ui.input}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {errors.scheduledAt && <span style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.75rem" }}>{errors.scheduledAt}</span>}
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="duration">
                Thời lượng
              </label>
              <select
                id="duration"
                className={ui.select}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút (1 tiếng)</option>
                <option value={90}>90 phút (1.5 tiếng)</option>
              </select>
            </div>
          </div>

          {/* Meeting URL or Location Address */}
          {format !== "IN_PERSON" ? (
            <div className={ui.field}>
              <label className={ui.label} htmlFor="meeting-url">
                Link phòng họp trực tuyến *
              </label>
              <input
                id="meeting-url"
                type="url"
                className={ui.input}
                placeholder={format === "ZOOM" ? "https://zoom.us/j/123456789" : "https://meet.google.com/abc-defg-hij"}
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
              {errors.meetingUrl && <span style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.75rem" }}>{errors.meetingUrl}</span>}
            </div>
          ) : (
            <div className={ui.field}>
              <label className={ui.label} htmlFor="location-address">
                Địa chỉ phòng phỏng vấn trực tiếp *
              </label>
              <input
                id="location-address"
                type="text"
                className={ui.input}
                placeholder="VD: Phòng họp A3, Tầng 5, Tòa nhà..."
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
              />
              {errors.locationAddress && <span style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.75rem" }}>{errors.locationAddress}</span>}
            </div>
          )}

          {/* Interviewer */}
          <div className={ui.field}>
            <label className={ui.label} htmlFor="interviewer">
              Người phỏng vấn / Hội đồng
            </label>
            <input
              id="interviewer"
              type="text"
              className={ui.input}
              placeholder="VD: Trưởng phòng kỹ thuật (Nguyễn Văn A)"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
            />
          </div>

          {/* Notes for candidate */}
          <div className={ui.field}>
            <label className={ui.label} htmlFor="notes">
              Ghi chú & dặn dò ứng viên
            </label>
            <textarea
              id="notes"
              rows={3}
              className={ui.input}
              placeholder="Nội dung sẽ được đính kèm vào lịch phỏng vấn và gửi thông báo tới ứng viên..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Notification recipient */}
          <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.8rem", color: "#64748b" }}>
            📧 Ứng viên nhận thông báo: <strong>{candidateEmail}</strong>
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              className={ui.btn}
              disabled={loading}
              onClick={onClose}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={loading}
            >
              {loading ? "Đang lưu lịch..." : "Xác nhận lên lịch phỏng vấn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
