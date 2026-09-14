export interface CompanyFilterRecord {
  name: string;
  industry: string;
  location: string;
  jobsCount: number;
}

export interface CompanyFilterOptions {
  keyword: string;
  industry: string;
  location: string;
}
