import type {
  JobFilterRecord,
} from "@/features/jobs/types/job-filter.types";

/**
 * View-model contract tối thiểu cho trang chi tiết việc làm.
 *
 * Không phải Prisma model / database entity.
 * Không import type từ mock.
 */
export interface JobDetailRecord
  extends JobFilterRecord {
  id: number;
}
