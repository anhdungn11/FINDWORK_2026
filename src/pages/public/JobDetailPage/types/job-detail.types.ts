import type {
  JobRecord,
} from "@/features/jobs/types/job.types";

/**
 * View-model của trang Job Detail.
 *
 * Alias này được giữ tại page layer để các component hiện tại
 * không phải thay đổi hàng loạt import.
 *
 * Domain contract thật nằm tại features/jobs/types/job.types.ts.
 */
export type JobDetailRecord = JobRecord;