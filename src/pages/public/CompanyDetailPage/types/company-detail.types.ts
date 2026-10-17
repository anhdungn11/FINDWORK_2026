export interface CompanyDetailRecord {
  id: string | number;
  name: string;
  industry: string;
  location: string;
  jobsCount: number;
  description: string;
  size: string;
  foundedYear: number | string;
  website: string;
  logo?: string | null;
  cover?: string | null;
  isVerified?: boolean;
}
