import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const KEY = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(pdf|png|jpg)$/i;

@Injectable()
export class CompanyLegalStorage {
  constructor(private readonly config: ConfigService) {}

  private async root() {
    const path = this.config.get<string>("COMPANY_MEDIA_STORAGE_DIR");
    if (!path || !isAbsolute(path)) throw new ServiceUnavailableException({ code: "COMPANY_LEGAL_STORAGE_UNAVAILABLE" });
    try {
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe root");
      await access(path, constants.R_OK | constants.W_OK);
    } catch { throw new ServiceUnavailableException({ code: "COMPANY_LEGAL_STORAGE_UNAVAILABLE" }); }
    return join(path, "legal");
  }

  validate(bytes: Buffer, claimedType: string) {
    if (!bytes.length || bytes.length > 10_485_760) throw new BadRequestException({ code: "COMPANY_LEGAL_FILE_SIZE_INVALID" });
    const pdf = bytes.length > 10 && bytes.subarray(0, 5).toString() === "%PDF-" &&
      bytes.subarray(Math.max(0, bytes.length - 1024)).includes(Buffer.from("%%EOF"));
    const png = bytes.length > 33 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
      bytes.toString("ascii", bytes.length - 8, bytes.length - 4) === "IEND";
    const jpg = bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
    const extension = pdf && claimedType === "application/pdf" ? "pdf" :
      png && claimedType === "image/png" ? "png" : jpg && claimedType === "image/jpeg" ? "jpg" : null;
    if (!extension) throw new BadRequestException({ code: "COMPANY_LEGAL_FILE_TYPE_INVALID" });
    return extension;
  }

  async put(companyId: string, bytes: Buffer, extension: string) {
    const root = await this.root();
    const key = `${companyId}/${randomUUID()}.${extension}`;
    const dir = join(root, companyId);
    try {
      await mkdir(root, { recursive: true, mode: 0o700 });
      await mkdir(dir, { recursive: true, mode: 0o700 });
      for (const p of [root, dir]) {
        const stat = await lstat(p);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe legal storage directory");
      }
      await writeFile(join(root, key), bytes, { flag: "wx", mode: 0o600 });
    } catch { throw new ServiceUnavailableException({ code: "COMPANY_LEGAL_STORAGE_UNAVAILABLE" }); }
    return { storageKey: key, sha256: createHash("sha256").update(bytes).digest("hex") };
  }

  async get(companyId: string, key: string, expectedHash: string) {
    const match = KEY.exec(key);
    if (!match || match[1]?.toLowerCase() !== companyId.toLowerCase()) {
      throw new ServiceUnavailableException({ code: "COMPANY_LEGAL_ASSET_UNAVAILABLE" });
    }
    const root = await this.root();
    try {
      for (const p of [root, join(root, companyId), join(root, key)]) {
        const stat = await lstat(p);
        if (stat.isSymbolicLink() || (p === join(root, key) ? !stat.isFile() || stat.size > 10_485_760 : !stat.isDirectory())) {
          throw new Error("Unsafe legal storage path");
        }
      }
      const bytes = await readFile(join(root, key));
      if (createHash("sha256").update(bytes).digest("hex") !== expectedHash) throw new Error("Hash mismatch");
      return bytes;
    } catch { throw new ServiceUnavailableException({ code: "COMPANY_LEGAL_ASSET_UNAVAILABLE" }); }
  }

  async remove(companyId: string, key: string) {
    const match = KEY.exec(key);
    if (!match || match[1]?.toLowerCase() !== companyId.toLowerCase()) return;
    const root = await this.root();
    for (const p of [root, join(root, companyId)]) {
      const stat = await lstat(p);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe legal storage directory");
    }
    await rm(join(root, key), { force: true });
  }
}
