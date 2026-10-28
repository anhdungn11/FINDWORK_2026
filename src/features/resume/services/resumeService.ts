import { apiClient } from "../../../services/http/apiClient";
import { assertLiveWritesAllowed, isLiveWritesEnabled } from "../../candidate/profile/config/candidateIntegrationConfig";
import { toApiFailure } from "../../../services/api/apiFailure";
import type {
  CreateBuilderResumeInput,
  CreateUploadedResumeInput,
  RenameResumeInput,
  ReplaceUploadedResumeInput,
  Resume,
  ResumeBuilderContent,
  ResumeBuilderSettings,
  ResumeTemplateCode,
  ResumeVersion,
  UpdateBuilderResumeInput,
} from "../types/resume.types";
import { MAX_RESUME_COUNT, validateResumeFile } from "../utils/resume.utils";
import { useAuthStore } from "../../../store/authStore";

export interface BackendResumeVersionDto {
  id: string;
  versionNumber: number;
  templateCode: string | null;
  builderContent: Record<string, unknown> | null;
  builderSettings: Record<string, unknown> | null;
  createdAt: string;
}

export interface BackendResumeDto {
  id: string;
  name: string;
  sourceType: "BUILDER" | "UPLOADED";
  status: "READY" | "UPLOADING" | "FAILED";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  versions: BackendResumeVersionDto[];
}

const STORAGE_KEY = "findwork.mock.builder-resumes.v7";
const storageKeyFor = (userId: string) => `${STORAGE_KEY}.${userId}`;

const readStoredBuilderResumes = (userId: string | null): Resume[] => {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.sessionStorage.getItem(storageKeyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Resume[];
    return Array.isArray(parsed)
      ? parsed.filter((resume) => resume.sourceType === "builder")
      : [];
  } catch {
    return [];
  }
};

let ownerId = useAuthStore.getState().user?.id ?? null;
let resumeStore: Resume[] = readStoredBuilderResumes(ownerId);

const revokePreviewLater = (previewUrl: string | undefined) => {
  if (previewUrl) {
    setTimeout(() => URL.revokeObjectURL(previewUrl), 0);
  }
};

const syncStoreForCurrentUser = () => {
  const currentOwner = useAuthStore.getState().user?.id ?? null;
  if (currentOwner !== ownerId) {
    for (const resume of resumeStore) {
      revokePreviewLater(resume.currentVersion?.file?.previewUrl);
    }
    ownerId = currentOwner;
    resumeStore = readStoredBuilderResumes(ownerId);
  } else if (ownerId && resumeStore.length === 0) {
    resumeStore = readStoredBuilderResumes(ownerId);
  }
};

useAuthStore.subscribe((state) => {
  const nextOwnerId = state.user?.id ?? null;
  if (nextOwnerId !== ownerId) {
    for (const resume of resumeStore) {
      revokePreviewLater(resume.currentVersion?.file?.previewUrl);
    }
    ownerId = nextOwnerId;
    resumeStore = readStoredBuilderResumes(ownerId);
  }
});

const persistBuilderResumes = () => {
  if (typeof window === "undefined" || !ownerId) return;
  try {
    const builderResumes = resumeStore.filter(
      (resume) => resume.sourceType === "builder",
    );
    window.sessionStorage.setItem(storageKeyFor(ownerId), JSON.stringify(builderResumes));
  } catch {
    // Mock persistence is best-effort only.
  }
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const cloneResumes = () => clone(resumeStore);

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const findResume = (resumeId: string) => {
  const resume = resumeStore.find((item) => item.id === resumeId);
  if (!resume) {
    throw new Error("Không tìm thấy CV.");
  }
  return resume;
};

const ensureResumeName = (name: string) => {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Tên CV không được để trống.");
  }
  return normalized;
};

const ensureCapacity = () => {
  if (resumeStore.length >= MAX_RESUME_COUNT) {
    throw new Error("Bạn đã đạt giới hạn 10 CV.");
  }
};

const ensureValidPdf = (file: File) => {
  const validationError = validateResumeFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
};

const createUploadedVersion = (
  file: File,
  versionNumber: number,
): ResumeVersion => ({
  id: createId("resume-version"),
  versionNumber,
  file: {
    originalFileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    previewUrl: URL.createObjectURL(file),
  },
  builderContent: null,
  templateCode: null,
  builderSettings: null,
  createdAt: new Date().toISOString(),
});

/** Chuyển đổi Backend DTO sang Frontend Domain View Model */
export function normalizeBackendResume(dto: BackendResumeDto): Resume {
  const latestVersion = dto.versions?.[0];
  const versionNumber = latestVersion?.versionNumber ?? 1;
  const rawSourceType = String(dto.sourceType ?? "").toUpperCase();
  const rawStatus = String(dto.status ?? "").toUpperCase();

  return {
    id: dto.id,
    name: dto.name,
    sourceType: rawSourceType === "BUILDER" ? "builder" : "uploaded",
    isDefault: dto.isDefault ?? false,
    status: rawStatus === "READY" ? "ready" : rawStatus === "FAILED" ? "failed" : "uploading",
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    currentVersion: {
      id: latestVersion?.id ?? dto.id,
      versionNumber,
      file: null,
      builderContent: (latestVersion?.builderContent as unknown as ResumeBuilderContent) ?? null,
      templateCode: (latestVersion?.templateCode as ResumeTemplateCode) ?? null,
      builderSettings: (latestVersion?.builderSettings as unknown as ResumeBuilderSettings) ?? null,
      createdAt: latestVersion?.createdAt ?? dto.createdAt,
    },
  };
}

export const resumeService = {
  /**
   * Danh sách CV:
   * Nếu đã xác thực (có Bearer session): Ưu tiên gọi GET /api/v1/candidate/resumes.
   * Nếu có lỗi hoặc người dùng chưa tạo CandidateProfile (404), trả về danh sách sessionStorage cách ly.
   */
  async list(): Promise<Resume[]> {
    syncStoreForCurrentUser();
    const auth = useAuthStore.getState();
    if (auth.accessToken && auth.user?.id) {
      try {
        const response = await apiClient.get<{ data: BackendResumeDto[] }>("/candidate/resumes");
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        if (list.length > 0) {
          return list.map(normalizeBackendResume);
        }
      } catch (err) {
        // Fallback an toàn về session store nếu chưa có CandidateProfile hoặc server offline
        const failure = toApiFailure(err);
        if (failure.status === 401 || failure.status === 403) {
          throw failure;
        }
      }
    }
    return cloneResumes();
  },

  async getById(resumeId: string): Promise<Resume | null> {
    syncStoreForCurrentUser();
    const auth = useAuthStore.getState();
    if (auth.accessToken && auth.user?.id) {
      try {
        const response = await apiClient.get<BackendResumeDto>(`/candidate/resumes/${resumeId}`);
        const data = response.data;
        if (data && data.id) {
          return normalizeBackendResume(data);
        }
      } catch {
        // Fallback xuống local store nếu không tìm thấy trên remote
      }
    }
    let resume = resumeStore.find((item) => item.id === resumeId);
    if (!resume && auth.user?.id) {
      const freshStored = readStoredBuilderResumes(auth.user.id);
      resume = freshStored.find((item) => item.id === resumeId);
      if (resume) {
        resumeStore = freshStored;
      }
    }
    return resume ? clone(resume) : null;
  },

  async createUploadedResume({ name, file }: CreateUploadedResumeInput): Promise<Resume> {
    syncStoreForCurrentUser();
    ensureCapacity();
    ensureValidPdf(file);

    const now = new Date().toISOString();
    const resume: Resume = {
      id: createId("resume"),
      name: ensureResumeName(name),
      sourceType: "uploaded",
      isDefault: resumeStore.length === 0,
      status: "ready",
      currentVersion: createUploadedVersion(file, 1),
      createdAt: now,
      updatedAt: now,
    };

    resumeStore = [resume, ...resumeStore];
    persistBuilderResumes();
    return clone(resume);
  },

  async createBuilderResume({
    name,
    templateCode,
    content,
    settings,
  }: CreateBuilderResumeInput): Promise<Resume> {
    syncStoreForCurrentUser();
    ensureCapacity();
    const cleanName = ensureResumeName(name);

    // Kiểm tra cờ live write: nếu được bật và đã đăng nhập, gửi mutation thực tế
    if (isLiveWritesEnabled()) {
      assertLiveWritesAllowed("tạo CV Builder");
      try {
        const response = await apiClient.post<BackendResumeDto>("/candidate/resumes", {
          name: cleanName,
          templateCode,
          builderContent: content,
          builderSettings: settings,
        });
        return normalizeBackendResume(response.data);
      } catch (e) {
        throw toApiFailure(e);
      }
    }

    // Chế độ mô phỏng / offline session store khi cờ ghi đang khóa
    const now = new Date().toISOString();
    const resume: Resume = {
      id: createId("resume"),
      name: cleanName,
      sourceType: "builder",
      isDefault: resumeStore.length === 0,
      status: "ready",
      currentVersion: {
        id: createId("resume-version"),
        versionNumber: 1,
        file: null,
        builderContent: clone(content),
        templateCode,
        builderSettings: clone(settings),
        createdAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    resumeStore = [resume, ...resumeStore];
    persistBuilderResumes();
    return clone(resume);
  },

  async renameResume({ resumeId, name }: RenameResumeInput): Promise<Resume[]> {
    syncStoreForCurrentUser();
    findResume(resumeId);
    const nextName = ensureResumeName(name);
    const now = new Date().toISOString();

    resumeStore = resumeStore.map((resume) =>
      resume.id === resumeId
        ? { ...resume, name: nextName, updatedAt: now }
        : resume,
    );

    persistBuilderResumes();
    return cloneResumes();
  },

  async replaceUploadedResume({
    resumeId,
    file,
  }: ReplaceUploadedResumeInput): Promise<Resume[]> {
    syncStoreForCurrentUser();
    const current = findResume(resumeId);
    if (current.sourceType !== "uploaded") {
      throw new Error("Chỉ CV PDF đã tải lên mới có thể thay file.");
    }

    ensureValidPdf(file);

    const previousPreviewUrl = current.currentVersion.file?.previewUrl;
    const nextVersion = createUploadedVersion(
      file,
      current.currentVersion.versionNumber + 1,
    );
    const now = new Date().toISOString();

    resumeStore = resumeStore.map((resume) =>
      resume.id === resumeId
        ? {
            ...resume,
            currentVersion: nextVersion,
            status: "ready",
            updatedAt: now,
          }
        : resume,
    );

    revokePreviewLater(previousPreviewUrl);
    return cloneResumes();
  },

  async updateBuilderResume({
    resumeId,
    name,
    templateCode,
    content,
    settings,
  }: UpdateBuilderResumeInput): Promise<Resume> {
    syncStoreForCurrentUser();
    const cleanName = ensureResumeName(name);

    if (isLiveWritesEnabled()) {
      assertLiveWritesAllowed("cập nhật CV Builder");
      try {
        // Lấy version hiện tại để so khớp lạc quan (optimistic CAS)
        const current = await this.getById(resumeId);
        const expectedVersionNumber = current?.currentVersion.versionNumber ?? 1;

        const response = await apiClient.patch<BackendResumeDto>(`/candidate/resumes/${resumeId}`, {
          name: cleanName,
          templateCode,
          builderContent: content,
          builderSettings: settings,
          expectedVersionNumber,
        });
        return normalizeBackendResume(response.data);
      } catch (e) {
        throw toApiFailure(e);
      }
    }

    const current = findResume(resumeId);
    if (current.sourceType !== "builder") {
      throw new Error("CV PDF không thể chỉnh sửa bằng trình tạo CV.");
    }

    const now = new Date().toISOString();
    const nextVersion: ResumeVersion = {
      id: createId("resume-version"),
      versionNumber: current.currentVersion.versionNumber + 1,
      file: null,
      builderContent: clone(content),
      templateCode,
      builderSettings: clone(settings),
      createdAt: now,
    };

    let updatedResume: Resume | null = null;
    resumeStore = resumeStore.map((resume) => {
      if (resume.id !== resumeId) return resume;

      updatedResume = {
        ...resume,
        name: cleanName,
        currentVersion: nextVersion,
        updatedAt: now,
      };

      return updatedResume;
    });

    persistBuilderResumes();
    return clone(updatedResume ?? current);
  },

  async setDefaultResume(resumeId: string): Promise<Resume[]> {
    syncStoreForCurrentUser();
    findResume(resumeId);
    const now = new Date().toISOString();

    resumeStore = resumeStore.map((resume) => ({
      ...resume,
      isDefault: resume.id === resumeId,
      updatedAt: resume.id === resumeId ? now : resume.updatedAt,
    }));

    persistBuilderResumes();
    return cloneResumes();
  },

  async deleteResume(resumeId: string): Promise<Resume[]> {
    syncStoreForCurrentUser();
    const deletingResume = findResume(resumeId);
    const previewUrl = deletingResume.currentVersion.file?.previewUrl;

    resumeStore = resumeStore.filter((resume) => resume.id !== resumeId);

    if (deletingResume.isDefault && resumeStore.length > 0) {
      const fallback = [...resumeStore].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )[0];

      resumeStore = resumeStore.map((resume) => ({
        ...resume,
        isDefault: resume.id === fallback.id,
      }));
    }

    revokePreviewLater(previewUrl);
    persistBuilderResumes();
    return cloneResumes();
  },
};
