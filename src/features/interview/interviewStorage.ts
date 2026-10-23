export interface ScheduledInterviewData {
  scheduledAt: string;
  durationMinutes: number;
  format: "ZOOM" | "MEET" | "IN_PERSON";
  meetingUrl?: string;
  locationAddress?: string;
  interviewerName?: string;
  notes?: string;
}

export const getScheduledInterview = (applicationId: string): ScheduledInterviewData | null => {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(`findwork.interview.${applicationId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveScheduledInterview = (applicationId: string, data: ScheduledInterviewData): void => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(`findwork.interview.${applicationId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
};
