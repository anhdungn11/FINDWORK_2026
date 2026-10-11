import type { CompanyInvitationsRepository } from "../modules/company/company-invitations.repository";

const BATCH_SIZE = 25;
const NORMAL_INTERVAL_MS = 30_000;
const FULL_BATCH_INTERVAL_MS = 250;
const MAX_FAILURE_INTERVAL_MS = 15 * 60_000;

export type CleanupResult = "not-due" | "idle" | "more" | "failed";

/** Runs only in invitation maintenance; never gates verification delivery. */
export class InvitationCleanupScheduler {
  private nextAt = 0;
  private failureCount = 0;

  constructor(
    private readonly invitations: Pick<CompanyInvitationsRepository, "cleanupExpired">,
    private readonly onFailure: () => void,
    private readonly now: () => number = Date.now,
  ) {}

  async runDue(): Promise<CleanupResult> {
    if (this.now() < this.nextAt) return "not-due";
    try {
      const scanned = await this.invitations.cleanupExpired(BATCH_SIZE);
      this.failureCount = 0;
      this.nextAt = this.now() + (scanned === BATCH_SIZE ? FULL_BATCH_INTERVAL_MS : NORMAL_INTERVAL_MS);
      return scanned === BATCH_SIZE ? "more" : "idle";
    } catch {
      // Never report exception text: database errors can contain connection URLs or payloads.
      this.failureCount += 1;
      const delay = Math.min(MAX_FAILURE_INTERVAL_MS,
        NORMAL_INTERVAL_MS * 2 ** Math.min(this.failureCount - 1, 5));
      this.nextAt = this.now() + delay;
      this.onFailure();
      return "failed";
    }
  }
}
