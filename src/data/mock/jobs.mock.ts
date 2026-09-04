export interface Job {
  id: number;
  title: string;
  company: string;
  category: string;
  location: string;
  salary: string;
  type: string;
  workplace: "On-site" | "Remote" | "Hybrid";
  experience: string;
  skills: string[];
  matchScore: number;
  postedAt: string;
}

export const jobs: Job[] = [
  {
    id: 1,
    title: "Frontend Developer",
    company: "FPT Software",
    category: "Công nghệ thông tin",
    location: "Ho Chi Minh City",
    salary: "15 - 25 triệu",
    type: "Full-time",
    workplace: "Hybrid",
    experience: "1 - 2 năm",
    skills: ["React", "TypeScript", "Git"],
    matchScore: 86,
    postedAt: "2 giờ trước",
  },
  {
    id: 2,
    title: "Chuyên viên Digital Marketing",
    company: "Nova Group",
    category: "Marketing / Truyền thông",
    location: "Ho Chi Minh City",
    salary: "14 - 22 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "1 năm",
    skills: ["Content", "SEO", "Google Ads"],
    matchScore: 81,
    postedAt: "4 giờ trước",
  },
  {
    id: 3,
    title: "Kế toán tổng hợp",
    company: "An Phát Holdings",
    category: "Kế toán / Kiểm toán",
    location: "Binh Duong",
    salary: "13 - 20 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "2 năm",
    skills: ["Excel", "Tax", "Accounting"],
    matchScore: 79,
    postedAt: "Hôm nay",
  },
  {
    id: 4,
    title: "Nhân viên kinh doanh",
    company: "Viettel",
    category: "Kinh doanh / Bán hàng",
    location: "Ho Chi Minh City",
    salary: "12 - 25 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "Không yêu cầu",
    skills: ["Giao tiếp", "Tư vấn", "Chăm sóc khách hàng"],
    matchScore: 76,
    postedAt: "Hôm nay",
  },
  {
    id: 5,
    title: "Kỹ sư cơ khí",
    company: "THACO",
    category: "Cơ khí / Sản xuất",
    location: "Dong Nai",
    salary: "15 - 23 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "1 - 3 năm",
    skills: ["AutoCAD", "SolidWorks", "Technical Drawing"],
    matchScore: 74,
    postedAt: "1 ngày trước",
  },
  {
    id: 6,
    title: "Chuyên viên nhân sự",
    company: "Masan Group",
    category: "Nhân sự",
    location: "Ho Chi Minh City",
    salary: "12 - 18 triệu",
    type: "Full-time",
    workplace: "Hybrid",
    experience: "1 năm",
    skills: ["Recruitment", "HR Operations", "Communication"],
    matchScore: 72,
    postedAt: "1 ngày trước",
  },
  {
    id: 7,
    title: "Nhân viên kho",
    company: "Shopee Express",
    category: "Kho vận / Logistics",
    location: "Binh Duong",
    salary: "9 - 13 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "Không yêu cầu",
    skills: ["Kiểm hàng", "Sắp xếp hàng hóa", "Làm việc nhóm"],
    matchScore: 68,
    postedAt: "2 ngày trước",
  },
  {
    id: 8,
    title: "Giáo viên tiếng Anh",
    company: "Bright Future Education",
    category: "Giáo dục / Đào tạo",
    location: "Binh Duong",
    salary: "12 - 20 triệu",
    type: "Full-time",
    workplace: "On-site",
    experience: "1 năm",
    skills: ["English", "Teaching", "Communication"],
    matchScore: 70,
    postedAt: "2 ngày trước",
  },
];