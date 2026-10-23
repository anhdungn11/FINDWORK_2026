import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, lstat, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export type CompanyMediaKind = "logo" | "cover";
export type CompanyMediaType = "image/png" | "image/jpeg" | "image/webp";

const KEY = /^([0-9a-f-]{36})\/(logo|cover)\/([0-9a-f-]{36})\.(png|jpg|webp)$/i;
const EXTENSION: Record<CompanyMediaType, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
};

export function mediaTypeForKey(key: string, companyId: string, kind: CompanyMediaKind): CompanyMediaType | null {
  const match = KEY.exec(key);
  if (!match || match[1]?.toLowerCase() !== companyId.toLowerCase() || match[2] !== kind) return null;
  return match[4] === "png" ? "image/png" : match[4] === "jpg" ? "image/jpeg" : "image/webp";
}

export function validateCompanyImage(buffer: Buffer, claimedType: string, kind: CompanyMediaKind): CompanyMediaType {
  const maxBytes = kind === "logo" ? 1_048_576 : 2_097_152;
  if (buffer.length === 0 || buffer.length > maxBytes) throw new Error("COMPANY_MEDIA_SIZE_INVALID");
  let detected: CompanyMediaType | null = null;
  let width = 0;
  let height = 0;
  if (buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
      buffer.readUInt32BE(8) === 13 && buffer.toString("ascii", 12, 16) === "IHDR" &&
      buffer.toString("ascii", buffer.length - 8, buffer.length - 4) === "IEND") {
    detected = "image/png";
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 &&
      buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) {
    for (let offset = 2; offset + 9 < buffer.length;) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker) && length >= 7) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        detected = "image/jpeg";
        break;
      }
      offset += length + 2;
    }
  } else if (buffer.length >= 20 && buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP" && buffer.readUInt32LE(4) + 8 === buffer.length &&
      ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16))) {
    const variant = buffer.toString("ascii", 12, 16);
    if (variant === "VP8X" && buffer.length >= 30) {
      width = 1 + buffer.readUIntLE(24, 3);
      height = 1 + buffer.readUIntLE(27, 3);
    } else if (variant === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
      width = 1 + (buffer[21]! | ((buffer[22]! & 0x3f) << 8));
      height = 1 + ((buffer[22]! >> 6) | (buffer[23]! << 2) | ((buffer[24]! & 0x0f) << 10));
    } else if (variant === "VP8 " && buffer.length >= 30 &&
      buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      width = buffer.readUInt16LE(26) & 0x3fff;
      height = buffer.readUInt16LE(28) & 0x3fff;
    }
    if (width && height) detected = "image/webp";
  }
  if (!detected || detected !== claimedType) throw new Error("COMPANY_MEDIA_TYPE_INVALID");
  const dimensionLimit = kind === "logo" ? 2048 : 4096;
  if (width < 1 || height < 1 || width > dimensionLimit || height > dimensionLimit || width * height > 8_388_608) {
    throw new Error("COMPANY_MEDIA_DIMENSIONS_INVALID");
  }
  return detected;
}

/** Replaceable storage boundary. Only generated, company-scoped keys are accepted. */
export abstract class CompanyMediaStorage {
  abstract ready(): Promise<void>;
  abstract put(companyId: string, kind: CompanyMediaKind, type: CompanyMediaType, bytes: Buffer): Promise<string>;
  abstract get(key: string, companyId: string, kind: CompanyMediaKind): Promise<Buffer>;
  abstract remove(key: string, companyId: string, kind: CompanyMediaKind): Promise<void>;
}

@Injectable()
export class LocalCompanyMediaStorage extends CompanyMediaStorage {
  constructor(private readonly config: ConfigService) { super(); }

  private async root(requireWrite = false): Promise<string> {
    const root = this.config.get<string>("COMPANY_MEDIA_STORAGE_DIR");
    if (!root || !isAbsolute(root)) throw new ServiceUnavailableException({
      code: "COMPANY_MEDIA_STORAGE_UNAVAILABLE", message: "Company media storage is not configured.",
    });
    try {
      const stat = await lstat(root);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("unsafe storage root");
      await access(root, fsConstants.R_OK | (requireWrite ? fsConstants.W_OK : 0));
    } catch {
      throw new ServiceUnavailableException({
        code: "COMPANY_MEDIA_STORAGE_UNAVAILABLE", message: "Company media storage is unavailable.",
      });
    }
    return root;
  }

  async ready(): Promise<void> { await this.root(true); }

  async put(companyId: string, kind: CompanyMediaKind, type: CompanyMediaType, bytes: Buffer): Promise<string> {
    const root = await this.root(true);
    const key = `${companyId}/${kind}/${randomUUID()}.${EXTENSION[type]}`;
    const companyDirectory = join(root, companyId);
    const directory = join(companyDirectory, kind);
    const target = join(root, key);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await mkdir(companyDirectory, { recursive: true, mode: 0o700 });
      const companyStat = await lstat(companyDirectory);
      if (!companyStat.isDirectory() || companyStat.isSymbolicLink()) throw new Error("Unsafe company media directory");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const kindStat = await lstat(directory);
      if (!kindStat.isDirectory() || kindStat.isSymbolicLink()) throw new Error("Unsafe company media directory");
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
      await rename(temporary, target);
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw new ServiceUnavailableException({
        code: "COMPANY_MEDIA_STORAGE_UNAVAILABLE", message: "Company media storage is unavailable.",
      });
    }
    return key;
  }

  async get(key: string, companyId: string, kind: CompanyMediaKind): Promise<Buffer> {
    if (!mediaTypeForKey(key, companyId, kind)) throw new Error("Invalid company media key");
    const root = await this.root();
    for (const directory of [join(root, companyId), join(root, companyId, kind)]) {
      const stat = await lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe company media directory");
    }
    const target = join(root, key);
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_097_152) {
      throw new Error("Unsafe company media object");
    }
    return readFile(target);
  }

  async remove(key: string, companyId: string, kind: CompanyMediaKind): Promise<void> {
    if (!mediaTypeForKey(key, companyId, kind)) return;
    const root = await this.root(true);
    for (const directory of [join(root, companyId), join(root, companyId, kind)]) {
      const stat = await lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe company media directory");
    }
    await rm(join(root, key), { force: true });
  }
}
