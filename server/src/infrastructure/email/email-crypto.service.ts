import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { EmailDeliverySettings } from "./email-delivery-settings.service";

export interface SealedPayload {
  payloadCiphertext: Buffer;
  payloadNonce: Buffer;
  payloadTag: Buffer;
  encryptionKeyId: string;
}

/** Bind all ciphertext to its immutable database reference and purpose. */
function associatedData(jobId: string, kind: string, referenceId: string): Buffer {
  return Buffer.from(JSON.stringify(["findwork-outbox-v1", jobId, kind, referenceId]), "utf8");
}

@Injectable()
export class EmailCryptoService {
  constructor(private readonly settings: EmailDeliverySettings) {}

  private getKey(id: string): Buffer {
    let ring: unknown;
    try { ring = JSON.parse(this.settings.keyringJson); } catch { throw new Error("EMAIL_KEYRING_INVALID"); }
    if (!ring || typeof ring !== "object" || Array.isArray(ring)) throw new Error("EMAIL_KEYRING_INVALID");
    const encoded = (ring as Record<string, unknown>)[id];
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
      throw new Error("EMAIL_KEY_UNAVAILABLE");
    }
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32 || key.toString("base64") !== encoded) throw new Error("EMAIL_KEY_INVALID");
    return key;
  }

  assertKeyAvailable(keyId: string): void {
    this.getKey(keyId);
  }

  assertReady(): void {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(this.settings.activeKeyId)) throw new Error("EMAIL_ACTIVE_KEY_INVALID");
    this.assertKeyAvailable(this.settings.activeKeyId);
  }

  encrypt(jobId: string, kind: string, referenceId: string, payload: unknown): SealedPayload {
    this.assertReady();
    const keyId = this.settings.activeKeyId;
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.getKey(keyId), nonce);
    cipher.setAAD(associatedData(jobId, kind, referenceId));
    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      payloadCiphertext: ciphertext,
      payloadNonce: nonce,
      payloadTag: cipher.getAuthTag(),
      encryptionKeyId: keyId,
    };
  }

  decrypt(jobId: string, kind: string, referenceId: string, sealed: SealedPayload): unknown {
    if (sealed.payloadNonce.length !== 12 || sealed.payloadTag.length !== 16 || !sealed.payloadCiphertext.length) {
      throw new Error("EMAIL_PAYLOAD_INVALID");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.getKey(sealed.encryptionKeyId), sealed.payloadNonce);
    decipher.setAAD(associatedData(jobId, kind, referenceId));
    decipher.setAuthTag(sealed.payloadTag);
    const plaintext = Buffer.concat([decipher.update(sealed.payloadCiphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as unknown;
  }
}
