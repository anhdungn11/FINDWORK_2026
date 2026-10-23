import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { CompanyProfileLocationsRepository } from "./company-profile-locations.repository";
import { CompanyMediaStorage, mediaTypeForKey, validateCompanyImage, type CompanyMediaKind } from "./company-media.storage";

function kindOf(value: string): CompanyMediaKind {
  if (value === "logo" || value === "cover") return value;
  throw new BadRequestException({ code: "COMPANY_MEDIA_KIND_INVALID", message: "Media kind must be logo or cover." });
}

@Injectable()
export class CompanyMediaService {
  private readonly logger = new Logger(CompanyMediaService.name);
  constructor(
    private readonly repo: CompanyProfileLocationsRepository,
    private readonly storage: CompanyMediaStorage,
  ) {}

  async get(companyId: string, rawKind: string) {
    const kind = kindOf(rawKind);
    const key = await this.repo.getPublicMediaKey(companyId, kind);
    const type = key ? mediaTypeForKey(key, companyId, kind) : null;
    if (!key || !type) throw new NotFoundException({
      code: "COMPANY_MEDIA_NOT_FOUND", message: "Company media was not found.",
    });
    try {
      return { bytes: await this.storage.get(key, companyId, kind), type };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({
        code: "COMPANY_MEDIA_ASSET_UNAVAILABLE", message: "Company media is temporarily unavailable.",
      });
    }
  }

  async upload(companyId: string, actorUserId: string, rawKind: string,
    file: { buffer: Buffer; mimetype: string } | undefined) {
    const kind = kindOf(rawKind);
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) throw new BadRequestException({
      code: "COMPANY_MEDIA_FILE_REQUIRED", message: "A file field is required.",
    });
    let type: ReturnType<typeof validateCompanyImage>;
    try { type = validateCompanyImage(file.buffer, file.mimetype, kind); }
    catch (error) {
      const code = error instanceof Error ? error.message : "COMPANY_MEDIA_TYPE_INVALID";
      throw new BadRequestException({ code, message: "Image type or size is invalid." });
    }
    const key = await this.storage.put(companyId, kind, type, file.buffer);
    let previousKey: string | null;
    try {
      ({ previousKey } = await this.repo.replaceMediaKey(companyId, actorUserId, kind, key));
    } catch (error) {
      await this.storage.remove(key, companyId, kind).catch(() => this.logger.warn("Could not remove uncommitted company image"));
      throw error;
    }
    if (previousKey) await this.storage.remove(previousKey, companyId, kind)
      .catch(() => this.logger.warn("Could not remove replaced company image"));
    return { kind, available: true };
  }

  async remove(companyId: string, actorUserId: string, rawKind: string) {
    const kind = kindOf(rawKind);
    await this.storage.ready();
    const { previousKey } = await this.repo.replaceMediaKey(companyId, actorUserId, kind, null);
    if (previousKey) await this.storage.remove(previousKey, companyId, kind)
      .catch(() => this.logger.warn("Could not remove detached company image"));
    return { kind, available: false };
  }
}
