/**
 * Kiểu dữ liệu phục vụ search/filter ở frontend.
 *
 * Lưu ý:
 * - Đây KHÔNG phải Prisma model.
 * - Đây KHÔNG phải database entity.
 * - JobFilterRecord chỉ mô tả những field mà lớp filter/sort hiện tại cần.
 * - API/backend sau này có thể map DTO riêng về shape phù hợp với frontend.
 */
export type JobSortOption =
  | "match"
  | "latest"
  | "salary";

export interface AdvancedFilters {
  category: string;
  type: string;
  workplace: string;
  experience: string;
  salaryMin: number;
}

export interface JobFilterOptions
  extends AdvancedFilters {
  keyword: string;
  location: string;
}

export interface JobFilterRecord {
  title: string;
  company: string;
  category: string;
  skills: readonly string[];

  location: string;
  type: string;
  workplace: string;
  experience: string;

  salary: string;
  postedAt: string;

  /**
   * Chỉ là giá trị ranking của mock hiện tại.
   * Không xem đây là field cố định của bảng Job sau này.
   */
  matchScore: number;
}

export interface JobFilterFacets {
  locations: string[];
  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];
}

export type UpdateAdvancedFilter = <
  Key extends keyof AdvancedFilters,
>(
  key: Key,
  value: AdvancedFilters[Key],
) => void;
