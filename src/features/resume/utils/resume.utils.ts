export const MAX_RESUME_COUNT = 10;
export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";

export const deriveResumeName = (fileName: string) => {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const validateResumeFile = (file: File) => {
  const isPdfByMime = file.type === PDF_MIME_TYPE;
  const isPdfByExtension = file.name.toLowerCase().endsWith(".pdf");

  if (!isPdfByMime || !isPdfByExtension) {
    return "CV phải ở định dạng PDF.";
  }

  if (file.size <= 0) {
    return "File CV không hợp lệ hoặc đang rỗng.";
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    return "Dung lượng CV không được vượt quá 10 MB.";
  }

  return null;
};

export const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatResumeUpdatedAt = (isoDate: string) => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
};
