import type {
  AdvancedFilters,
} from "../types/job-filter.types";

export const INITIAL_ADVANCED_FILTERS: AdvancedFilters =
  {
    category: "",
    type: "",
    workplace: "",
    experience: "",
    salaryMin: 0,
  };

/**
 * Value tạm phản ánh dữ liệu mock/UI hiện tại.
 * Sau này thay bằng stable code/reference data từ API.
 */
export const CURRENT_JOB_FILTER_VALUES = {
  remoteWorkplace: "Remote",
  fresherExperience: "Không yêu cầu",
  internshipType: "Internship",
} as const;
