export interface Company {
  id: number;
  name: string;
  industry: string;
  location: string;
  jobsCount: number;
}

export const companies: Company[] = [
  {
    id: 1,
    name: "FPT Software",
    industry: "Information Technology",
    location: "Ho Chi Minh City",
    jobsCount: 18,
  },
  {
    id: 2,
    name: "VNG Corporation",
    industry: "Technology",
    location: "Ho Chi Minh City",
    jobsCount: 12,
  },
  {
    id: 3,
    name: "TechNova",
    industry: "Software Development",
    location: "Binh Duong",
    jobsCount: 8,
  },
];