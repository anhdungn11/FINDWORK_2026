import type {
  CandidateOnboardingData,
  OnboardingStep,
} from "@/features/candidate/types/onboarding.types";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "personal",
    number: 1,
    title: "Thông tin cá nhân",
    description: "Thông tin cơ bản và liên hệ của bạn",
  },
  {
    id: "education",
    number: 2,
    title: "Học vấn",
    description: "Trường học, chuyên ngành và trình độ",
  },
  {
    id: "experience",
    number: 3,
    title: "Kinh nghiệm",
    description: "Quá trình làm việc và kinh nghiệm thực tế",
  },
  {
    id: "skills",
    number: 4,
    title: "Kỹ năng & ngôn ngữ",
    description: "Kỹ năng chuyên môn và ngoại ngữ",
  },
  {
    id: "preferences",
    number: 5,
    title: "Định hướng nghề nghiệp",
    description: "Công việc và môi trường bạn đang tìm kiếm",
  },
  {
    id: "resume",
    number: 6,
    title: "CV & hồ sơ",
    description: "Chuẩn bị CV cho quá trình ứng tuyển",
  },
  {
    id: "privacy",
    number: 7,
    title: "Quyền riêng tư",
    description: "Kiểm soát dữ liệu được chia sẻ",
  },
];

export const INITIAL_ONBOARDING_DATA:
  CandidateOnboardingData = {
    personal: {
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      countryCode: "VN",
      provinceCode: "",
      wardCode: "",
      addressLine: "",
      bio: "",
      avatarUrl: "",
    },

    education: [],

    experience: [],

    skills: [],

    languages: [],

    preferences: {
      desiredPositions: [],
      preferredCategoryCodes: [],

      locationPreference: {
        mode: "selected",
        provinceCodes: [],
      },

      employmentTypes: [],
      workplaceTypes: [],

      salaryExpectation: {
        type: "range",
        min: null,
        max: null,
        currency: "VND",
        period: "month",
      },

      desiredCareerLevel: "",

      availability: {
        type: "",
        availableFrom: "",
      },

      willingToRelocate: false,
    },

    resume: {
      resumeName: "",
      resumeUrl: "",
      hasExistingResume: false,
      createLater: true,
    },

    privacy: {
      searchableProfile: false,
      showEmail: false,
      showPhone: false,
      allowResumeDownload: false,
      allowJobMatching: true,
    },
  };
