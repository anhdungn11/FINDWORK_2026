/** Shared public-safe Job shape for discovery and saved-job details. */
export const jobSelect = {
  id: true, companyId: true, categoryId: true, title: true, description: true,
  employmentType: true, workplaceType: true, experienceMinMonths: true,
  experienceMaxMonths: true, salaryMin: true, salaryMax: true, currency: true,
  salaryPeriod: true, salaryNegotiable: true, showSalary: true, status: true,
  publishedAt: true, applicationDeadline: true, expiresAt: true,
  version: true, createdAt: true, updatedAt: true,
  company: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, code: true, name: true } },
} as const;
