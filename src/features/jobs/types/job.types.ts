import type {
  JobFilterRecord,
} from "./job-filter.types";

/**
 * Contract chung của một Job ở frontend.
 *
 * Không phải Prisma model / database entity.
 * Backend sau này có thể trả DTO khác và jobService
 * sẽ map về shape này cho frontend sử dụng.
 */
export type JobId = number;

export interface JobRecord
  extends JobFilterRecord {
  id: JobId;
}