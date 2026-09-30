import type {
  ApplicationDraft,
  CreateApplicationDraftInput,
  SubmittedApplication,
} from "@/features/applications/types/application.types";

let draftStore: ApplicationDraft[] = [];

let applicationStore:
  SubmittedApplication[] = [];

const clone = <T,>(
  value: T,
): T =>
  JSON.parse(
    JSON.stringify(value),
  ) as T;

const createId = (
  prefix: string,
): string => {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const createDraft = async (
  input: CreateApplicationDraftInput,
): Promise<ApplicationDraft> => {
  const now = new Date().toISOString();

  const draft: ApplicationDraft = {
    id: createId(
      "application-draft",
    ),

    jobId: input.jobId,

    resumeId: input.resumeId,

    resumeVersionId:
      input.resumeVersionId,

    details: clone(input.details),

    answers: clone(input.answers),

    status: "draft",

    createdAt: now,
    updatedAt: now,
  };

  draftStore = [
    draft,
    ...draftStore,
  ];

  return clone(draft);
};

const getDraftById = async (
  draftId: string,
): Promise<ApplicationDraft | null> => {
  const draft = draftStore.find(
    (item) =>
      item.id === draftId,
  );

  return draft
    ? clone(draft)
    : null;
};

const listDrafts = async (): Promise<
  ApplicationDraft[]
> => {
  return clone(draftStore);
};

const submit = async (
  draftId: string,
): Promise<SubmittedApplication> => {
  const draft = draftStore.find(
    (item) =>
      item.id === draftId,
  );

  if (!draft) {
    throw new Error(
      "Không tìm thấy bản nháp ứng tuyển.",
    );
  }

  const application:
    SubmittedApplication = {
    id: createId("application"),

    jobId: draft.jobId,

    resumeId: draft.resumeId,

    resumeVersionId:
      draft.resumeVersionId,

    details: clone(
      draft.details,
    ),

    answers: clone(
      draft.answers,
    ),

    status: "submitted",

    submittedAt:
      new Date().toISOString(),
  };

  applicationStore = [
    application,
    ...applicationStore,
  ];

  draftStore =
    draftStore.filter(
      (item) =>
        item.id !== draftId,
    );

  return clone(application);
};

const listApplications =
  async (): Promise<
    SubmittedApplication[]
  > => {
    return clone(
      applicationStore,
    );
  };

export const applicationPrototypeService = {
  createDraft,
  getDraftById,
  listDrafts,
  submit,
  listApplications,
};