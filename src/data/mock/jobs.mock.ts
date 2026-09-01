export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
}

export const jobs: Job[] = [
  {
    id: 1,
    title: "Frontend Developer",
    company: "FPT Software",
    location: "Ho Chi Minh City",
    salary: "15 - 25 triệu",
    type: "Full-time",
  },
  {
    id: 2,
    title: "Backend Developer",
    company: "VNG Corporation",
    location: "Ho Chi Minh City",
    salary: "18 - 30 triệu",
    type: "Full-time",
  },
  {
    id: 3,
    title: "UI/UX Designer",
    company: "TechNova",
    location: "Binh Duong",
    salary: "12 - 20 triệu",
    type: "Full-time",
  },
];