import { BadRequestException, Injectable } from "@nestjs/common";
import { basename } from "node:path";
import { CompanyProfileLocationsRepository } from "./company-profile-locations.repository";
import { CompanyLegalStorage } from "./company-legal.storage";
import type { UpdateCompanyLegalDto, LegalEvidenceUploadDto } from "./dto/company-legal.dto";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class CompanyLegalService {
  constructor(private readonly repo: CompanyProfileLocationsRepository, private readonly storage: CompanyLegalStorage,
    private readonly db: PrismaService) {}
  get(companyId: string) { return this.repo.getLegalProfile(companyId); }
  update(companyId: string, actorUserId: string, dto: UpdateCompanyLegalDto) {
    return this.repo.updateLegalProfile(companyId, actorUserId, dto);
  }
  async upload(companyId: string, actorUserId: string, dto: LegalEvidenceUploadDto,
    file?: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) throw new BadRequestException({ code: "COMPANY_LEGAL_FILE_REQUIRED" });
    const extension = this.storage.validate(file.buffer, file.mimetype);
    const originalName = basename(file.originalname || `evidence.${extension}`).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
    // Check authorization and state before writing bytes, then check again inside the metadata transaction.
    await this.repo.assertLegalWritable(companyId, actorUserId);
    const stored = await this.storage.put(companyId, file.buffer, extension);
    try {
      return await this.repo.addLegalEvidence(companyId, actorUserId, { kind: dto.kind, originalName,
        mimeType: file.mimetype, byteSize: file.buffer.length, ...stored });
    } catch (error) {
      await this.storage.remove(companyId, stored.storageKey).catch(() => undefined);
      throw error;
    }
  }
  async remove(companyId: string, evidenceId: string, actorUserId: string) {
    const record = await this.repo.getLegalEvidence(companyId, evidenceId);
    const removed = await this.repo.removeLegalEvidence(companyId, evidenceId, actorUserId);
    await this.storage.remove(companyId, record.storageKey);
    return removed;
  }
  async download(companyId: string, evidenceId: string) {
    const record = await this.repo.getLegalEvidence(companyId, evidenceId);
    return { bytes: await this.storage.get(companyId, record.storageKey, record.sha256), mimeType: record.mimeType };
  }
  auditDownload(actorUserId: string, companyId: string, evidenceId: string) {
    return this.db.auditLog.create({ data: { actorUserId, companyId, action: "admin.company.legal.evidence.download",
      targetType: "CompanyLegalEvidence", targetId: evidenceId } });
  }
}
