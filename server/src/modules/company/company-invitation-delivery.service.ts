import { Injectable, ServiceUnavailableException } from "@nestjs/common";

/**
 * Phase 4.3C.1 deliberately has no production delivery adapter.
 * Refuse HTTP creation BEFORE persisting an invitation when no transport is wired.
 * Tests override this provider with an in-memory collector; 4.3C.2 adds real delivery/outbox.
 */
@Injectable()
export class CompanyInvitationDeliveryService {
  assertAvailable(): void {
    throw new ServiceUnavailableException({
      code: "COMPANY_INVITATION_DELIVERY_UNAVAILABLE",
      message: "Invitation delivery is not configured.",
    });
  }

  async send(_recipientEmail: string, _token: string): Promise<void> {
    this.assertAvailable();
  }
}
