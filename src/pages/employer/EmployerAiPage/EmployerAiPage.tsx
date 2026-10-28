import React, { useState, useEffect, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  HelpCircle,
  Users,
  Calendar,
  Layers,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  RefreshCw,
  PlusCircle,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { canUseBusinessAi } from "@/features/company/companyWorkspacePermissions";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import {
  employerAiApi,
  CompanyAiNotImplementedError,
  type DraftJobRequest,
  type DraftJobResponse,
  type ImproveJobRequest,
  type ImproveJobResponse,
  type ScreeningQuestionsRequest,
  type ScreeningQuestionsResponse,
  type InterviewQuestionsRequest,
  type InterviewQuestionsResponse,
  type RecruitmentPlanRequest,
  type RecruitmentPlanResponse,
  type AiTone,
  type EmploymentType,
  type ExperienceLevel,
  type WorkplaceType,
} from "@/services/api/employerAiApi";
import styles from "./EmployerAiPage.module.css";

type TabId = "draft" | "improve" | "screening" | "interview" | "planning" | "insights";

export const EmployerAiPage: React.FC = () => {
  const { active } = useCompanyWorkspace();
  const navigate = useNavigate();
  const idPrefix = useId();

  const [currentTab, setCurrentTab] = useState<TabId>("draft");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Backend Diagnostic Probe State
  const [probingBackend, setProbingBackend] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    checked: boolean;
    status: number;
    endpoint: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Authorized Company Data (Real pipeline stats, no fake metrics)
  const [companyJobs, setCompanyJobs] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Permissions check
  const hasAiAccess = canUseBusinessAi(active?.memberRoleNames);

  // Initial form templates for clean company scoping and isolation
  const INITIAL_DRAFT_FORM: DraftJobRequest = {
    title: "",
    department: "",
    employmentType: "FULL_TIME",
    workplaceType: "HYBRID",
    experienceLevel: "MIDDLE",
    location: "",
    salaryRange: "",
    primarySkills: [],
    responsibilitiesBrief: "",
    requirementsBrief: "",
    tone: "PROFESSIONAL",
  };

  const INITIAL_IMPROVE_FORM: ImproveJobRequest = {
    jobId: undefined,
    title: "",
    description: "",
    requirements: "",
    focusArea: "ALL",
  };

  const INITIAL_SCREENING_FORM: ScreeningQuestionsRequest = {
    jobTitle: "",
    keySkills: [],
    experienceYears: 2,
    questionCount: 4,
  };

  const INITIAL_INTERVIEW_FORM: InterviewQuestionsRequest = {
    jobTitle: "",
    level: "MIDDLE",
    stage: "TECHNICAL",
    focusSkills: [],
    customContext: "",
  };

  const INITIAL_PLAN_FORM: RecruitmentPlanRequest = {
    jobTitle: "",
    targetHires: 1,
    targetTimelineDays: 30,
    urgencyLevel: "NORMAL",
  };

  // --- TAB 1: DRAFT JOB STATE ---
  const [draftForm, setDraftForm] = useState<DraftJobRequest>(INITIAL_DRAFT_FORM);
  const [skillsInput, setSkillsInput] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftJobResponse | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  // --- TAB 2: IMPROVE JOB STATE ---
  const [improveForm, setImproveForm] = useState<ImproveJobRequest>(INITIAL_IMPROVE_FORM);
  const [improveLoading, setImproveLoading] = useState(false);
  const [improveResult, setImproveResult] = useState<ImproveJobResponse | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);

  // --- TAB 3: SCREENING QUESTIONS STATE ---
  const [screeningForm, setScreeningForm] = useState<ScreeningQuestionsRequest>(INITIAL_SCREENING_FORM);
  const [screeningSkillsInput, setScreeningSkillsInput] = useState("");
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningQuestionsResponse | null>(null);
  const [screeningError, setScreeningError] = useState<string | null>(null);

  // --- TAB 4: INTERVIEW QUESTIONS STATE ---
  const [interviewForm, setInterviewForm] = useState<InterviewQuestionsRequest>(INITIAL_INTERVIEW_FORM);
  const [interviewSkillsInput, setInterviewSkillsInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewResult, setInterviewResult] = useState<InterviewQuestionsResponse | null>(null);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  // --- TAB 5: RECRUITMENT PLAN STATE ---
  const [planForm, setPlanForm] = useState<RecruitmentPlanRequest>(INITIAL_PLAN_FORM);
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<RecruitmentPlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Reference tracking active company and dedicated per-action request controllers
  // to prevent shared-controller cancellation from leaving unrelated actions stuck loading.
  type ActionKey = "probe" | "draft" | "improve" | "screening" | "interview" | "plan";

  const activeCompanyIdRef = React.useRef<string | undefined>(active?.id);
  const actionControllersRef = React.useRef<Record<ActionKey, AbortController | null>>({
    probe: null,
    draft: null,
    improve: null,
    screening: null,
    interview: null,
    plan: null,
  });

  // Clear/scope Business AI state, reset form inputs, and cancel all requests on company switch
  useEffect(() => {
    activeCompanyIdRef.current = active?.id;

    // Abort all in-flight requests across all actions
    Object.values(actionControllersRef.current).forEach((ctrl) => ctrl?.abort());
    actionControllersRef.current = {
      probe: null,
      draft: null,
      improve: null,
      screening: null,
      interview: null,
      plan: null,
    };

    // Reset company-specific forms and selected job to guarantee isolation
    setDraftForm(INITIAL_DRAFT_FORM);
    setSkillsInput("");

    setImproveForm(INITIAL_IMPROVE_FORM);

    setScreeningForm(INITIAL_SCREENING_FORM);
    setScreeningSkillsInput("");

    setInterviewForm(INITIAL_INTERVIEW_FORM);
    setInterviewSkillsInput("");

    setPlanForm(INITIAL_PLAN_FORM);

    // Reset results, errors and loading indicators
    setDraftResult(null);
    setDraftError(null);
    setDraftLoading(false);

    setImproveResult(null);
    setImproveError(null);
    setImproveLoading(false);

    setScreeningResult(null);
    setScreeningError(null);
    setScreeningLoading(false);

    setInterviewResult(null);
    setInterviewError(null);
    setInterviewLoading(false);

    setPlanResult(null);
    setPlanError(null);
    setPlanLoading(false);

    setProbeResult(null);
    setProbingBackend(false);
    setCompanyJobs([]);

    let unmounted = false;
    if (active?.id) {
      setLoadingJobs(true);
      companyWorkspaceApi
        .listJobs(active.id, { pageSize: 30 })
        .then((res) => {
          if (!unmounted && res.data && activeCompanyIdRef.current === active.id) {
            setCompanyJobs(res.data.map((j) => ({ id: j.id, title: j.title, status: j.status })));
          }
        })
        .catch(() => {
          // ignore or fallback to empty
        })
        .finally(() => {
          if (!unmounted && activeCompanyIdRef.current === active.id) setLoadingJobs(false);
        });
    }
    return () => {
      unmounted = true;
      Object.values(actionControllersRef.current).forEach((ctrl) => ctrl?.abort());
      actionControllersRef.current = {
        probe: null,
        draft: null,
        improve: null,
        screening: null,
        interview: null,
        plan: null,
      };
    };
  }, [active?.id]);

  // Handle probe backend connection
  const handleProbeBackend = async () => {
    if (!active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.probe?.abort();
    const controller = new AbortController();
    actionControllersRef.current.probe = controller;

    setProbingBackend(true);
    const endpoint = `/companies/${requestCompanyId}/ai/status`;
    try {
      const service = await employerAiApi.checkStatus(requestCompanyId, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      if (service.status !== "available") {
        setProbeResult({
          checked: true,
          status: 503,
          endpoint,
          message:
            service.status === "unconfigured"
              ? "Business AI provider is not configured on this server."
              : "Business AI is unavailable for this company.",
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        });
        return;
      }
      setProbeResult({
        checked: true,
        status: 200,
        endpoint,
        message:
          "Backend AI doanh nghiệp đã được cấu hình. Trạng thái nhà cung cấp được kiểm tra khi tạo nội dung.",
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      });
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      const isNotImplemented = err instanceof CompanyAiNotImplementedError;
      setProbeResult({
        checked: true,
        status: isNotImplemented ? 404 : 503,
        endpoint,
        message: isNotImplemented
          ? "Tính năng AI doanh nghiệp chưa được kích hoạt trên hệ thống máy chủ (HTTP 404). Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ."
          : (err as Error).message,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      });
    } finally {
      if (actionControllersRef.current.probe === controller) {
        actionControllersRef.current.probe = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setProbingBackend(false);
        }
      }
    }
  };

  // Helper: Copy with feedback
  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // --- ACTION HANDLERS ---

  // 1. Submit Draft Job
  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm.title.trim() || !active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.draft?.abort();
    const controller = new AbortController();
    actionControllersRef.current.draft = controller;

    setDraftLoading(true);
    setDraftError(null);

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: DraftJobRequest = {
      ...draftForm,
      primarySkills: skills.length ? skills : draftForm.primarySkills,
    };

    try {
      const res = await employerAiApi.draftJob(requestCompanyId, payload, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setDraftResult(res);
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setDraftResult(null);
      setDraftError((err as Error).message);
    } finally {
      if (actionControllersRef.current.draft === controller) {
        actionControllersRef.current.draft = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setDraftLoading(false);
        }
      }
    }
  };

  // 2. Submit Improve Job
  const handleSubmitImprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!improveForm.title.trim() || !active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.improve?.abort();
    const controller = new AbortController();
    actionControllersRef.current.improve = controller;

    setImproveLoading(true);
    setImproveError(null);

    try {
      const res = await employerAiApi.improveJob(requestCompanyId, improveForm, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setImproveResult(res);
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setImproveResult(null);
      setImproveError((err as Error).message);
    } finally {
      if (actionControllersRef.current.improve === controller) {
        actionControllersRef.current.improve = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setImproveLoading(false);
        }
      }
    }
  };

  // 3. Submit Screening Questions
  const handleSubmitScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningForm.jobTitle.trim() || !active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.screening?.abort();
    const controller = new AbortController();
    actionControllersRef.current.screening = controller;

    setScreeningLoading(true);
    setScreeningError(null);

    const skills = screeningSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: ScreeningQuestionsRequest = {
      ...screeningForm,
      keySkills: skills.length ? skills : screeningForm.keySkills,
    };

    try {
      const res = await employerAiApi.suggestScreeningQuestions(requestCompanyId, payload, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setScreeningResult(res);
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setScreeningResult(null);
      setScreeningError((err as Error).message);
    } finally {
      if (actionControllersRef.current.screening === controller) {
        actionControllersRef.current.screening = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setScreeningLoading(false);
        }
      }
    }
  };

  // 4. Submit Interview Questions
  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewForm.jobTitle.trim() || !active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.interview?.abort();
    const controller = new AbortController();
    actionControllersRef.current.interview = controller;

    setInterviewLoading(true);
    setInterviewError(null);

    const skills = interviewSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: InterviewQuestionsRequest = {
      ...interviewForm,
      focusSkills: skills.length ? skills : interviewForm.focusSkills,
    };

    try {
      const res = await employerAiApi.generateInterviewQuestions(requestCompanyId, payload, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setInterviewResult(res);
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setInterviewResult(null);
      setInterviewError((err as Error).message);
    } finally {
      if (actionControllersRef.current.interview === controller) {
        actionControllersRef.current.interview = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setInterviewLoading(false);
        }
      }
    }
  };

  // 5. Submit Recruitment Plan
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.jobTitle.trim() || !active?.id) return;
    const requestCompanyId = active.id;
    actionControllersRef.current.plan?.abort();
    const controller = new AbortController();
    actionControllersRef.current.plan = controller;

    setPlanLoading(true);
    setPlanError(null);

    try {
      const res = await employerAiApi.generateRecruitmentPlan(requestCompanyId, planForm, controller.signal);
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setPlanResult(res);
    } catch (err) {
      if (requestCompanyId !== activeCompanyIdRef.current || controller.signal.aborted) return;
      setPlanResult(null);
      setPlanError((err as Error).message);
    } finally {
      if (actionControllersRef.current.plan === controller) {
        actionControllersRef.current.plan = null;
        if (requestCompanyId === activeCompanyIdRef.current) {
          setPlanLoading(false);
        }
      }
    }
  };

  // Navigating to Create Job with Draft Data
  const handleApplyToCreateJob = (draft: DraftJobResponse) => {
    // Navigate to /employer/jobs/new with pre-filled state
    navigate("/employer/jobs/new", {
      state: {
        prefillTitle: draft.title,
        prefillDescription: draft.responsibilities.join("\n"),
        prefillRequirements: draft.requirements.join("\n"),
        prefillBenefits: draft.benefits.join("\n"),
      },
    });
  };

  return (
    <div className={styles.container}>
      {/* 1. HERO & COMPANY CONTEXT HEADER */}
      <section className={styles.heroCard} aria-labelledby="employer-ai-heading">
        <div className={styles.heroContent}>
          <div className={styles.heroTopRow}>
            <div className={styles.heroBrandGroup}>
              <div className={styles.heroIconBadge}>
                <Sparkles size={24} aria-hidden="true" />
              </div>
              <div>
                <h1 id="employer-ai-heading" className={styles.heroTitle}>
                  Trợ lý AI Doanh nghiệp — FINDWORK Business AI
                </h1>
                <p className={styles.heroSubtitle}>
                  Không gian công cụ trí tuệ nhân tạo chuyên biệt dành cho Nhà tuyển dụng đa ngành nghề. Hỗ trợ soạn thảo mô tả công việc,
                  tối ưu hóa tiêu chí ứng tuyển, chuẩn hóa câu hỏi phỏng vấn và lập kế hoạch tuyển dụng hiệu quả.
                </p>
              </div>
            </div>

            <div className={styles.heroActionGroup}>
              <div className={styles.heroCompanyBadge}>
                <Briefcase size={14} aria-hidden="true" />
                <span>{active.name}</span>
                {active.verificationStatus === "VERIFIED" && <span style={{ color: "#4ade80" }}>✓ Đã xác minh</span>}
              </div>

              <button
                type="button"
                className={styles.heroBtnPrimary}
                onClick={handleProbeBackend}
                disabled={probingBackend}
                title="Kiểm tra trạng thái kết nối tới máy chủ Backend"
              >
                <RefreshCw size={15} className={probingBackend ? "animate-spin" : ""} aria-hidden="true" />
                <span>{probingBackend ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESPONSIBLE RECRUITING AI PRINCIPLES (COMPLIANCE BANNER) */}
      <div className={styles.principlesBanner} role="note" aria-label="Nguyên tắc AI tuyển dụng có trách nhiệm">
        <ShieldCheck size={22} className={styles.principlesIcon} aria-hidden="true" />
        <div className={styles.principlesContent}>
          <div className={styles.principlesTitle}>
            Cam kết an toàn & Nguyên tắc AI Tuyển dụng có trách nhiệm (Responsible AI)
          </div>
          <ul className={styles.principlesList}>
            <li className={styles.principlesItem}>
              <strong>100% Con người quyết định:</strong> AI chỉ đóng vai trò trợ lý gợi ý nội dung, không bao giờ tự động ra quyết định tuyển dụng hoặc từ chối hồ sơ ứng viên.
            </li>
            <li className={styles.principlesItem}>
              <strong>Bảo mật hồ sơ cá nhân:</strong> Tuyệt đối không gửi dữ liệu CV riêng tư của ứng viên đến nhà cung cấp mô hình AI bên ngoài.
            </li>
            <li className={styles.principlesItem}>
              <strong>An toàn tin tuyển dụng:</strong> Không tự động xuất bản (publish) hoặc sửa đổi trạng thái tin tuyển dụng nếu chưa có sự xác nhận của nhà tuyển dụng.
            </li>
            <li className={styles.principlesItem}>
              <strong>Độc lập môi trường:</strong> Không gian làm việc AI được phân lập hoàn toàn với Trợ lý AI của Ứng viên (Candidate AI).
            </li>
          </ul>
        </div>
      </div>

      {/* 3. BACKEND INTEGRATION STATUS / PROBE RESULT */}
      {probeResult && (
        <div className={styles.diagnosticsCard} role="status">
          <div className={styles.diagnosticsHeader}>
            <div className={styles.diagnosticsStatus}>
              <span
                className={styles.diagnosticsStatusDot}
                style={{ background: probeResult.status === 200 ? "#10b981" : "#f59e0b" }}
                aria-hidden="true"
              />
              <span>
                {probeResult.status === 200
                  ? "Máy chủ Backend AI Doanh nghiệp sẵn sàng (HTTP 200 OK)"
                  : `Hạ tầng Backend đang chờ triển khai (HTTP ${probeResult.status})`}
              </span>
            </div>
            <div className={styles.diagnosticsMeta}>
              <span>Endpoint: {probeResult.endpoint}</span>
              <span>Thời gian: {probeResult.timestamp}</span>
            </div>
          </div>
          <p className={styles.diagnosticsDetails}>{probeResult.message}</p>
        </div>
      )}

      {/* Permission Gate Warning if User is Viewer */}
      {!hasAiAccess && (
        <div className={styles.honestNotice} role="alert" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            <strong>Giới hạn quyền hạn:</strong> Bạn đang có vai trò Người xem (VIEWER) trong {active.name}. Tính năng tạo nội dung AI chỉ khả dụng cho Chủ sở hữu, Quản trị viên, HR Manager hoặc Chuyên viên tuyển dụng.
          </span>
        </div>
      )}

      {/* 4. WORKSPACE TABS */}
      <nav className={styles.tabsContainer} aria-label="Các công cụ AI Doanh nghiệp">
        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "draft" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("draft")}
          aria-selected={currentTab === "draft"}
          role="tab"
          id={`${idPrefix}-tab-draft`}
        >
          <FileText size={16} aria-hidden="true" />
          <span>1. Soạn thảo JD</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "improve" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("improve")}
          aria-selected={currentTab === "improve"}
          role="tab"
          id={`${idPrefix}-tab-improve`}
        >
          <Sparkles size={16} aria-hidden="true" />
          <span>2. Tối ưu & Rà soát JD</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "screening" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("screening")}
          aria-selected={currentTab === "screening"}
          role="tab"
          id={`${idPrefix}-tab-screening`}
        >
          <HelpCircle size={16} aria-hidden="true" />
          <span>3. Câu hỏi sàng lọc</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "interview" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("interview")}
          aria-selected={currentTab === "interview"}
          role="tab"
          id={`${idPrefix}-tab-interview`}
        >
          <Users size={16} aria-hidden="true" />
          <span>4. Ngân hàng câu hỏi PV</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "planning" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("planning")}
          aria-selected={currentTab === "planning"}
          role="tab"
          id={`${idPrefix}-tab-planning`}
        >
          <Calendar size={16} aria-hidden="true" />
          <span>5. Kế hoạch tuyển dụng</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${currentTab === "insights" ? styles.tabBtnActive : ""}`}
          onClick={() => setCurrentTab("insights")}
          aria-selected={currentTab === "insights"}
          role="tab"
          id={`${idPrefix}-tab-insights`}
        >
          <Layers size={16} aria-hidden="true" />
          <span>6. Dữ liệu tổng quan</span>
        </button>
      </nav>

      {/* 5. TAB PANELS */}

      {/* TAB 1: DRAFT JOB */}
      {currentTab === "draft" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-draft`}>
          {/* Form Side */}
          <div className={styles.panelCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <FileText size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Soạn thảo tin tuyển dụng (Job Description)</span>
                </h2>
                <p className={styles.cardDesc}>
                  Cung cấp các thông tin cơ bản để AI hỗ trợ xây dựng bản thảo mô tả công việc hoàn chỉnh và chuyên nghiệp.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitDraft} className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-draft-title`} className={styles.label}>
                  Chức danh / Vị trí tuyển dụng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id={`${idPrefix}-draft-title`}
                  type="text"
                  required
                  placeholder="Ví dụ: Giám đốc Kinh doanh B2B, Kế toán trưởng, Kỹ sư sản xuất, Điều dưỡng đa khoa..."
                  className={styles.input}
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-dept`} className={styles.label}>Phòng ban / Bộ phận</label>
                <input
                  id={`${idPrefix}-draft-dept`}
                  type="text"
                  placeholder="Ví dụ: Kinh doanh & Bán hàng, Tài chính - Kế toán, Vận hành & Logistics, Chăm sóc sức khỏe..."
                  className={styles.input}
                  value={draftForm.department || ""}
                  onChange={(e) => setDraftForm({ ...draftForm, department: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-level`} className={styles.label}>Cấp bậc kinh nghiệm</label>
                <select
                  id={`${idPrefix}-draft-level`}
                  className={styles.select}
                  value={draftForm.experienceLevel}
                  onChange={(e) => setDraftForm({ ...draftForm, experienceLevel: e.target.value as ExperienceLevel })}
                  disabled={!hasAiAccess || draftLoading}
                >
                  <option value="INTERN">Thực tập sinh (Intern)</option>
                  <option value="FRESHER">Mới tốt nghiệp (Fresher / Chưa có kinh nghiệm)</option>
                  <option value="JUNIOR">Nhân viên (1 - 2 năm kinh nghiệm)</option>
                  <option value="MIDDLE">Chuyên viên (2 - 4 năm kinh nghiệm)</option>
                  <option value="SENIOR">Chuyên viên cao cấp (5+ năm kinh nghiệm)</option>
                  <option value="LEAD">Trưởng nhóm (Team Lead / Giám sát chuyên môn)</option>
                  <option value="MANAGER">Quản lý / Trưởng bộ phận (Manager / Department Head)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-emptype`} className={styles.label}>Loại hình việc làm</label>
                <select
                  id={`${idPrefix}-draft-emptype`}
                  className={styles.select}
                  value={draftForm.employmentType}
                  onChange={(e) => setDraftForm({ ...draftForm, employmentType: e.target.value as EmploymentType })}
                  disabled={!hasAiAccess || draftLoading}
                >
                  <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
                  <option value="PART_TIME">Bán thời gian (Part-time)</option>
                  <option value="CONTRACT">Hợp đồng (Contract)</option>
                  <option value="INTERNSHIP">Thực tập (Internship)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-workplace`} className={styles.label}>Hình thức làm việc</label>
                <select
                  id={`${idPrefix}-draft-workplace`}
                  className={styles.select}
                  value={draftForm.workplaceType}
                  onChange={(e) => setDraftForm({ ...draftForm, workplaceType: e.target.value as WorkplaceType })}
                  disabled={!hasAiAccess || draftLoading}
                >
                  <option value="ON_SITE">Tại văn phòng / Cơ sở làm việc (On-site)</option>
                  <option value="HYBRID">Linh hoạt (Hybrid - Kết hợp văn phòng & từ xa)</option>
                  <option value="REMOTE">Làm việc từ xa (Remote / Không cố định)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-location`} className={styles.label}>Địa điểm làm việc</label>
                <input
                  id={`${idPrefix}-draft-location`}
                  type="text"
                  placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội, Bình Dương, Đà Nẵng..."
                  className={styles.input}
                  value={draftForm.location || ""}
                  onChange={(e) => setDraftForm({ ...draftForm, location: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-salary`} className={styles.label}>Mức lương dự kiến</label>
                <input
                  id={`${idPrefix}-draft-salary`}
                  type="text"
                  placeholder="Ví dụ: 15 - 25 triệu VND, 1,000 - 1,500 USD hoặc Thỏa thuận"
                  className={styles.input}
                  value={draftForm.salaryRange || ""}
                  onChange={(e) => setDraftForm({ ...draftForm, salaryRange: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-draft-skills`} className={styles.label}>Kỹ năng & Chuyên môn trọng tâm (cách nhau bằng dấu phẩy)</label>
                <input
                  id={`${idPrefix}-draft-skills`}
                  type="text"
                  placeholder="Ví dụ: Đàm phán B2B, Kế toán MISA, Quản lý kho WMS, Chuẩn đoán điều dưỡng, Tiêu chuẩn GMP, Phân tích dữ liệu..."
                  className={styles.input}
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-draft-resp`} className={styles.label}>Tóm tắt trách nhiệm chính</label>
                <textarea
                  id={`${idPrefix}-draft-resp`}
                  rows={3}
                  placeholder="Ví dụ: Phát triển thị trường khách hàng doanh nghiệp; Lập báo cáo tài chính định kỳ; Điều phối chuỗi cung ứng; Chăm sóc bệnh nhân nội trú..."
                  className={styles.textarea}
                  value={draftForm.responsibilitiesBrief || ""}
                  onChange={(e) => setDraftForm({ ...draftForm, responsibilitiesBrief: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-draft-req`} className={styles.label}>Tóm tắt yêu cầu ứng viên</label>
                <textarea
                  id={`${idPrefix}-draft-req`}
                  rows={3}
                  placeholder="Ví dụ: Tốt nghiệp Đại học/Cao đẳng chuyên ngành phù hợp; Kỹ năng giao tiếp và xử lý tình huống; Chứng chỉ nghiệp vụ liên quan..."
                  className={styles.textarea}
                  value={draftForm.requirementsBrief || ""}
                  onChange={(e) => setDraftForm({ ...draftForm, requirementsBrief: e.target.value })}
                  disabled={!hasAiAccess || draftLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-draft-tone`} className={styles.label}>Giọng văn</label>
                <select
                  id={`${idPrefix}-draft-tone`}
                  className={styles.select}
                  value={draftForm.tone}
                  onChange={(e) => setDraftForm({ ...draftForm, tone: e.target.value as AiTone })}
                  disabled={!hasAiAccess || draftLoading}
                >
                  <option value="PROFESSIONAL">Chuyên nghiệp & Chuẩn mực</option>
                  <option value="STARTUP">Trẻ trung & Năng động (Startup)</option>
                  <option value="EXECUTIVE">Trang trọng & Cấp cao</option>
                  <option value="CASUAL">Thân thiện & Cởi mở</option>
                </select>
              </div>

              <div className={`${styles.actionRow} ${styles.formFull}`}>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={() => {
                    setDraftForm({
                      title: "",
                      department: "",
                      employmentType: "FULL_TIME",
                      workplaceType: "HYBRID",
                      experienceLevel: "MIDDLE",
                      location: "",
                      salaryRange: "",
                      primarySkills: [],
                      responsibilitiesBrief: "",
                      requirementsBrief: "",
                      tone: "PROFESSIONAL",
                    });
                    setSkillsInput("");
                    setDraftResult(null);
                    setDraftError(null);
                  }}
                  disabled={draftLoading}
                >
                  Đặt lại form
                </button>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!hasAiAccess || draftLoading || !draftForm.title.trim()}
                >
                  <Sparkles size={16} className={draftLoading ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{draftLoading ? "Đang tạo bản thảo..." : "Tạo bản thảo với AI"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Result Side */}
          <div className={styles.resultCard}>
            <div className={styles.resultTopBar}>
              <div className={styles.resultMeta}>
                <strong>Kết quả bản thảo JD</strong>
                {draftResult && <span>• {draftResult.title}</span>}
              </div>

              {draftResult && (
                <div className={styles.resultActions}>
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${copiedKey === "draft-md" ? styles.copyBtnSuccess : ""}`}
                    onClick={() => handleCopy(draftResult.fullMarkdown, "draft-md")}
                    title="Sao chép toàn bộ nội dung dưới định dạng Markdown"
                  >
                    {copiedKey === "draft-md" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === "draft-md" ? "Đã chép" : "Chép Markdown"}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={() => handleApplyToCreateJob(draftResult)}
                    title="Chuyển dữ liệu này sang biểu mẫu Đăng tin tuyển dụng chính thức"
                  >
                    <PlusCircle size={14} />
                    <span>Đăng tin với JD này</span>
                  </button>
                </div>
              )}
            </div>

            {draftError && (
              <div className={styles.honestNotice} role="alert">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{draftError}</span>
              </div>
            )}

            {draftResult ? (
              <div className={styles.resultContent}>
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: "1.25rem", color: "#1e1b4b" }}>{draftResult.title}</h3>
                  <p style={{ margin: 0, color: "#475569" }}>{draftResult.summary}</p>
                </div>

                <div className={styles.resultSectionTitle}>1. Trách nhiệm công việc</div>
                <ul className={styles.resultList}>
                  {draftResult.responsibilities.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>

                <div className={styles.resultSectionTitle}>2. Yêu cầu ứng viên</div>
                <ul className={styles.resultList}>
                  {draftResult.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>

                <div className={styles.resultSectionTitle}>3. Quyền lợi đãi ngộ</div>
                <ul className={styles.resultList}>
                  {draftResult.benefits.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>

                {draftResult.suggestedSkills.length > 0 && (
                  <div>
                    <div className={styles.resultSectionTitle}>Kỹ năng trọng tâm đề xuất</div>
                    <div className={styles.tagGroup}>
                      {draftResult.suggestedSkills.map((s, idx) => (
                        <span key={idx} className={styles.tag}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FileText size={48} className={styles.emptyIcon} aria-hidden="true" />
                <h3 className={styles.emptyTitle}>Chưa có bản thảo nào</h3>
                <p className={styles.emptyDesc}>
                  Điền các thông tin vị trí ở biểu mẫu bên trái và bấm &quot;Tạo bản thảo với AI&quot; để xem cấu trúc gợi ý cho mọi ngành nghề.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMPROVE JOB */}
      {currentTab === "improve" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-improve`}>
          <div className={styles.panelCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <Sparkles size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Tối ưu hóa & Rà soát chất lượng JD</span>
                </h2>
                <p className={styles.cardDesc}>
                  Kiểm tra độ rõ ràng, tính bao hàm (không phân biệt định kiến giới tính/tuổi tác) và chuẩn mực tuyển dụng.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitImprove} className={styles.formGrid}>
              {/* Select Existing Job Option */}
              {companyJobs.length > 0 && (
                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label htmlFor={`${idPrefix}-improve-select-job`} className={styles.label}>Chọn tin tuyển dụng hiện có của doanh nghiệp (tùy chọn)</label>
                  <select
                    id={`${idPrefix}-improve-select-job`}
                    className={styles.select}
                    value={improveForm.jobId || ""}
                    onChange={(e) => {
                      const selected = companyJobs.find((j) => j.id === e.target.value);
                      if (selected) {
                        setImproveForm((prev) => ({
                          ...prev,
                          jobId: selected.id,
                          title: selected.title,
                        }));
                      } else {
                        setImproveForm((prev) => ({
                          ...prev,
                          jobId: undefined,
                        }));
                      }
                    }}
                    disabled={!hasAiAccess || improveLoading || loadingJobs}
                  >
                    <option value="">-- Tự nhập tiêu đề và nội dung JD --</option>
                    {companyJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-improve-title`} className={styles.label}>
                  Chức danh tuyển dụng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id={`${idPrefix}-improve-title`}
                  type="text"
                  required
                  placeholder="Ví dụ: Trưởng phòng Marketing, Chuyên viên Xuất nhập khẩu, Quản lý Nhà hàng, Kỹ sư Cơ khí..."
                  className={styles.input}
                  value={improveForm.title}
                  onChange={(e) => setImproveForm({ ...improveForm, title: e.target.value })}
                  disabled={!hasAiAccess || improveLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-improve-desc`} className={styles.label}>Mô tả công việc hiện tại</label>
                <textarea
                  id={`${idPrefix}-improve-desc`}
                  rows={4}
                  placeholder="Dán nội dung mô tả công việc (Job Description) thuộc bất kỳ ngành nghề nào cần rà soát..."
                  className={styles.textarea}
                  value={improveForm.description}
                  onChange={(e) => setImproveForm({ ...improveForm, description: e.target.value })}
                  disabled={!hasAiAccess || improveLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-improve-req`} className={styles.label}>Yêu cầu ứng viên hiện tại</label>
                <textarea
                  id={`${idPrefix}-improve-req`}
                  rows={4}
                  placeholder="Dán các tiêu chí yêu cầu về kinh nghiệm, kỹ năng, bằng cấp để phân tích tính bao hàm..."
                  className={styles.textarea}
                  value={improveForm.requirements || ""}
                  onChange={(e) => setImproveForm({ ...improveForm, requirements: e.target.value })}
                  disabled={!hasAiAccess || improveLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-improve-focus`} className={styles.label}>Trọng tâm phân tích</label>
                <select
                  id={`${idPrefix}-improve-focus`}
                  className={styles.select}
                  value={improveForm.focusArea}
                  onChange={(e) => setImproveForm({ ...improveForm, focusArea: e.target.value as any })}
                  disabled={!hasAiAccess || improveLoading}
                >
                  <option value="ALL">Toàn diện (Tất cả tiêu chí)</option>
                  <option value="INCLUSIVITY">Tính bao hàm & Tránh định kiến (Giới tính, tuổi tác, vùng miền)</option>
                  <option value="CLARITY">Độ rõ ràng & Dễ hiểu</option>
                  <option value="ENGAGEMENT">Độ hấp dẫn ứng viên & Thương hiệu tuyển dụng</option>
                  <option value="COMPLIANCE">Tuân thủ quy định pháp luật lao động</option>
                </select>
              </div>

              <div className={`${styles.actionRow} ${styles.formFull}`}>
                <span className={styles.helperText}>
                  * Không gửi thông tin nhạy cảm (mật khẩu, tài khoản bí mật) vào trường kiểm tra.
                </span>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!hasAiAccess || improveLoading || !improveForm.title.trim()}
                >
                  <Sparkles size={16} className={improveLoading ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{improveLoading ? "Đang phân tích..." : "Rà soát & Đánh giá"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTopBar}>
              <div className={styles.resultMeta}>
                <strong>Đánh giá chất lượng JD</strong>
                {improveResult?.readabilityScore && (
                  <span>• Điểm dễ đọc: {improveResult.readabilityScore}/100</span>
                )}
                {improveResult?.inclusivityScore && (
                  <span>• Điểm bao hàm: {improveResult.inclusivityScore}/100</span>
                )}
              </div>

              {improveResult && (
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copiedKey === "improve" ? styles.copyBtnSuccess : ""}`}
                  onClick={() =>
                    handleCopy(
                      `Mô tả cải tiến:\n${improveResult.improvedDescription}\n\nYêu cầu cải tiến:\n${improveResult.improvedRequirements}`,
                      "improve"
                    )
                  }
                >
                  {copiedKey === "improve" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "improve" ? "Đã chép" : "Sao chép đề xuất"}</span>
                </button>
              )}
            </div>

            {improveError && (
              <div className={styles.honestNotice} role="alert">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{improveError}</span>
              </div>
            )}

            {improveResult ? (
              <div className={styles.resultContent}>
                <div className={styles.resultSectionTitle}>Nhận xét & Khuyến nghị cải tiến:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {improveResult.critique.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background:
                          c.severity === "CRITICAL"
                            ? "#fef2f2"
                            : c.severity === "RECOMMENDED"
                            ? "#fffbeb"
                            : "#f8fafc",
                        border: `1px solid ${
                          c.severity === "CRITICAL"
                            ? "#fecaca"
                            : c.severity === "RECOMMENDED"
                            ? "#fde68a"
                            : "#e2e8f0"
                        }`,
                        fontSize: "0.8125rem",
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4, textTransform: "capitalize" }}>
                        [{c.category}] — Mức độ: {c.severity}
                      </div>
                      <div style={{ color: "#334155" }}>{c.feedback}</div>
                    </div>
                  ))}
                </div>

                <div className={styles.resultSectionTitle}>Đề xuất mô tả công việc tối ưu:</div>
                <p style={{ whiteSpace: "pre-line", background: "#ffffff", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  {improveResult.improvedDescription}
                </p>

                <div className={styles.resultSectionTitle}>Đề xuất yêu cầu ứng viên tối ưu:</div>
                <p style={{ whiteSpace: "pre-line", background: "#ffffff", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  {improveResult.improvedRequirements}
                </p>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Sparkles size={48} className={styles.emptyIcon} aria-hidden="true" />
                <h3 className={styles.emptyTitle}>Chưa có kết quả phân tích</h3>
                <p className={styles.emptyDesc}>
                  Chọn tin tuyển dụng hiện có hoặc dán nội dung JD ở bên trái và bấm &quot;Rà soát &amp; Đánh giá&quot; để phát hiện điểm cần tối ưu.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SCREENING QUESTIONS */}
      {currentTab === "screening" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-screening`}>
          <div className={styles.panelCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <HelpCircle size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Gợi ý câu hỏi sàng lọc hồ sơ ứng viên</span>
                </h2>
                <p className={styles.cardDesc}>
                  Tạo các câu hỏi sàng lọc tương thích với hệ thống câu hỏi tuyển dụng của FINDWORK (Trắc nghiệm, Có/Không, Số năm kinh nghiệm).
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitScreening} className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-screen-title`} className={styles.label}>
                  Vị trí tuyển dụng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id={`${idPrefix}-screen-title`}
                  type="text"
                  required
                  placeholder="Ví dụ: Quản lý Khách sạn, Kế toán tổng hợp, Giám sát chất lượng (QA/QC), Kỹ sư Tự động hóa..."
                  className={styles.input}
                  value={screeningForm.jobTitle}
                  onChange={(e) => setScreeningForm({ ...screeningForm, jobTitle: e.target.value })}
                  disabled={!hasAiAccess || screeningLoading}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-screen-skills`} className={styles.label}>Kỹ năng & Chuyên môn cần kiểm tra (cách nhau bởi dấu phẩy)</label>
                <input
                  id={`${idPrefix}-screen-skills`}
                  type="text"
                  placeholder="Ví dụ: Kế toán thuế, Bán hàng kỹ thuật, Dịch vụ F&B, Vận hành dây chuyền, Chăm sóc khách hàng, Kỹ năng phần mềm..."
                  className={styles.input}
                  value={screeningSkillsInput}
                  onChange={(e) => setScreeningSkillsInput(e.target.value)}
                  disabled={!hasAiAccess || screeningLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-screen-exp`} className={styles.label}>Số năm kinh nghiệm tối thiểu</label>
                <input
                  id={`${idPrefix}-screen-exp`}
                  type="number"
                  min={0}
                  max={20}
                  className={styles.input}
                  value={screeningForm.experienceYears}
                  onChange={(e) => setScreeningForm({ ...screeningForm, experienceYears: Number(e.target.value) })}
                  disabled={!hasAiAccess || screeningLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-screen-count`} className={styles.label}>Số lượng câu hỏi gợi ý</label>
                <select
                  id={`${idPrefix}-screen-count`}
                  className={styles.select}
                  value={screeningForm.questionCount}
                  onChange={(e) => setScreeningForm({ ...screeningForm, questionCount: Number(e.target.value) })}
                  disabled={!hasAiAccess || screeningLoading}
                >
                  <option value={3}>3 câu hỏi trọng tâm</option>
                  <option value={4}>4 câu hỏi tiêu chuẩn</option>
                  <option value={6}>6 câu hỏi chi tiết</option>
                </select>
              </div>

              <div className={`${styles.actionRow} ${styles.formFull}`}>
                <span className={styles.helperText}>
                  Câu hỏi được định dạng để có thể áp dụng trực tiếp vào cấu hình tin tuyển dụng (Trắc nghiệm, Có/Không, Số năm kinh nghiệm, Tự luận ngắn).
                </span>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!hasAiAccess || screeningLoading || !screeningForm.jobTitle.trim()}
                >
                  <Sparkles size={16} className={screeningLoading ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{screeningLoading ? "Đang tạo..." : "Gợi ý câu hỏi sàng lọc"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTopBar}>
              <div className={styles.resultMeta}>
                <strong>Danh sách câu hỏi sàng lọc</strong>
                {screeningResult && <span>({screeningResult.questions.length} câu hỏi)</span>}
              </div>

              {screeningResult && (
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copiedKey === "screening" ? styles.copyBtnSuccess : ""}`}
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(
                        screeningResult.questions.map((q) => ({
                          question: q.question,
                          type: q.type,
                          isRequired: q.isRequired,
                        })),
                        null,
                        2
                      ),
                      "screening"
                    )
                  }
                  title="Sao chép dưới dạng JSON"
                >
                  {copiedKey === "screening" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "screening" ? "Đã chép JSON" : "Sao chép JSON"}</span>
                </button>
              )}
            </div>

            {screeningError && (
              <div className={styles.honestNotice} role="alert">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{screeningError}</span>
              </div>
            )}

            {screeningResult ? (
              <div className={styles.resultContent}>
                {screeningResult.questions.map((q, idx) => (
                  <div key={idx} className={styles.questionCard}>
                    <div className={styles.questionTop}>
                      <span className={styles.questionText}>
                        {idx + 1}. {q.question}
                      </span>
                      <span
                        className={`${styles.questionBadge} ${
                          q.type === "YES_NO"
                            ? styles.badgeYesNo
                            : q.type === "NUMBER"
                            ? styles.badgeNumber
                            : q.type === "SINGLE_CHOICE"
                            ? styles.badgeChoice
                            : styles.badgeText
                        }`}
                      >
                        {q.type}
                      </span>
                    </div>

                    <div className={styles.questionDetail}>
                      {q.competencyTarget && <div>Mục tiêu kiểm tra: {q.competencyTarget}</div>}
                      {q.idealAnswer && <div>Đáp án mong đợi: <strong>{q.idealAnswer}</strong></div>}
                      {q.options && (
                        <div style={{ marginTop: 4 }}>
                          Lựa chọn: {q.options.join(" | ")}
                        </div>
                      )}
                      <div>Bắt buộc: {q.isRequired ? "Có (Required)" : "Tùy chọn (Optional)"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <HelpCircle size={48} className={styles.emptyIcon} aria-hidden="true" />
                <h3 className={styles.emptyTitle}>Chưa có câu hỏi sàng lọc</h3>
                <p className={styles.emptyDesc}>
                  Nhập vị trí và năng lực cần đánh giá ở biểu mẫu bên trái để nhận bộ câu hỏi sàng lọc ứng viên phù hợp với từng lĩnh vực.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INTERVIEW QUESTIONS */}
      {currentTab === "interview" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-interview`}>
          <div className={styles.panelCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <Users size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Bộ câu hỏi phỏng vấn theo phương pháp STAR</span>
                </h2>
                <p className={styles.cardDesc}>
                  Xây dựng câu hỏi phỏng vấn theo khung năng lực, mục đích kiểm tra và tiêu chí đánh giá chuẩn cho người phỏng vấn.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitInterview} className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-interview-title`} className={styles.label}>
                  Vị trí tuyển dụng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id={`${idPrefix}-interview-title`}
                  type="text"
                  required
                  placeholder="Ví dụ: Trưởng ca Sản xuất, Chuyên viên Marketing, Kế toán viên, Quản lý Vận tải, Dược sĩ tư vấn..."
                  className={styles.input}
                  value={interviewForm.jobTitle}
                  onChange={(e) => setInterviewForm({ ...interviewForm, jobTitle: e.target.value })}
                  disabled={!hasAiAccess || interviewLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-interview-stage`} className={styles.label}>Vòng phỏng vấn</label>
                <select
                  id={`${idPrefix}-interview-stage`}
                  className={styles.select}
                  value={interviewForm.stage}
                  onChange={(e) => setInterviewForm({ ...interviewForm, stage: e.target.value as any })}
                  disabled={!hasAiAccess || interviewLoading}
                >
                  <option value="HR_SCREENING">Vòng 1: Sàng lọc nhân sự & Động lực ứng tuyển</option>
                  <option value="TECHNICAL">Vòng 2: Đánh giá nghiệp vụ & Năng lực chuyên môn sâu</option>
                  <option value="CULTURE_FIT">Vòng 3: Phù hợp văn hóa & Kỹ năng làm việc nhóm</option>
                  <option value="HIRING_MANAGER">Vòng 4: Phỏng vấn cấp quản lý & Định hướng phát triển</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-interview-level`} className={styles.label}>Cấp bậc ứng viên</label>
                <select
                  id={`${idPrefix}-interview-level`}
                  className={styles.select}
                  value={interviewForm.level}
                  onChange={(e) => setInterviewForm({ ...interviewForm, level: e.target.value as any })}
                  disabled={!hasAiAccess || interviewLoading}
                >
                  <option value="JUNIOR">Nhân viên (1 - 2 năm)</option>
                  <option value="MIDDLE">Chuyên viên (2 - 4 năm)</option>
                  <option value="SENIOR">Chuyên viên cao cấp (5+ năm)</option>
                  <option value="LEAD">Trưởng nhóm / Giám sát chuyên môn (Team Lead / Supervisor)</option>
                  <option value="MANAGER">Quản lý / Trưởng bộ phận (Manager / Department Head)</option>
                </select>
              </div>

              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-interview-skills`} className={styles.label}>Kỹ năng & Chủ đề trọng tâm (cách nhau bằng dấu phẩy)</label>
                <input
                  id={`${idPrefix}-interview-skills`}
                  type="text"
                  placeholder="Ví dụ: Đàm phán giá, Xử lý khiếu nại khách hàng, Quy trình an toàn lao động, Quản lý dòng tiền, Giải quyết sự cố..."
                  className={styles.input}
                  value={interviewSkillsInput}
                  onChange={(e) => setInterviewSkillsInput(e.target.value)}
                  disabled={!hasAiAccess || interviewLoading}
                />
              </div>

              <div className={`${styles.actionRow} ${styles.formFull}`}>
                <span className={styles.helperText}>
                  Phương pháp STAR: Tình huống (Situation) — Nhiệm vụ (Task) — Hành động (Action) — Kết quả (Result). Áp dụng cho mọi vị trí chuyên môn.
                </span>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!hasAiAccess || interviewLoading || !interviewForm.jobTitle.trim()}
                >
                  <Sparkles size={16} className={interviewLoading ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{interviewLoading ? "Đang tạo câu hỏi..." : "Tạo bộ câu hỏi"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTopBar}>
              <div className={styles.resultMeta}>
                <strong>Ngân hàng câu hỏi phỏng vấn</strong>
                {interviewResult && <span>• {interviewResult.stage}</span>}
              </div>

              {interviewResult && (
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copiedKey === "interview" ? styles.copyBtnSuccess : ""}`}
                  onClick={() =>
                    handleCopy(
                      interviewResult.categories
                        .map(
                          (cat) =>
                            `### ${cat.categoryName}\n` +
                            cat.questions
                              .map(
                                (q, i) =>
                                  `${i + 1}. ${q.question}\n   - Mục đích: ${q.purpose}\n   - Tiêu chí: ${q.sampleEvaluationCriteria}${
                                    q.redFlags ? `\n   - Cảnh báo: ${q.redFlags}` : ""
                                  }`
                              )
                              .join("\n\n")
                        )
                        .join("\n\n"),
                      "interview"
                    )
                  }
                >
                  {copiedKey === "interview" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "interview" ? "Đã chép" : "Sao chép câu hỏi"}</span>
                </button>
              )}
            </div>

            {interviewError && (
              <div className={styles.honestNotice} role="alert">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{interviewError}</span>
              </div>
            )}

            {interviewResult ? (
              <div className={styles.resultContent}>
                {interviewResult.categories.map((cat, catIdx) => (
                  <div key={catIdx} style={{ marginBottom: 18 }}>
                    <div className={styles.resultSectionTitle}>{cat.categoryName}</div>
                    {cat.questions.map((q, qIdx) => (
                      <div key={qIdx} className={styles.questionCard}>
                        <p className={styles.questionText}>
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className={styles.questionDetail}>
                          <div><strong>Mục đích:</strong> {q.purpose}</div>
                          <div><strong>Tiêu chí đánh giá:</strong> {q.sampleEvaluationCriteria}</div>
                          {q.redFlags && (
                            <div style={{ color: "#dc2626" }}>
                              <strong>Dấu hiệu cần lưu ý (Red Flag):</strong> {q.redFlags}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Users size={48} className={styles.emptyIcon} aria-hidden="true" />
                <h3 className={styles.emptyTitle}>Chưa có câu hỏi phỏng vấn</h3>
                <p className={styles.emptyDesc}>
                  Chọn vị trí và vòng phỏng vấn để nhận ngân hàng câu hỏi đánh giá theo khung năng lực chuyên ngành.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RECRUITMENT PLANNING */}
      {currentTab === "planning" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-planning`}>
          <div className={styles.panelCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <Calendar size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Kế hoạch & Lộ trình tuyển dụng (Recruitment Roadmap)</span>
                </h2>
                <p className={styles.cardDesc}>
                  Xây dựng mốc thời gian, kênh tìm kiếm ứng viên và chỉ số đo lường hiệu quả (KPIs) cho chiến dịch tuyển dụng.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPlan} className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formFull}`}>
                <label htmlFor={`${idPrefix}-plan-title`} className={styles.label}>
                  Vị trí tuyển dụng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id={`${idPrefix}-plan-title`}
                  type="text"
                  required
                  placeholder="Ví dụ: Trưởng phòng Kinh doanh, Kỹ sư Vận hành, Bác sĩ Đa khoa, Quản lý Kho bãi, Chuyên viên Truyền thông..."
                  className={styles.input}
                  value={planForm.jobTitle}
                  onChange={(e) => setPlanForm({ ...planForm, jobTitle: e.target.value })}
                  disabled={!hasAiAccess || planLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-plan-hires`} className={styles.label}>Số lượng nhân sự cần tuyển</label>
                <input
                  id={`${idPrefix}-plan-hires`}
                  type="number"
                  min={1}
                  max={50}
                  className={styles.input}
                  value={planForm.targetHires}
                  onChange={(e) => setPlanForm({ ...planForm, targetHires: Number(e.target.value) })}
                  disabled={!hasAiAccess || planLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-plan-days`} className={styles.label}>Thời gian mục tiêu hoàn thành (ngày)</label>
                <input
                  id={`${idPrefix}-plan-days`}
                  type="number"
                  min={7}
                  max={120}
                  className={styles.input}
                  value={planForm.targetTimelineDays}
                  onChange={(e) => setPlanForm({ ...planForm, targetTimelineDays: Number(e.target.value) })}
                  disabled={!hasAiAccess || planLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor={`${idPrefix}-plan-urgency`} className={styles.label}>Mức độ khẩn cấp</label>
                <select
                  id={`${idPrefix}-plan-urgency`}
                  className={styles.select}
                  value={planForm.urgencyLevel}
                  onChange={(e) => setPlanForm({ ...planForm, urgencyLevel: e.target.value as any })}
                  disabled={!hasAiAccess || planLoading}
                >
                  <option value="NORMAL">Tiêu chuẩn (Normal)</option>
                  <option value="HIGH">Ưu tiên cao (High)</option>
                  <option value="CRITICAL">Khẩn cấp (Critical)</option>
                </select>
              </div>

              <div className={`${styles.actionRow} ${styles.formFull}`}>
                <span className={styles.helperText}>
                  AI ước tính lộ trình tối ưu dựa trên tiêu chuẩn tuyển dụng và mức độ cạnh tranh của từng ngành nghề.
                </span>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={!hasAiAccess || planLoading || !planForm.jobTitle.trim()}
                >
                  <Sparkles size={16} className={planLoading ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{planLoading ? "Đang lập kế hoạch..." : "Lập kế hoạch tuyển dụng"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultTopBar}>
              <div className={styles.resultMeta}>
                <strong>Lộ trình tuyển dụng dự kiến</strong>
                {planResult && <span>• {planResult.estimatedTimeToHire}</span>}
              </div>

              {planResult && (
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copiedKey === "plan" ? styles.copyBtnSuccess : ""}`}
                  onClick={() =>
                    handleCopy(
                      `Kế hoạch tuyển dụng: ${planResult.jobTitle}\nThời gian: ${planResult.estimatedTimeToHire}\n\n` +
                        planResult.phases
                          .map(
                            (p) =>
                              `${p.phaseName} (${p.timelineWeeks})\n` +
                              p.keyActivities.map((a) => `- ${a}`).join("\n") +
                              `\nKênh: ${p.recommendedSourcingChannels.join(", ")}` +
                              `\nMục tiêu: ${p.kpiMilestones.join("; ")}`
                          )
                          .join("\n\n"),
                      "plan"
                    )
                  }
                >
                  {copiedKey === "plan" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "plan" ? "Đã chép" : "Sao chép kế hoạch"}</span>
                </button>
              )}
            </div>

            {planError && (
              <div className={styles.honestNotice} role="alert">
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{planError}</span>
              </div>
            )}

            {planResult ? (
              <div className={styles.resultContent}>
                {planResult.phases.map((phase, pIdx) => (
                  <div key={pIdx} style={{ marginBottom: 16 }}>
                    <div className={styles.resultSectionTitle}>{phase.phaseName} ({phase.timelineWeeks})</div>
                    <ul className={styles.resultList}>
                      {phase.keyActivities.map((act, aIdx) => (
                        <li key={aIdx}>{act}</li>
                      ))}
                    </ul>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4 }}>
                      <strong>Kênh đề xuất:</strong> {phase.recommendedSourcingChannels.join(" • ")}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: 2 }}>
                      <strong>Mục tiêu:</strong> {phase.kpiMilestones.join(" • ")}
                    </div>
                  </div>
                ))}

                {planResult.riskMitigationTips.length > 0 && (
                  <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#b45309", marginBottom: 6 }}>
                      Khuyến nghị giảm thiểu rủi ro chậm tiến độ:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8125rem", color: "#475569" }}>
                      {planResult.riskMitigationTips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Calendar size={48} className={styles.emptyIcon} aria-hidden="true" />
                <h3 className={styles.emptyTitle}>Chưa có kế hoạch tuyển dụng</h3>
                <p className={styles.emptyDesc}>
                  Điền các thông số tuyển dụng bên trái để nhận lộ trình phân kỳ, kênh tìm kiếm ứng viên (sourcing) và mốc tiến độ cụ thể.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUTHORIZED HIRING INSIGHTS */}
      {currentTab === "insights" && (
        <div className={styles.tabPanel} role="tabpanel" aria-labelledby={`${idPrefix}-tab-insights`}>
          <div className={styles.panelCard} style={{ gridColumn: "1 / -1" }}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>
                  <Layers size={18} color="#4f46e5" aria-hidden="true" />
                  <span>Tổng quan dữ liệu tuyển dụng an toàn (Authorized Hiring Insights)</span>
                </h2>
                <p className={styles.cardDesc}>
                  Dữ liệu được lấy trực tiếp từ hệ thống tuyển dụng nội bộ của {active.name}. Cam kết không sử dụng thuật toán dự đoán phi căn cứ đối với ứng viên.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>TỔNG SỐ TIN TUYỂN DỤNG</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e1b4b", marginTop: 4 }}>
                  {loadingJobs ? "..." : companyJobs.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: 4 }}>Dữ liệu thời gian thực từ API công ty</div>
              </div>

              <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>TIN ĐANG CÔNG KHAI</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                  {loadingJobs ? "..." : companyJobs.filter((j) => j.status === "PUBLISHED").length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Đang hiển thị trên Sàn việc làm</div>
              </div>

              <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>BẢN NHÁP & TẠM DỪNG</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>
                  {loadingJobs ? "..." : companyJobs.filter((j) => j.status !== "PUBLISHED").length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Chờ hoàn thiện hoặc mở lại</div>
              </div>

              <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>TRẠNG THÁI AI BẢN QUYỀN</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#4f46e5", marginTop: 8 }}>
                  Doanh nghiệp (Enterprise)
                </div>
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4 }}>Phạm vi: {active.name}</div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: "0.8125rem", color: "#1e40af" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Lưu ý về quyền riêng tư & Tuân thủ:</div>
              <div>
                Hệ thống tuyển dụng FINDWORK không tự động gán nhãn hồ sơ hay đưa ra quyết định thay cho con người.
                Mọi nhận định về năng lực ứng viên phải được thực hiện thông qua buổi phỏng vấn trực tiếp và đánh giá thực tế của Hội đồng tuyển dụng.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerAiPage;
