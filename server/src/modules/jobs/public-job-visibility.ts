import type { Prisma } from "../../generated/prisma/client";

/** Shared public availability rule for job search and company discovery. */
export function publicJobVisibility(now: Date): Prisma.JobWhereInput {
  return {
    status: "PUBLISHED",
    category: { isActive: true },
    publishedAt: { lte: now },
    AND: [
      { OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}
