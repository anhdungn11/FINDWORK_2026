/* =========================================================
   TYPES
========================================================= */

export interface SkillCategoryOption {
  code: string;

  name: string;

  /**
   * Cho phép xây category tree sau này.
   *
   * null = category cấp gốc.
   */
  parentCode: string | null;
}

export interface SkillCatalogItem {
  /**
   * Business code ổn định.
   *
   * Không dùng array index hoặc database ID
   * làm business identifier.
   */
  code: string;

  /**
   * Tên chuẩn để hiển thị.
   */
  name: string;

  /**
   * Category mà skill thuộc về.
   */
  categoryCode: string;

  /**
   * Các tên thường dùng khác.
   *
   * Dùng cho search/matching.
   */
  aliases: string[];
}

/* =========================================================
   SPECIAL VALUES
========================================================= */

export const OTHER_SKILL_CODE =
  "other";

/* =========================================================
   SKILL CATEGORIES
========================================================= */

export const SKILL_CATEGORIES: SkillCategoryOption[] =
  [
    {
      code: "software-development",
      name: "Phát triển phần mềm",
      parentCode: null,
    },

    {
      code: "data-ai",
      name: "Dữ liệu & AI",
      parentCode: null,
    },

    {
      code: "it-infrastructure",
      name: "Hạ tầng & hệ thống",
      parentCode: null,
    },

    {
      code: "office-productivity",
      name: "Tin học văn phòng",
      parentCode: null,
    },

    {
      code: "accounting-finance",
      name: "Kế toán & Tài chính",
      parentCode: null,
    },

    {
      code: "sales",
      name: "Kinh doanh & Bán hàng",
      parentCode: null,
    },

    {
      code: "marketing",
      name: "Marketing",
      parentCode: null,
    },

    {
      code: "customer-service",
      name: "Chăm sóc khách hàng",
      parentCode: null,
    },

    {
      code: "human-resources",
      name: "Nhân sự",
      parentCode: null,
    },

    {
      code: "project-management",
      name: "Quản lý dự án",
      parentCode: null,
    },

    {
      code: "design-creative",
      name: "Thiết kế & Sáng tạo",
      parentCode: null,
    },

    {
      code: "engineering",
      name: "Kỹ thuật",
      parentCode: null,
    },

    {
      code: "construction",
      name: "Xây dựng",
      parentCode: null,
    },

    {
      code: "manufacturing",
      name: "Sản xuất",
      parentCode: null,
    },

    {
      code: "logistics-supply-chain",
      name: "Logistics & Chuỗi cung ứng",
      parentCode: null,
    },

    {
      code: "hospitality",
      name: "Nhà hàng & Khách sạn",
      parentCode: null,
    },

    {
      code: "education",
      name: "Giáo dục",
      parentCode: null,
    },

    {
      code: "healthcare",
      name: "Y tế & Chăm sóc sức khỏe",
      parentCode: null,
    },

    {
      code: "legal",
      name: "Pháp lý",
      parentCode: null,
    },

    {
      code: "soft-skills",
      name: "Kỹ năng mềm",
      parentCode: null,
    },
  ];

/* =========================================================
   SKILL CATALOG
========================================================= */

/**
 * Đây CHỈ là starter catalog cho frontend.
 *
 * Không có mục tiêu chứa toàn bộ kỹ năng
 * của thị trường lao động.
 *
 * Sau này database có thể chứa hàng nghìn skill.
 */
export const SKILL_CATALOG: SkillCatalogItem[] =
  [
    /* =====================================================
       SOFTWARE DEVELOPMENT
    ===================================================== */

    {
      code: "javascript",
      name: "JavaScript",
      categoryCode:
        "software-development",
      aliases: [
        "JS",
        "Javascript",
        "Java Script",
      ],
    },

    {
      code: "typescript",
      name: "TypeScript",
      categoryCode:
        "software-development",
      aliases: [
        "TS",
        "Typescript",
      ],
    },

    {
      code: "react",
      name: "React",
      categoryCode:
        "software-development",
      aliases: [
        "ReactJS",
        "React.js",
      ],
    },

    {
      code: "nodejs",
      name: "Node.js",
      categoryCode:
        "software-development",
      aliases: [
        "NodeJS",
        "Node",
      ],
    },

    {
      code: "csharp",
      name: "C#",
      categoryCode:
        "software-development",
      aliases: [
        "C Sharp",
        "CSharp",
      ],
    },

    {
      code: "dotnet",
      name: ".NET",
      categoryCode:
        "software-development",
      aliases: [
        "Dotnet",
        "ASP.NET",
        "ASP.NET Core",
      ],
    },

    {
      code: "java",
      name: "Java",
      categoryCode:
        "software-development",
      aliases: [],
    },

    {
      code: "python",
      name: "Python",
      categoryCode:
        "software-development",
      aliases: [],
    },

    {
      code: "sql",
      name: "SQL",
      categoryCode:
        "software-development",
      aliases: [
        "Structured Query Language",
      ],
    },

    {
      code: "git",
      name: "Git",
      categoryCode:
        "software-development",
      aliases: [
        "GitHub",
        "GitLab",
      ],
    },

    /* =====================================================
       DATA & AI
    ===================================================== */

    {
      code: "data-analysis",
      name: "Phân tích dữ liệu",
      categoryCode:
        "data-ai",
      aliases: [
        "Data Analysis",
        "Data Analytics",
      ],
    },

    {
      code: "machine-learning",
      name: "Machine Learning",
      categoryCode:
        "data-ai",
      aliases: [
        "ML",
        "Máy học",
      ],
    },

    {
      code: "power-bi",
      name: "Power BI",
      categoryCode:
        "data-ai",
      aliases: [
        "Microsoft Power BI",
      ],
    },

    /* =====================================================
       IT INFRASTRUCTURE
    ===================================================== */

    {
      code: "networking",
      name: "Mạng máy tính",
      categoryCode:
        "it-infrastructure",
      aliases: [
        "Networking",
        "Computer Networking",
      ],
    },

    {
      code: "linux",
      name: "Linux",
      categoryCode:
        "it-infrastructure",
      aliases: [],
    },

    {
      code: "docker",
      name: "Docker",
      categoryCode:
        "it-infrastructure",
      aliases: [
        "Containerization",
      ],
    },

    {
      code: "technical-support",
      name: "Hỗ trợ kỹ thuật",
      categoryCode:
        "it-infrastructure",
      aliases: [
        "Technical Support",
        "IT Support",
        "Helpdesk",
      ],
    },

    /* =====================================================
       OFFICE
    ===================================================== */

    {
      code: "microsoft-excel",
      name: "Microsoft Excel",
      categoryCode:
        "office-productivity",
      aliases: [
        "Excel",
        "MS Excel",
      ],
    },

    {
      code: "microsoft-word",
      name: "Microsoft Word",
      categoryCode:
        "office-productivity",
      aliases: [
        "Word",
        "MS Word",
      ],
    },

    {
      code: "microsoft-powerpoint",
      name: "Microsoft PowerPoint",
      categoryCode:
        "office-productivity",
      aliases: [
        "PowerPoint",
        "PPT",
      ],
    },

    /* =====================================================
       ACCOUNTING & FINANCE
    ===================================================== */

    {
      code: "financial-analysis",
      name: "Phân tích tài chính",
      categoryCode:
        "accounting-finance",
      aliases: [
        "Financial Analysis",
      ],
    },

    {
      code: "accounting",
      name: "Kế toán",
      categoryCode:
        "accounting-finance",
      aliases: [
        "Accounting",
      ],
    },

    {
      code: "bookkeeping",
      name: "Ghi sổ kế toán",
      categoryCode:
        "accounting-finance",
      aliases: [
        "Bookkeeping",
      ],
    },

    /* =====================================================
       SALES
    ===================================================== */

    {
      code: "sales",
      name: "Bán hàng",
      categoryCode:
        "sales",
      aliases: [
        "Sales",
        "Selling",
      ],
    },

    {
      code: "business-development",
      name: "Phát triển kinh doanh",
      categoryCode:
        "sales",
      aliases: [
        "Business Development",
        "BD",
      ],
    },

    {
      code: "negotiation",
      name: "Đàm phán",
      categoryCode:
        "sales",
      aliases: [
        "Negotiation",
      ],
    },

    /* =====================================================
       MARKETING
    ===================================================== */

    {
      code: "digital-marketing",
      name: "Digital Marketing",
      categoryCode:
        "marketing",
      aliases: [
        "Marketing số",
      ],
    },

    {
      code: "seo",
      name: "SEO",
      categoryCode:
        "marketing",
      aliases: [
        "Search Engine Optimization",
      ],
    },

    {
      code: "content-marketing",
      name: "Content Marketing",
      categoryCode:
        "marketing",
      aliases: [
        "Content",
      ],
    },

    {
      code: "social-media-marketing",
      name: "Social Media Marketing",
      categoryCode:
        "marketing",
      aliases: [
        "Social Media",
      ],
    },

    /* =====================================================
       CUSTOMER SERVICE
    ===================================================== */

    {
      code: "customer-service",
      name: "Chăm sóc khách hàng",
      categoryCode:
        "customer-service",
      aliases: [
        "Customer Service",
        "Customer Care",
        "CSKH",
      ],
    },

    {
      code: "customer-support",
      name: "Hỗ trợ khách hàng",
      categoryCode:
        "customer-service",
      aliases: [
        "Customer Support",
      ],
    },

    /* =====================================================
       HUMAN RESOURCES
    ===================================================== */

    {
      code: "recruitment",
      name: "Tuyển dụng",
      categoryCode:
        "human-resources",
      aliases: [
        "Recruitment",
        "Recruiting",
      ],
    },

    {
      code: "talent-acquisition",
      name: "Talent Acquisition",
      categoryCode:
        "human-resources",
      aliases: [
        "TA",
      ],
    },

    /* =====================================================
       PROJECT MANAGEMENT
    ===================================================== */

    {
      code: "project-management",
      name: "Quản lý dự án",
      categoryCode:
        "project-management",
      aliases: [
        "Project Management",
        "PM",
      ],
    },

    {
      code: "agile",
      name: "Agile",
      categoryCode:
        "project-management",
      aliases: [],
    },

    {
      code: "scrum",
      name: "Scrum",
      categoryCode:
        "project-management",
      aliases: [],
    },

    /* =====================================================
       DESIGN
    ===================================================== */

    {
      code: "adobe-photoshop",
      name: "Adobe Photoshop",
      categoryCode:
        "design-creative",
      aliases: [
        "Photoshop",
        "PS",
      ],
    },

    {
      code: "adobe-illustrator",
      name: "Adobe Illustrator",
      categoryCode:
        "design-creative",
      aliases: [
        "Illustrator",
        "AI",
      ],
    },

    {
      code: "figma",
      name: "Figma",
      categoryCode:
        "design-creative",
      aliases: [],
    },

    {
      code: "ui-ux-design",
      name: "UI/UX Design",
      categoryCode:
        "design-creative",
      aliases: [
        "UX/UI",
        "UI Design",
        "UX Design",
      ],
    },

    /* =====================================================
       ENGINEERING
    ===================================================== */

    {
      code: "autocad",
      name: "AutoCAD",
      categoryCode:
        "engineering",
      aliases: [
        "Auto CAD",
      ],
    },

    {
      code: "solidworks",
      name: "SolidWorks",
      categoryCode:
        "engineering",
      aliases: [
        "Solid Works",
      ],
    },

    {
      code: "electrical-engineering",
      name: "Kỹ thuật điện",
      categoryCode:
        "engineering",
      aliases: [
        "Electrical Engineering",
      ],
    },

    {
      code: "mechanical-engineering",
      name: "Kỹ thuật cơ khí",
      categoryCode:
        "engineering",
      aliases: [
        "Mechanical Engineering",
      ],
    },

    /* =====================================================
       CONSTRUCTION
    ===================================================== */

    {
      code: "construction-management",
      name: "Quản lý xây dựng",
      categoryCode:
        "construction",
      aliases: [
        "Construction Management",
      ],
    },

    {
      code: "quantity-surveying",
      name: "Dự toán xây dựng",
      categoryCode:
        "construction",
      aliases: [
        "Quantity Surveying",
        "QS",
      ],
    },

    /* =====================================================
       MANUFACTURING
    ===================================================== */

    {
      code: "quality-control",
      name: "Kiểm soát chất lượng",
      categoryCode:
        "manufacturing",
      aliases: [
        "Quality Control",
        "QC",
      ],
    },

    {
      code: "quality-assurance",
      name: "Đảm bảo chất lượng",
      categoryCode:
        "manufacturing",
      aliases: [
        "Quality Assurance",
        "QA",
      ],
    },

    /* =====================================================
       LOGISTICS
    ===================================================== */

    {
      code: "supply-chain-management",
      name: "Quản lý chuỗi cung ứng",
      categoryCode:
        "logistics-supply-chain",
      aliases: [
        "Supply Chain Management",
        "SCM",
      ],
    },

    {
      code: "warehouse-management",
      name: "Quản lý kho",
      categoryCode:
        "logistics-supply-chain",
      aliases: [
        "Warehouse Management",
      ],
    },

    {
      code: "inventory-management",
      name: "Quản lý tồn kho",
      categoryCode:
        "logistics-supply-chain",
      aliases: [
        "Inventory Management",
      ],
    },

    /* =====================================================
       HOSPITALITY
    ===================================================== */

    {
      code: "food-service",
      name: "Phục vụ nhà hàng",
      categoryCode:
        "hospitality",
      aliases: [
        "Food Service",
      ],
    },

    {
      code: "hotel-operations",
      name: "Vận hành khách sạn",
      categoryCode:
        "hospitality",
      aliases: [
        "Hotel Operations",
      ],
    },

    /* =====================================================
       EDUCATION
    ===================================================== */

    {
      code: "teaching",
      name: "Giảng dạy",
      categoryCode:
        "education",
      aliases: [
        "Teaching",
      ],
    },

    {
      code: "lesson-planning",
      name: "Lập kế hoạch bài giảng",
      categoryCode:
        "education",
      aliases: [
        "Lesson Planning",
      ],
    },

    /* =====================================================
       HEALTHCARE
    ===================================================== */

    {
      code: "patient-care",
      name: "Chăm sóc bệnh nhân",
      categoryCode:
        "healthcare",
      aliases: [
        "Patient Care",
      ],
    },

    {
      code: "clinical-care",
      name: "Chăm sóc lâm sàng",
      categoryCode:
        "healthcare",
      aliases: [
        "Clinical Care",
      ],
    },

    /* =====================================================
       LEGAL
    ===================================================== */

    {
      code: "legal-research",
      name: "Nghiên cứu pháp lý",
      categoryCode:
        "legal",
      aliases: [
        "Legal Research",
      ],
    },

    {
      code: "contract-review",
      name: "Rà soát hợp đồng",
      categoryCode:
        "legal",
      aliases: [
        "Contract Review",
      ],
    },

    /* =====================================================
       SOFT SKILLS
    ===================================================== */

    {
      code: "communication",
      name: "Giao tiếp",
      categoryCode:
        "soft-skills",
      aliases: [
        "Communication",
        "Communication Skills",
      ],
    },

    {
      code: "teamwork",
      name: "Làm việc nhóm",
      categoryCode:
        "soft-skills",
      aliases: [
        "Teamwork",
        "Team Work",
      ],
    },

    {
      code: "problem-solving",
      name: "Giải quyết vấn đề",
      categoryCode:
        "soft-skills",
      aliases: [
        "Problem Solving",
      ],
    },

    {
      code: "leadership",
      name: "Lãnh đạo",
      categoryCode:
        "soft-skills",
      aliases: [
        "Leadership",
      ],
    },

    {
      code: "time-management",
      name: "Quản lý thời gian",
      categoryCode:
        "soft-skills",
      aliases: [
        "Time Management",
      ],
    },

    {
      code: "critical-thinking",
      name: "Tư duy phản biện",
      categoryCode:
        "soft-skills",
      aliases: [
        "Critical Thinking",
      ],
    },

    {
      code: "adaptability",
      name: "Khả năng thích nghi",
      categoryCode:
        "soft-skills",
      aliases: [
        "Adaptability",
      ],
    },
  ];

/* =========================================================
   NORMALIZATION
========================================================= */

/**
 * Chuẩn hóa chuỗi phục vụ search frontend.
 *
 * Ví dụ:
 *
 * "Phân Tích Dữ Liệu"
 * ->
 * "phan tich du lieu"
 */
export const normalizeSkillSearchText = (
  value: string,
) => {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
};

/* =========================================================
   LOOKUP HELPERS
========================================================= */

export const getSkillByCode = (
  code: string,
) => {
  return SKILL_CATALOG.find(
    (skill) =>
      skill.code === code,
  );
};

export const getSkillCategoryByCode = (
  code: string,
) => {
  return SKILL_CATEGORIES.find(
    (category) =>
      category.code === code,
  );
};

export const getSkillName = (
  skillCode: string,
  customSkillName = "",
) => {
  if (
    skillCode ===
    OTHER_SKILL_CODE
  ) {
    return (
      customSkillName.trim() ||
      "Kỹ năng khác"
    );
  }

  return (
    getSkillByCode(
      skillCode,
    )?.name ??
    "Chưa chọn kỹ năng"
  );
};

export const getSkillCategoryName = (
  skillCode: string,
) => {
  const skill =
    getSkillByCode(
      skillCode,
    );

  if (!skill) {
    return "";
  }

  return (
    getSkillCategoryByCode(
      skill.categoryCode,
    )?.name ?? ""
  );
};

/* =========================================================
   SEARCH
========================================================= */

export const searchSkills = (
  query: string,
  limit = 10,
) => {
  const normalizedQuery =
    normalizeSkillSearchText(
      query,
    );

  if (!normalizedQuery) {
    return SKILL_CATALOG.slice(
      0,
      limit,
    );
  }

  return SKILL_CATALOG.filter(
    (skill) => {
      const name =
        normalizeSkillSearchText(
          skill.name,
        );

      const code =
        normalizeSkillSearchText(
          skill.code,
        );

      const aliases =
        skill.aliases.map(
          normalizeSkillSearchText,
        );

      return (
        name.includes(
          normalizedQuery,
        ) ||
        code.includes(
          normalizedQuery,
        ) ||
        aliases.some(
          (alias) =>
            alias.includes(
              normalizedQuery,
            ),
        )
      );
    },
  ).slice(0, limit);
};

/* =========================================================
   DUPLICATE / IDENTITY HELPERS
========================================================= */

export const getSkillIdentity = (
  skillCode: string,
  customSkillName = "",
) => {
  if (
    skillCode ===
    OTHER_SKILL_CODE
  ) {
    return `custom:${normalizeSkillSearchText(
      customSkillName,
    )}`;
  }

  return `catalog:${skillCode}`;
};