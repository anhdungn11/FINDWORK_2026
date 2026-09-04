export interface Company {
  id: number;
  name: string;
  industry: string;
  location: string;
  jobsCount: number;

  description: string;
  website: string;
  size: string;
  foundedYear: number;

  logo: string;
  cover: string;
}

export const companies: Company[] = [
  {
    id: 1,
    name: "FPT Software",
    industry: "Information Technology",
    location: "Ho Chi Minh City",
    jobsCount: 18,

    description:
      "Doanh nghiệp công nghệ cung cấp các giải pháp và dịch vụ phần mềm cho khách hàng trong nước và quốc tế. Môi trường làm việc hướng đến phát triển chuyên môn, đổi mới công nghệ và cơ hội tham gia các dự án quy mô lớn.",

    website: "https://fptsoftware.com",
    size: "10.000+ nhân viên",
    foundedYear: 1999,

    logo: "/images/companies/fpt-logo.png",
    cover: "/images/companies/fpt-cover.jpg",
  },

  {
    id: 2,
    name: "VNG Corporation",
    industry: "Technology",
    location: "Ho Chi Minh City",
    jobsCount: 12,

    description:
      "Doanh nghiệp công nghệ phát triển nhiều sản phẩm và nền tảng số phục vụ người dùng. Công ty tập trung vào công nghệ, sản phẩm số và xây dựng các dịch vụ có khả năng phục vụ lượng lớn người dùng.",

    website: "https://vng.com.vn",
    size: "3.000+ nhân viên",
    foundedYear: 2004,

    logo: "/images/companies/vng-logo.png",
    cover: "/images/companies/vng-cover.jpg",
  },

  {
    id: 3,
    name: "TechNova",
    industry: "Software Development",
    location: "Binh Duong",
    jobsCount: 8,

    description:
      "Công ty phát triển phần mềm tập trung vào các sản phẩm web, ứng dụng doanh nghiệp và giải pháp chuyển đổi số. TechNova hướng đến môi trường làm việc linh hoạt và tạo cơ hội phát triển cho các kỹ sư trẻ.",

    website: "https://technova.example",
    size: "200 - 500 nhân viên",
    foundedYear: 2018,

    logo: "/images/companies/technova-logo.png",
    cover: "/images/companies/technova-cover.jpg",
  },
];