import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuthStore } from "@/store/authStore";
import { extractApiErrorMessage } from "@/services/http/apiClient";
import { INITIAL_ONBOARDING_DATA } from "@/features/candidate/utils/onboarding.constants";
import { useCandidateOnboarding } from "@/features/candidate/hooks/useCandidateOnboarding";
import { loadOnboardingDraft, restoreDraftData, saveOnboardingDraft } from "@/features/candidate/services/onboardingDraft";
import type { CandidateOnboardingData, UpdateCandidateOnboardingSection, OnboardingStepId } from "@/features/candidate/types/onboarding.types";

import OnboardingActions from "./components/OnboardingActions";
import OnboardingContentHeader from "./components/OnboardingContentHeader";
import OnboardingSidebar from "./components/OnboardingSidebar";
import OnboardingStepContent from "./components/OnboardingStepContent";
import layoutStyles from "./styles/CandidateOnboardingLayout.module.css";
import contentStyles from "./styles/OnboardingContent.module.css";

type BootState = "loading" | "ready" | "error" | "login";
type SaveState = "saved" | "saving" | "unsaved" | "error";

const CandidateOnboarding = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const authStatus = useAuthStore((state) => state.status);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const {
    data, setData, steps, currentStep, currentStepIndex, progress,
    isFirstStep, isLastStep, goToStep, restore, reset,
  } = useCandidateOnboarding();

  const [boot, setBoot] = useState<BootState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("unsaved");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const versionRef = useRef(0);
  const epochRef = useRef(0);
  const activeUserRef = useRef<string | undefined>(undefined);
  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const changeRef = useRef(0);
  const dataRef = useRef(data);
  const stepRef = useRef(currentStepIndex);
  const flushRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    if (authStatus === "idle") void checkAuth();
  }, [authStatus, checkAuth]);

  useEffect(() => {
    const epoch = ++epochRef.current;
    activeUserRef.current = userId;
    readyRef.current = false;
    dirtyRef.current = false;
    changeRef.current = 0;
    versionRef.current = 0;
    dataRef.current = INITIAL_ONBOARDING_DATA;
    stepRef.current = 0;
    flushRef.current = null;
    setMessage("");
    setBoot(userId ? "loading" : "login");
    setSaveState("unsaved");
    reset();
    if (!userId) return;

    void loadOnboardingDraft().then((draft) => {
      if (epochRef.current !== epoch) return;
      if (draft) {
        const restored = restoreDraftData(draft.data);
        restore(restored, draft.stepIndex);
        dataRef.current = restored;
        stepRef.current = draft.stepIndex;
        versionRef.current = draft.version;
      } else {
        // Reset is already in progress; start with the default empty state.
        dataRef.current = INITIAL_ONBOARDING_DATA;
        stepRef.current = 0;
      }
      readyRef.current = true;
      setBoot("ready");
      setSaveState("saved");
    }).catch((error: unknown) => {
      if (epochRef.current !== epoch) return;
      setBoot("error");
      setMessage(extractApiErrorMessage(error, "Không thể tải bản nháp. Vui lòng thử lại."));
    });
    return () => { if (epochRef.current === epoch) readyRef.current = false; };
    // Intentionally reload only when the authenticated account changes.
  }, [userId]);

  // On account change, don't copy data from a previous account's render into the new save snapshot.
  const markDirty = () => {
    changeRef.current += 1;
    dirtyRef.current = true;
    setSaveState("unsaved");
    setMessage("");
  };

  const updateSection: UpdateCandidateOnboardingSection = (section, value) => {
    if (!readyRef.current) return;
    const next = { ...dataRef.current, [section]: value } as CandidateOnboardingData;
    dataRef.current = next;
    setData(next);
    markDirty();
  };

  const goToIndex = (index: number) => {
    if (!readyRef.current || index < 0 || index >= steps.length) return;
    stepRef.current = index;
    goToStep(steps[index].id);
    markDirty();
  };

  const flush = useCallback((): Promise<boolean> => {
    if (!readyRef.current || !activeUserRef.current) return Promise.resolve(false);
    if (flushRef.current) return flushRef.current;
    const epoch = epochRef.current;
    const user = activeUserRef.current;
    const promise = (async () => {
      while (dirtyRef.current && epochRef.current === epoch && activeUserRef.current === user) {
        const changed = changeRef.current;
        const snapshot = dataRef.current;
        const stepIndex = stepRef.current;
        setSaveState("saving");
        try {
          const saved = await saveOnboardingDraft(snapshot, stepIndex, versionRef.current);
          if (epochRef.current !== epoch || activeUserRef.current !== user) return false;
          versionRef.current = saved.version;
          if (changed === changeRef.current) {
            dirtyRef.current = false;
            setSaveState("saved");
          }
        } catch (error: unknown) {
          if (epochRef.current === epoch) {
            setSaveState("error");
            setMessage(extractApiErrorMessage(error, "Không lưu được bản nháp. Kiểm tra kết nối và thử lại."));
          }
          return false;
        }
      }
      return epochRef.current === epoch && activeUserRef.current === user;
    })();
    flushRef.current = promise;
    void promise.finally(() => { if (flushRef.current === promise) flushRef.current = null; });
    return promise;
  }, []);

  useEffect(() => {
    if (boot !== "ready" || !dirtyRef.current || saveState === "error") return;
    const timeout = window.setTimeout(() => { void flush(); }, 700);
    return () => window.clearTimeout(timeout);
  }, [boot, data, currentStepIndex, saveState, flush]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && saveState !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [saveState]);

  const handleNext = async () => {
    if (busy || !readyRef.current) return;
    setBusy(true);
    try {
      if (!isLastStep) {
        goToIndex(currentStepIndex + 1);
        if (await flush()) window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (await flush()) {
        // This is only a WIP snapshot, not a published CandidateProfile.
        setMessage("Đã lưu bản nháp 7 bước. Việc xuất bản hồ sơ chính thức sẽ được thực hiện ở giai đoạn tiếp theo.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!userId) {
    return <main role="status" style={{ padding: 32 }}>
      {authStatus === "loading" || authStatus === "idle" ? "Đang kiểm tra đăng nhập..." : <>
        <h2>Đăng nhập để lưu hồ sơ an toàn</h2>
        <p>Dữ liệu Onboarding được lưu riêng theo tài khoản trong PostgreSQL.</p>
        <Link to="/login">Đến trang đăng nhập</Link>
      </>}
    </main>;
  }
  if (boot === "loading") return <main role="status" style={{ padding: 32 }}>Đang tải bản nháp hồ sơ...</main>;
  if (boot === "error") return <main role="alert" style={{ padding: 32 }}>
    <p>{message || "Không thể tải bản nháp."}</p>
    <button type="button" onClick={() => window.location.reload()}>Tải lại để thử lại</button>
  </main>;

  return (
    <main className={layoutStyles.page}>
      <div className={layoutStyles.container}>
        <OnboardingSidebar steps={steps} currentStep={currentStep} currentStepIndex={currentStepIndex}
          progress={progress} onStepChange={(stepId: OnboardingStepId) => {
            const index = steps.findIndex((step) => step.id === stepId);
            if (index !== -1 && index <= currentStepIndex) goToIndex(index);
          }} />
        <section className={contentStyles.content}>
          <OnboardingContentHeader currentStep={currentStep} currentStepIndex={currentStepIndex} totalSteps={steps.length} />
          <div role="status" aria-live="polite" style={{ marginBottom: 12, fontSize: 13 }}>
            {saveState === "saved" ? "✓ Đã lưu bản nháp vào tài khoản" :
              saveState === "saving" ? "Đang lưu bản nháp..." :
              saveState === "error" ? "Lưu bản nháp thất bại" : "Có thay đổi chưa được lưu"}
            {saveState === "error" && <>
              <p role="alert">{message}</p>
              <button type="button" onClick={() => { setSaveState("unsaved"); void flush(); }}>Thử lưu lại</button>
            </>}
          </div>
          <div className={contentStyles.card}>
            <OnboardingStepContent currentStep={currentStep} data={data} updateSection={updateSection} />
            <p style={{ fontSize: 12, opacity: .7, margin: "16px 0" }}>
              Lưu ý: ảnh đại diện và CV chọn từ máy chỉ là bản xem trước; chưa được tải lên máy chủ. Sau khi tải lại trang, hãy chọn lại các tệp này.
            </p>
            <OnboardingActions isFirstStep={isFirstStep} isLastStep={isLastStep}
              disabled={busy || saveState === "saving"}
              onPrevious={() => goToIndex(currentStepIndex - 1)} onNext={() => { void handleNext(); }} />
            {isLastStep && message && saveState === "saved" && <p role="status">{message}</p>}
          </div>
        </section>
      </div>
    </main>
  );
};

export default CandidateOnboarding;
