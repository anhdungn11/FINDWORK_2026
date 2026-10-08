import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { EMAIL_VERIFICATION_TOKEN_PATTERN } from "./email-verification.constants";

/** Email-verification tokens are NOT JWTs and are NOT refresh-session secrets. */
@Injectable()
export class EmailVerificationTokenService {
  create(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString("base64url");
    return { rawToken, tokenHash: this.hash(rawToken) };
  }

  hash(rawToken: string): string {
    return createHash("sha256").update(rawToken, "utf8").digest("hex");
  }

  isWellFormed(rawToken: string): boolean {
    return EMAIL_VERIFICATION_TOKEN_PATTERN.test(rawToken);
  }
}
