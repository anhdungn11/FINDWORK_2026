import type {
  CreateBuilderResumeInput,
  CreateUploadedResumeInput,
  RenameResumeInput,
  ReplaceUploadedResumeInput,
  Resume,
  ResumeVersion,
  UpdateBuilderResumeInput,
} from "@/features/resume/types/resume.types";
import {
  MAX_RESUME_COUNT,
  validateResumeFile,
} from "@/features/resume/utils/resume.utils";

let resumeStore: Resume[] = [];

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

const createUploadedResume = async ({
  name,
  file,
}: CreateUploadedResumeInput): Promise<Resume> => {
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
  return clone(resume);
};

const createBuilderResume = async ({
  name,
  templateCode,
  content,
  settings,
}: CreateBuilderResumeInput): Promise<Resume> => {
  ensureCapacity();

  const now = new Date().toISOString();
  const resume: Resume = {
    id: createId("resume"),
    name: ensureResumeName(name),
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
  return clone(resume);
};

const renameResume = async ({
  resumeId,
  name,
}: RenameResumeInput): Promise<Resume[]> => {
  findResume(resumeId);
  const nextName = ensureResumeName(name);
  const now = new Date().toISOString();

  resumeStore = resumeStore.map((resume) =>
    resume.id === resumeId
      ? { ...resume, name: nextName, updatedAt: now }
      : resume,
  );

  return cloneResumes();
};

const replaceUploadedResume = async ({
  resumeId,
  file,
}: ReplaceUploadedResumeInput): Promise<Resume[]> => {
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

  if (previousPreviewUrl) {
    URL.revokeObjectURL(previousPreviewUrl);
  }

  return cloneResumes();
};

const updateBuilderResume = async ({
  resumeId,
  name,
  templateCode,
  content,
  settings,
}: UpdateBuilderResumeInput): Promise<Resume> => {
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
      name: ensureResumeName(name),
      currentVersion: nextVersion,
      updatedAt: now,
    };

    return updatedResume;
  });

  return clone(updatedResume ?? current);
};

const setDefaultResume = async (resumeId: string): Promise<Resume[]> => {
  findResume(resumeId);
  const now = new Date().toISOString();

  resumeStore = resumeStore.map((resume) => ({
    ...resume,
    isDefault: resume.id === resumeId,
    updatedAt: resume.id === resumeId ? now : resume.updatedAt,
  }));

  return cloneResumes();
};

const deleteResume = async (resumeId: string): Promise<Resume[]> => {
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

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  return cloneResumes();
};

export const resumeService = {
  async list(): Promise<Resume[]> {
    return cloneResumes();
  },

  async getById(resumeId: string): Promise<Resume | null> {
    const resume = resumeStore.find((item) => item.id === resumeId);
    return resume ? clone(resume) : null;
  },

  createUploadedResume,
  createBuilderResume,
  renameResume,
  replaceUploadedResume,
  updateBuilderResume,
  setDefaultResume,
  deleteResume,
};
