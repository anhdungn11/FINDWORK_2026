import type {
  CreateBuilderResumeInput,
  CreateUploadedResumeInput,
  Resume,
} from "@/features/resume/types/resume.types";
import { MAX_RESUME_COUNT } from "@/features/resume/utils/resume.utils";

let resumeStore: Resume[] = [];

const cloneResumes = () => [...resumeStore];

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createUploadedResume = async ({
  name,
  file,
}: CreateUploadedResumeInput): Promise<Resume> => {
  if (resumeStore.length >= MAX_RESUME_COUNT) {
    throw new Error("Bạn đã đạt giới hạn 10 CV.");
  }

  const now = new Date().toISOString();
  const previewUrl = URL.createObjectURL(file);
  const shouldBeDefault = resumeStore.length === 0;

  const resume: Resume = {
    id: createId("resume"),
    name: name.trim(),
    sourceType: "uploaded",
    isDefault: shouldBeDefault,
    status: "ready",
    currentVersion: {
      id: createId("resume-version"),
      versionNumber: 1,
      file: {
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        previewUrl,
      },
      builderContent: null,
      templateCode: null,
      createdAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  resumeStore = [resume, ...resumeStore];
  return resume;
};


const createBuilderResume = async ({
  name,
  templateCode,
  content,
}: CreateBuilderResumeInput): Promise<Resume> => {
  if (resumeStore.length >= MAX_RESUME_COUNT) {
    throw new Error("Bạn đã đạt giới hạn 10 CV.");
  }

  const now = new Date().toISOString();
  const resume: Resume = {
    id: createId("resume"),
    name: name.trim(),
    sourceType: "builder",
    isDefault: resumeStore.length === 0,
    status: "ready",
    currentVersion: {
      id: createId("resume-version"),
      versionNumber: 1,
      file: null,
      builderContent: content,
      templateCode,
      createdAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  resumeStore = [resume, ...resumeStore];
  return resume;
};

const setDefaultResume = async (resumeId: string): Promise<Resume[]> => {
  const exists = resumeStore.some((resume) => resume.id === resumeId);

  if (!exists) {
    throw new Error("Không tìm thấy CV cần đặt mặc định.");
  }

  resumeStore = resumeStore.map((resume) => ({
    ...resume,
    isDefault: resume.id === resumeId,
    updatedAt:
      resume.id === resumeId
        ? new Date().toISOString()
        : resume.updatedAt,
  }));

  return cloneResumes();
};

export const resumeService = {
  async list(): Promise<Resume[]> {
    return cloneResumes();
  },

  createUploadedResume,
  createBuilderResume,
  setDefaultResume,
};
