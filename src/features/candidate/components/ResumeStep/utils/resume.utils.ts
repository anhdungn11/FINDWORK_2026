export const MAX_RESUME_FILE_SIZE =
  10 * 1024 * 1024;

export const RESUME_ACCEPT =
  "application/pdf,.pdf";

export const getResumeNameFromFileName = (
  fileName: string,
) => {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const formatResumeFileSize = (
  bytes: number | null,
) => {
  if (!bytes || bytes <= 0) {
    return "Không rõ dung lượng";
  }

  const megabytes =
    bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  const kilobytes =
    bytes / 1024;

  return `${Math.max(
    1,
    Math.round(kilobytes),
  )} KB`;
};

export const validateResumeFile = (
  file: File,
) => {
  const hasPdfExtension =
    file.name
      .toLowerCase()
      .endsWith(".pdf");

  const hasValidMimeType =
    !file.type ||
    file.type === "application/pdf";

  if (
    !hasPdfExtension ||
    !hasValidMimeType
  ) {
    return "CV phải ở định dạng PDF.";
  }

  if (
    file.size >
    MAX_RESUME_FILE_SIZE
  ) {
    return "Dung lượng CV không được vượt quá 10 MB.";
  }

  if (file.size <= 0) {
    return "File CV không hợp lệ. Vui lòng chọn lại file PDF.";
  }

  return "";
};

export const revokeResumeObjectUrl = (
  url: string,
) => {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};
