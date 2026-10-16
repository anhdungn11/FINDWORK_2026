/**
 * FINDWORK CP8B — TEST & DEVELOPMENT ONLY FIXTURES
 * 
 * CẢNH BÁO: Toàn bộ dữ liệu dưới đây CHỈ PHỤC VỤ CHO MỤC ĐÍCH UNIT TEST VÀ DEMO PREVIEW.
 * Tuyệt đối không import hay render như dữ liệu thật trong production route.
 */

import type {
  FullCandidateProfileRecord,
  OnboardingDraftSummary,
} from "../types/candidateProfile.types";

/** Fixture 1: Hồ sơ đầy đủ thông tin (Kỹ sư phần mềm 5 năm kinh nghiệm) */
export const MOCK_FIXTURE_FULL_PROFILE: FullCandidateProfileRecord = {
  id: "test-profile-uuid-001",
  userId: "test-user-uuid-101",
  fullName: "Trần Minh Hoàng",
  contactEmail: "hoang.tran.demo@example.invalid",
  isSampleData: true,
  phone: "0901234567",
  dateOfBirth: "1997-08-20",
  gender: "MALE",
  countryCode: "VN",
  provinceId: "prov-hn-01",
  wardId: "ward-cg-01",
  province: { id: "prov-hn-01", code: "01", name: "Hà Nội", divisionType: "Thành phố" },
  ward: { id: "ward-cg-01", code: "001", name: "Phường Dịch Vọng Hậu", divisionType: "Phường" },
  addressLine: "Tòa nhà Keangnam, Lô E6, Khu đô thị mới Cầu Giấy",
  bio: "Kỹ sư phần mềm Full-stack với hơn 5 năm kinh nghiệm xây dựng các hệ thống web và mobile hiệu năng cao.",
  avatarAssetKey: null,
  careerStatus: "LOOKING_FOR_JOB",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-10-14T09:30:00.000Z",

  education: [
    {
      id: "edu-01",
      school: "Đại học Bách Khoa Hà Nội",
      degree: "Kỹ sư",
      major: "Công nghệ Thông tin",
      location: "Hà Nội",
      startMonth: 9,
      startYear: 2015,
      endMonth: 6,
      endYear: 2020,
      isStudying: false,
      gpa: "3.62",
      gpaScale: "4",
      achievements: "Học bổng khuyến khích học tập 3 kỳ liên tiếp",
      description: "Chuyên sâu về công nghệ mạng máy tính và phát triển phần mềm doanh nghiệp.",
    },
  ],

  experience: [
    {
      id: "exp-01",
      companyName: "Công ty Cổ phần Công nghệ TechVina",
      position: "Senior Frontend Engineer",
      employmentType: "FULL_TIME",
      workplaceType: "HYBRID",
      location: "Hà Nội",
      startMonth: 7,
      startYear: 2022,
      endMonth: null,
      endYear: null,
      isCurrent: true,
      description: "Phụ trách kiến trúc giao diện các sản phẩm SaaS, tối ưu hóa hiệu năng render.",
      achievements: "Giảm 35% thời gian tải trang, tăng 20% tỷ lệ chuyển đổi người dùng.",
      skills: [
        { id: "es-01", skillName: "React" },
        { id: "es-02", skillName: "TypeScript" },
        { id: "es-03", skillName: "Next.js" },
      ],
    },
    {
      id: "exp-02",
      companyName: "FPT Software",
      position: "Frontend Developer",
      employmentType: "FULL_TIME",
      workplaceType: "ONSITE",
      location: "Hà Nội",
      startMonth: 8,
      startYear: 2020,
      endMonth: 6,
      endYear: 2022,
      isCurrent: false,
      description: "Xây dựng giao diện ứng dụng quản trị ngân hàng nội bộ theo thiết kế Figma.",
      achievements: "Hoàn thành dự án đúng hạn 100% không phát sinh lỗi nghiêm trọng.",
      skills: [
        { id: "es-04", skillName: "JavaScript" },
        { id: "es-05", skillName: "Vue.js" },
      ],
    },
  ],

  skills: [
    {
      id: "sk-01",
      skillName: "React & React Native",
      level: "EXPERT",
      yearsOfExperience: "5",
      isHighlighted: true,
    },
    {
      id: "sk-02",
      skillName: "TypeScript",
      level: "ADVANCED",
      yearsOfExperience: "4",
      isHighlighted: true,
    },
    {
      id: "sk-03",
      skillName: "Node.js & Express",
      level: "INTERMEDIATE",
      yearsOfExperience: "3",
      isHighlighted: false,
    },
  ],

  languages: [
    {
      id: "lang-01",
      languageName: "Tiếng Anh",
      overallLevel: "PROFESSIONAL",
      listeningLevel: "PROFESSIONAL",
      speakingLevel: "PROFESSIONAL",
      readingLevel: "FLUENT",
      writingLevel: "PROFESSIONAL",
      certificates: [
        {
          id: "cert-01",
          certificateName: "IELTS Academic",
          overallScore: "7.5",
          issuedDate: "2023-05-15",
          expiryDate: "2025-05-15",
          issuer: "IDP Education",
        },
      ],
    },
  ],

  careerPreference: {
    id: "pref-01",
    locationMode: "SELECTED",
    salaryType: "RANGE",
    salaryMin: 30000000,
    salaryMax: 45000000,
    currency: "VND",
    salaryPeriod: "MONTH",
    desiredCareerLevel: "SENIOR",
    availabilityType: "IMMEDIATELY",
    availableFrom: null,
    willingToRelocate: false,
    desiredPositions: ["Lead Frontend Developer", "Senior Frontend Engineer"],
    preferredCategories: ["IT - Phần mềm", "Công nghệ cao"],
    preferredLocations: [
      { id: "prov-hn-01", code: "01", name: "Hà Nội" },
    ],
    preferredEmploymentTypes: ["FULL_TIME"],
    preferredWorkplaceTypes: ["HYBRID", "REMOTE"],
  },

  privacySetting: {
    candidateProfileId: "test-profile-uuid-001",
    searchableProfile: false,
    showEmail: false,
    showPhone: false,
    allowResumeDownload: false,
    allowJobMatching: true,
  },
};

/** Fixture 2: Hồ sơ sinh viên / Fresher mới tốt nghiệp (Không có kinh nghiệm làm việc) */
export const MOCK_FIXTURE_FRESHER_PROFILE: FullCandidateProfileRecord = {
  id: "test-profile-uuid-002",
  userId: "test-user-uuid-102",
  fullName: "Lê Thu Hà",
  contactEmail: "ha.le.demo@example.invalid",
  isSampleData: true,
  phone: "0988776655",
  dateOfBirth: "2003-11-10",
  gender: "FEMALE",
  countryCode: "VN",
  provinceId: "prov-hcm-01",
  wardId: null,
  province: { id: "prov-hcm-01", code: "79", name: "TP. Hồ Chí Minh", divisionType: "Thành phố" },
  ward: null,
  addressLine: "Quận 1, TP. Hồ Chí Minh",
  bio: "Sinh viên mới tốt nghiệp ngành Marketing, năng động, ham học hỏi và mong muốn phát triển trong lĩnh vực Digital Marketing.",
  avatarAssetKey: null,
  careerStatus: "STUDENT",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-12T14:20:00.000Z",

  education: [
    {
      id: "edu-fresher-01",
      school: "Đại học Kinh tế TP. Hồ Chí Minh (UEH)",
      degree: "Cử nhân",
      major: "Marketing",
      location: "TP. Hồ Chí Minh",
      startMonth: 9,
      startYear: 2021,
      endMonth: 6,
      endYear: 2025,
      isStudying: false,
      gpa: "3.75",
      gpaScale: "4",
      achievements: "Giải Nhì cuộc thi Ý tưởng Khởi nghiệp sinh viên 2024",
      description: "Thực hiện đồ án tốt nghiệp về chiến lược Social Media cho thương hiệu bán lẻ.",
    },
  ],

  // Không có kinh nghiệm làm việc chính thức — minh chứng tính linh hoạt của hệ thống
  experience: [],

  skills: [
    {
      id: "sk-fresher-01",
      skillName: "Content Writing",
      level: "ADVANCED",
      yearsOfExperience: "1",
      isHighlighted: true,
    },
    {
      id: "sk-fresher-02",
      skillName: "Social Media Analytics",
      level: "INTERMEDIATE",
      yearsOfExperience: "1",
      isHighlighted: false,
    },
  ],

  languages: [
    {
      id: "lang-fresher-01",
      languageName: "Tiếng Anh",
      overallLevel: "CONVERSATIONAL",
      listeningLevel: "CONVERSATIONAL",
      speakingLevel: "CONVERSATIONAL",
      readingLevel: "PROFESSIONAL",
      writingLevel: "CONVERSATIONAL",
      certificates: [],
    },
  ],

  careerPreference: {
    id: "pref-fresher-01",
    locationMode: "SELECTED",
    salaryType: "RANGE",
    salaryMin: 9000000,
    salaryMax: 13000000,
    currency: "VND",
    salaryPeriod: "MONTH",
    desiredCareerLevel: "FRESHER",
    availabilityType: "IMMEDIATELY",
    availableFrom: null,
    willingToRelocate: false,
    desiredPositions: ["Junior Content Creator", "Marketing Executive"],
    preferredCategories: ["Marketing / Truyền thông / Quảng cáo"],
    preferredLocations: [
      { id: "prov-hcm-01", code: "79", name: "TP. Hồ Chí Minh" },
    ],
    preferredEmploymentTypes: ["FULL_TIME", "INTERNSHIP"],
    preferredWorkplaceTypes: ["ONSITE", "HYBRID"],
  },

  privacySetting: {
    candidateProfileId: "test-profile-uuid-002",
    searchableProfile: false,
    showEmail: false,
    showPhone: false,
    allowResumeDownload: false,
    allowJobMatching: true,
  },
};

/** Fixture 3: Bản tóm tắt nháp Onboarding có sẵn để Import */
export const MOCK_FIXTURE_DRAFT_SUMMARY: OnboardingDraftSummary = {
  version: 2,
  stepIndex: 6,
  updatedAt: "2026-10-14T15:00:00.000Z",
  fullName: "Phạm Quốc Bảo",
  contactEmail: "bao.pham.demo@example.invalid",
  isSampleData: true,
  phone: "0912999888",
  dateOfBirth: "2000-03-25",
  gender: "MALE",
  addressLine: "Số 45, Đường Lê Duẩn",
  provinceName: "Đà Nẵng",
  educationCount: 1,
  experienceCount: 1,
  skillsCount: 4,
  languagesCount: 1,
  hasPreferences: true,
  hasLocalAvatarFile: true, // Cảnh báo: File avatar blob chỉ có ở máy cục bộ
  hasLocalResumeFile: true, // Cảnh báo: File resume blob chỉ có ở máy cục bộ
};

/** Tạo bản sao sâu (deep clone) của hồ sơ mẫu để thao tác chỉnh sửa trong bộ nhớ không làm bẩn fixture gốc hoặc kịch bản khác */
export function cloneDemoProfileFixture(fixture: FullCandidateProfileRecord): FullCandidateProfileRecord {
  return {
    ...fixture,
    isSampleData: true,
    province: fixture.province ? { ...fixture.province } : null,
    ward: fixture.ward ? { ...fixture.ward } : null,
    education: (fixture.education || []).map((edu) => ({ ...edu })),
    experience: (fixture.experience || []).map((exp) => ({
      ...exp,
      skills: (exp.skills || []).map((s) => ({ ...s })),
    })),
    skills: (fixture.skills || []).map((sk) => ({ ...sk })),
    languages: (fixture.languages || []).map((lang) => ({
      ...lang,
      certificates: (lang.certificates || []).map((c) => ({ ...c })),
    })),
    careerPreference: fixture.careerPreference
      ? {
          ...fixture.careerPreference,
          desiredPositions: [...(fixture.careerPreference.desiredPositions || [])],
          preferredCategories: [...(fixture.careerPreference.preferredCategories || [])],
          preferredLocations: (fixture.careerPreference.preferredLocations || []).map((l) => ({ ...l })),
          preferredEmploymentTypes: [...(fixture.careerPreference.preferredEmploymentTypes || [])],
          preferredWorkplaceTypes: [...(fixture.careerPreference.preferredWorkplaceTypes || [])],
        }
      : null,
    privacySetting: fixture.privacySetting ? { ...fixture.privacySetting } : null,
  };
}

/** Tạo hồ sơ mô phỏng trong bộ nhớ từ bản nháp mẫu Phạm Quốc Bảo (không làm biến đổi kịch bản Full hay Fresher) */
export function buildSimulatedProfileFromDemoDraft(
  draftSummary: OnboardingDraftSummary = MOCK_FIXTURE_DRAFT_SUMMARY,
): FullCandidateProfileRecord {
  return {
    id: "demo-simulated-draft-profile",
    userId: "demo-simulated-draft-user",
    fullName: draftSummary.fullName || "Phạm Quốc Bảo",
    contactEmail: draftSummary.contactEmail || "bao.pham.demo@example.invalid",
    isSampleData: true,
    phone: draftSummary.phone || "0912999888",
    dateOfBirth: draftSummary.dateOfBirth || "2000-03-25",
    gender: "MALE",
    countryCode: "VN",
    provinceId: "prov-dn-01",
    wardId: null,
    province: {
      id: "prov-dn-01",
      code: "48",
      name: draftSummary.provinceName || "Đà Nẵng",
      divisionType: "Thành phố",
    },
    ward: null,
    addressLine: draftSummary.addressLine || "Số 45, Đường Lê Duẩn",
    bio: "Hồ sơ mẫu được mô phỏng chuyển giao trong bộ nhớ tạm từ bản nháp Onboarding (Phiên bản 2).",
    avatarAssetKey: null,
    careerStatus: "LOOKING_FOR_JOB",
    createdAt: draftSummary.updatedAt,
    updatedAt: new Date().toISOString(),
    education: [
      {
        id: "edu-draft-sim-01",
        school: "Đại học Bách Khoa — Đại học Đà Nẵng",
        degree: "Kỹ sư",
        major: "Kỹ thuật Phần mềm",
        location: "Đà Nẵng",
        startMonth: 9,
        startYear: 2018,
        endMonth: 6,
        endYear: 2023,
        isStudying: false,
        gpa: "3.50",
        gpaScale: "4",
        achievements: null,
        description: "Bản ghi học vấn mô phỏng từ bản nháp mẫu.",
      },
    ],
    experience: [
      {
        id: "exp-draft-sim-01",
        companyName: "DaNang Digital Lab (Demo)",
        position: "Full-stack Developer",
        employmentType: "FULL_TIME",
        workplaceType: "HYBRID",
        location: "Đà Nẵng",
        startMonth: 7,
        startYear: 2023,
        endMonth: null,
        endYear: null,
        isCurrent: true,
        description: "Kinh nghiệm mô phỏng từ bản nháp mẫu.",
        achievements: null,
        skills: [{ id: "es-draft-01", skillName: "TypeScript" }],
      },
    ],
    skills: [
      { id: "sk-draft-01", skillName: "TypeScript", level: "ADVANCED", yearsOfExperience: "2", isHighlighted: true },
      { id: "sk-draft-02", skillName: "React", level: "ADVANCED", yearsOfExperience: "2", isHighlighted: true },
      { id: "sk-draft-03", skillName: "Node.js", level: "INTERMEDIATE", yearsOfExperience: "2", isHighlighted: false },
      { id: "sk-draft-04", skillName: "PostgreSQL", level: "INTERMEDIATE", yearsOfExperience: "1", isHighlighted: false },
    ],
    languages: [
      {
        id: "lang-draft-01",
        languageName: "Tiếng Anh",
        overallLevel: "PROFESSIONAL",
        listeningLevel: "PROFESSIONAL",
        speakingLevel: "CONVERSATIONAL",
        readingLevel: "PROFESSIONAL",
        writingLevel: "PROFESSIONAL",
        certificates: [],
      },
    ],
    careerPreference: {
      id: "pref-draft-sim-01",
      locationMode: "SELECTED",
      salaryType: "RANGE",
      salaryMin: 18000000,
      salaryMax: 26000000,
      currency: "VND",
      salaryPeriod: "MONTH",
      desiredCareerLevel: "MID",
      availabilityType: "IMMEDIATELY",
      availableFrom: null,
      willingToRelocate: true,
      desiredPositions: ["Full-stack Engineer"],
      preferredCategories: ["IT - Phần mềm"],
      preferredLocations: [{ id: "prov-dn-01", code: "48", name: "Đà Nẵng" }],
      preferredEmploymentTypes: ["FULL_TIME"],
      preferredWorkplaceTypes: ["HYBRID", "REMOTE"],
    },
    privacySetting: {
      searchableProfile: false,
      showEmail: false,
      showPhone: false,
      allowResumeDownload: false,
      allowJobMatching: true,
    },
  };
}

/** Hồ sơ demo khởi tạo độc lập cho từng kịch bản preview (bản sao sâu). Kịch bản khác trả về null. */
export function createScenarioDemoProfile(previewParam: string | null): FullCandidateProfileRecord | null {
  if (previewParam === "full") return cloneDemoProfileFixture(MOCK_FIXTURE_FULL_PROFILE);
  if (previewParam === "fresher") return cloneDemoProfileFixture(MOCK_FIXTURE_FRESHER_PROFILE);
  return null;
}
