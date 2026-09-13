export type OnboardingStepId =
  | "personal"
  | "education"
  | "experience"
  | "skills"
  | "preferences"
  | "resume"
  | "privacy";

/* =========================================================
   PERSONAL INFO
========================================================= */

export interface PersonalInfo {
  fullName: string;

  email: string;

  phone: string;

  dateOfBirth: string;

  gender: string;

  province: string;

  district: string;

  address: string;

  bio: string;

  avatarUrl: string;
}

/* =========================================================
   EDUCATION
========================================================= */

export interface EducationItem {
  id: string;

  school: string;

  degree: string;

  major: string;

  location: string;

  startMonth: string;

  startYear: string;

  endMonth: string;

  endYear: string;

  isStudying: boolean;

  gpa: string;

  gpaScale:
    | ""
    | "4"
    | "10"
    | "100";

  achievements: string;

  description: string;
}

/* =========================================================
   EXPERIENCE
========================================================= */

export type EmploymentType =
  | ""
  | "full-time"
  | "part-time"
  | "internship"
  | "contract"
  | "freelance"
  | "temporary"
  | "volunteer";

export type WorkplaceType =
  | ""
  | "onsite"
  | "hybrid"
  | "remote";

export interface ExperienceItem {
  id: string;

  company: string;

  position: string;

  employmentType: EmploymentType;

  workplaceType: WorkplaceType;

  location: string;

  startMonth: string;

  startYear: string;

  endMonth: string;

  endYear: string;

  isCurrent: boolean;

  description: string;

  achievements: string;

  /**
   * Tạm thời Step 3 vẫn dùng string[].
   *
   * Khi thiết kế Candidate Experience domain/backend,
   * phần này sẽ được chuẩn hóa thành quan hệ
   * Experience <-> Skill thay vì lưu text tự do.
   */
  skillsUsed: string[];
}

/* =========================================================
   SKILL PROFICIENCY
========================================================= */

export type SkillLevel =
  | ""
  | "beginner"
  | "intermediate"
  | "advanced"
  | "proficient"
  | "expert";

/* =========================================================
   CANDIDATE SKILL
========================================================= */

/**
 * Kỹ năng mà Candidate sở hữu.
 *
 * Skill master chịu trách nhiệm lưu:
 * - tên chuẩn
 * - category
 * - aliases
 * - metadata
 *
 * CandidateSkill chỉ lưu:
 * - skill được chọn
 * - mức độ cá nhân
 * - số năm kinh nghiệm
 * - mức độ ưu tiên trên hồ sơ
 */
export interface CandidateSkillItem {
  id: string;

  /**
   * Business code ổn định của skill.
   *
   * Ví dụ:
   * javascript
   * react
   * microsoft-excel
   * customer-service
   * project-management
   *
   * "other" nếu skill chưa có
   * trong catalog.
   */
  skillCode: string;

  /**
   * Chỉ sử dụng khi:
   * skillCode === "other"
   *
   * Custom skill không tự động
   * được thêm vào master skill catalog.
   */
  customSkillName: string;

  /**
   * Mức độ tự đánh giá của Candidate.
   */
  level: SkillLevel;

  /**
   * Frontend dùng string để thuận tiện
   * khi xử lý input.
   *
   * Backend sau này sẽ validate và
   * chuyển sang numeric/decimal.
   */
  yearsOfExperience: string;

  /**
   * Đánh dấu skill nổi bật trên hồ sơ.
   *
   * UI hiện giới hạn tối đa 5.
   * Backend sau này cũng phải enforce.
   */
  isHighlighted: boolean;
}

/* =========================================================
   LANGUAGE PROFICIENCY
========================================================= */

export type LanguageProficiency =
  | ""
  | "basic"
  | "conversational"
  | "professional"
  | "fluent"
  | "native";

/* =========================================================
   LANGUAGE CERTIFICATE SCORE
========================================================= */

/**
 * Một thành phần điểm thuộc chứng chỉ.
 *
 * IELTS:
 * LISTENING = 7.0
 * READING = 6.5
 * WRITING = 6.0
 * SPEAKING = 6.5
 *
 * TOEIC L&R:
 * LISTENING = 450
 * READING = 400
 */
export interface LanguageCertificateScoreItem {
  id: string;

  /**
   * Business code ổn định.
   *
   * Ví dụ:
   * LISTENING
   * READING
   * WRITING
   * SPEAKING
   */
  componentCode: string;

  /**
   * Frontend giữ dạng string
   * để xử lý form.
   *
   * Backend chịu trách nhiệm
   * validate theo certificate type.
   */
  value: string;
}

/* =========================================================
   LANGUAGE CERTIFICATE
========================================================= */

export interface LanguageCertificateItem {
  id: string;

  /**
   * Business code của loại chứng chỉ.
   *
   * Ví dụ:
   * IELTS_ACADEMIC
   * IELTS_GENERAL
   * TOEIC_LR
   * TOEIC_SW
   * TOEFL_IBT
   * PTE_ACADEMIC
   * VSTEP
   * JLPT
   * TOPIK_I
   * TOPIK_II
   * HSK
   * DELF
   * DALF
   * GOETHE
   * DELE
   *
   * "other" nếu certificate
   * chưa có trong catalog.
   */
  certificateTypeCode: string;

  /**
   * Chỉ dùng khi:
   * certificateTypeCode === "other"
   */
  customCertificateName: string;

  /**
   * Level nếu certificate hỗ trợ.
   *
   * Ví dụ:
   * N3
   * TOPIK Level 4
   * HSK 5
   * B2
   * C1
   */
  level: string;

  /**
   * Điểm tổng nếu certificate
   * có overall/total score.
   */
  overallScore: string;

  /**
   * Điểm thành phần động.
   *
   * Không hard-code Listening,
   * Reading... trực tiếp vào model.
   */
  scores: LanguageCertificateScoreItem[];

  /**
   * YYYY-MM-DD
   */
  issuedDate: string;

  /**
   * YYYY-MM-DD
   *
   * Có thể rỗng nếu không áp dụng.
   */
  expiryDate: string;

  /**
   * Tổ chức/đơn vị cấp.
   */
  issuer: string;

  /**
   * Credential number nếu có.
   */
  credentialId: string;

  /**
   * URL xác minh nếu có.
   */
  verificationUrl: string;
}

/* =========================================================
   CANDIDATE LANGUAGE
========================================================= */

export interface CandidateLanguageItem {
  id: string;

  /**
   * Business code từ Language catalog.
   *
   * Ví dụ:
   * vi
   * en
   * zh
   * ja
   * ko
   * fr
   * de
   * es
   *
   * "other" nếu không có trong catalog.
   */
  languageCode: string;

  /**
   * Chỉ sử dụng khi:
   * languageCode === "other"
   */
  customLanguageName: string;

  overallLevel: LanguageProficiency;

  listeningLevel: LanguageProficiency;

  speakingLevel: LanguageProficiency;

  readingLevel: LanguageProficiency;

  writingLevel: LanguageProficiency;

  /**
   * Một ngôn ngữ có thể có
   * 0..N chứng chỉ.
   *
   * Ví dụ:
   *
   * English
   * ├── IELTS Academic
   * └── TOEIC Listening & Reading
   */
  certificates: LanguageCertificateItem[];
}

/* =========================================================
   CAREER PREFERENCES
========================================================= */

/**
 * Step 5 chưa chuẩn hóa.
 *
 * Khi làm Step 5 sẽ review riêng:
 * - employment status
 * - desired positions
 * - industries
 * - locations
 * - employment types
 * - workplace types
 * - salary
 * - availability
 * - relocation
 */
export interface CareerPreferences {
  employmentStatus: string;

  desiredPosition: string;

  industry: string;

  desiredLocation: string;

  employmentType: string;

  workplaceType: string;

  expectedSalaryMin: string;

  expectedSalaryMax: string;

  availableFrom: string;
}

/* =========================================================
   RESUME
========================================================= */

/**
 * Step 6 chưa chuẩn hóa.
 *
 * Sau này cần hỗ trợ:
 * - nhiều CV
 * - CV metadata
 * - version
 * - snapshot lúc apply
 * - default CV
 */
export interface ResumeInfo {
  resumeName: string;

  resumeUrl: string;

  hasExistingResume: boolean;

  createLater: boolean;
}

/* =========================================================
   PRIVACY
========================================================= */

/**
 * Step 7 sẽ review riêng
 * theo Privacy by Design.
 */
export interface PrivacySettings {
  searchableProfile: boolean;

  showEmail: boolean;

  showPhone: boolean;

  allowResumeDownload: boolean;

  allowJobMatching: boolean;
}

/* =========================================================
   COMPLETE ONBOARDING DATA
========================================================= */

export interface CandidateOnboardingData {
  personal: PersonalInfo;

  education: EducationItem[];

  experience: ExperienceItem[];

  skills: CandidateSkillItem[];

  languages: CandidateLanguageItem[];

  preferences: CareerPreferences;

  resume: ResumeInfo;

  privacy: PrivacySettings;
}

/* =========================================================
   ONBOARDING STEP
========================================================= */

export interface OnboardingStep {
  id: OnboardingStepId;

  number: number;

  title: string;

  description: string;
}