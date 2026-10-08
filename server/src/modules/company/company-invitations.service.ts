import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { CompanyInvitationDeliveryService } from "./company-invitation-delivery.service";
import { CompanyInvitationsRepository } from "./company-invitations.repository";
import type { CreateCompanyInvitationDto } from "./dto/create-company-invitation.dto";
import type { AcceptCompanyInvitationDto } from "./dto/accept-company-invitation.dto";

const INVITE_TTL_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

@Injectable()
export class CompanyInvitationsService {
  constructor(
    private readonly repo: CompanyInvitationsRepository,
    private readonly delivery: CompanyInvitationDeliveryService,
  ) {}

  list(companyId: string) { return this.repo.list(companyId); }

  async create(companyId: string, actorUserId: string, dto: CreateCompanyInvitationDto) {
    // Fail closed before any writes in this prototype. Never return raw token over HTTP.
    this.delivery.assertAvailable();
    const token = randomBytes(32).toString("base64url");
    const email = dto.email.trim().toLowerCase();
    const invitation = await this.repo.create({
      companyId,
      actorUserId,
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MILLISECONDS),
    });
    try {
      await this.delivery.send(email, token);
    } catch {
      // If a test/future adapter fails, revoke rather than leave an undeliverable live token.
      await this.repo.revokeAfterDeliveryFailure(companyId, invitation.id);
      throw new ServiceUnavailableException({
        code: "COMPANY_INVITATION_DELIVERY_FAILED",
        message: "Invitation delivery failed.",
      });
    }
    return invitation;
  }

  revoke(companyId: string, invitationId: string, actorUserId: string) {
    return this.repo.revoke(companyId, invitationId, actorUserId);
  }

  accept(actorUserId: string, dto: AcceptCompanyInvitationDto) {
    return this.repo.accept(actorUserId, hashToken(dto.token));
  }
}
