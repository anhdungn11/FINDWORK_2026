import { randomBytes, randomUUID } from "node:crypto";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { validateEnvironment } from "../src/config/env.validation";
import { EmailProviderService } from "../src/infrastructure/email/email-provider.service";

const base = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/findwork_test",
  JWT_ACCESS_SECRET: "test-jwt-secret-for-email-security-long-enough",
  REFRESH_TOKEN_PEPPER: "test-refresh-pepper-for-email-security-long-enough",
};
const key = randomBytes(32).toString("base64");

describe("Email delivery fail-closed crypto/config", () => {
  it("keeps delivery disabled by default", () => {
    expect(validateEnvironment(base).EMAIL_DELIVERY_MODE).toBe("disabled");
    expect(validateEnvironment(base).EMAIL_WORKER_ENABLED).toBe("false");
  });
  it("rejects enabling worker without real delivery", () => {
    expect(() => validateEnvironment({ ...base, EMAIL_WORKER_ENABLED: "true" })).toThrow();
  });
  it("rejects missing encryption key when explicitly enabled", () => {
    expect(() => validateEnvironment({ ...base, EMAIL_DELIVERY_MODE: "resend" })).toThrow();
  });
  it("does not allow HTTP verification link in production", () => {
    expect(() => validateEnvironment({ ...base, NODE_ENV: "production", EMAIL_DELIVERY_MODE: "resend",
      EMAIL_ACTIVE_KEY_ID: "k1", EMAIL_KEYRING_JSON: JSON.stringify({k1:key}),
      EMAIL_VERIFY_URL: "http://localhost:5173/verify", EMAIL_RESEND_API_KEY: "fake-only-1234567890",
      EMAIL_FROM: "no-reply@example.com" })).toThrow();
  });
  it("encrypt/decrypt roundtrip, rejects modified tag and incorrect AAD", () => {
    const setting = { activeKeyId: "k1", keyringJson: JSON.stringify({ k1: key }) } as EmailDeliverySettings;
    const crypto = new EmailCryptoService(setting);
    const job = randomUUID(); const token = randomUUID();
    const input = { version: 1, recipient: "a@example.test", rawToken: "secret" };
    const sealed = crypto.encrypt(job, "VERIFY_EMAIL", token, input);
    expect(crypto.decrypt(job, "VERIFY_EMAIL", token, sealed)).toEqual(input);
    expect(sealed.payloadCiphertext.toString("utf8")).not.toContain("secret");
    expect(() => crypto.decrypt(randomUUID(), "VERIFY_EMAIL", token, sealed)).toThrow();
    const modified = { ...sealed, payloadTag: Buffer.from(sealed.payloadTag) };
    modified.payloadTag[0] = (modified.payloadTag[0] ?? 0) ^ 1;
    expect(() => crypto.decrypt(job, "VERIFY_EMAIL", token, modified)).toThrow();
    expect(() => crypto.decrypt(job, "COMPANY_INVITATION", token, sealed)).toThrow();
  });
  it("supports decrypting an old key after active key rotation", () => {
    const oldKey = randomBytes(32).toString("base64");
    const newKey = randomBytes(32).toString("base64");
    const setting = { activeKeyId: "old", keyringJson: JSON.stringify({old: oldKey, next: newKey}) } as EmailDeliverySettings;
    const crypto = new EmailCryptoService(setting);
    const job = randomUUID(), token = randomUUID();
    const sealed = crypto.encrypt(job, "VERIFY_EMAIL", token, { a: 1 });
    const rotated = new EmailCryptoService({ activeKeyId: "next",
      keyringJson: JSON.stringify({ old: oldKey, next: newKey }) } as EmailDeliverySettings);
    expect(rotated.decrypt(job, "VERIFY_EMAIL", token, sealed)).toEqual({ a: 1 });
  });


  it("refuses all network requests when provider delivery is disabled", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("NO_NETWORK_ALLOWED"));
    try {
      const service = new EmailProviderService({ mode: "disabled" } as EmailDeliverySettings);
      await expect(service.sendVerification({
        to: "test@example.invalid", from: "test@example.invalid",
        verifyUrl: "https://example.invalid/verify?token=fake", idempotencyKey: "verify:test",
      })).rejects.toMatchObject({ errorCode: "PROVIDER_DISABLED", retryable: false });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });

  it("sends only the expected Resend HTTPS request with an idempotency key", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: "mock-provider-id" }),
    } as Response);
    try {
      const service = new EmailProviderService({ mode: "resend", resendApiKey: "fake-key-only" } as EmailDeliverySettings);
      const result = await service.sendVerification({
        to: "recipient@example.invalid", from: "sender@example.invalid",
        verifyUrl: "https://example.invalid/verify?token=fake", idempotencyKey: "verify:job123",
      });
      expect(result).toEqual({ providerMessageId: "mock-provider-id" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const args = fetchMock.mock.calls[0];
      expect(args?.[0]).toBe("https://api.resend.com/emails");
      expect(args?.[1]?.method).toBe("POST");
      expect(args?.[1]?.headers).toEqual(expect.objectContaining({ "Idempotency-Key": "verify:job123" }));
      const body = JSON.parse(String(args?.[1]?.body)) as Record<string, unknown>;
      expect(body.to).toEqual(["recipient@example.invalid"]);
      expect(body.from).toBe("sender@example.invalid");
    } finally { fetchMock.mockRestore(); }
  });

  it("classifies permanent and retryable Resend HTTP failures", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    try {
      const service = new EmailProviderService({ mode: "resend", resendApiKey: "fake-key-only" } as EmailDeliverySettings);
      for (const [status, retryable] of [[400, false], [429, true], [503, true]] as const) {
        fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) } as Response);
        await expect(service.sendVerification({
          to: "t@example.invalid", from: "s@example.invalid",
          verifyUrl: "https://example.invalid/verify?token=fake", idempotencyKey: "verify:test",
        })).rejects.toMatchObject({ errorCode: `HTTP_${status}`, retryable });
      }
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally { fetchMock.mockRestore(); }
  });

  it("distinguishes transient concurrent idempotency errors from 409 conflicts", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    try {
      const service = new EmailProviderService({ mode: "resend", resendApiKey: "fake-key-only" } as EmailDeliverySettings);
      for (const [name, retryable] of [["concurrent_idempotent_requests", true], ["idempotency_key_conflict", false]] as const) {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ name }) } as Response);
        await expect(service.sendVerification({
          to: "t@example.invalid", from: "s@example.invalid",
          verifyUrl: "https://example.invalid/verify?token=fake", idempotencyKey: "verify:test",
        })).rejects.toMatchObject({ errorCode: "HTTP_409", retryable });
      }
    } finally { fetchMock.mockRestore(); }
  });

  it("treats transport failure and malformed successful response as uncertain", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    try {
      const service = new EmailProviderService({ mode: "resend", resendApiKey: "fake-key-only" } as EmailDeliverySettings);
      const request = { to: "t@example.invalid", from: "s@example.invalid",
        verifyUrl: "https://example.invalid/verify?token=fake", idempotencyKey: "verify:test" };
      fetchMock.mockRejectedValueOnce(new Error("SIMULATED_TRANSPORT_FAILURE"));
      await expect(service.sendVerification(request)).rejects.toMatchObject({
        errorCode: "PROVIDER_TRANSPORT_UNCERTAIN", retryable: true,
      });
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response);
      await expect(service.sendVerification(request)).rejects.toMatchObject({
        errorCode: "PROVIDER_RESPONSE_UNCERTAIN", retryable: true,
      });
    } finally { fetchMock.mockRestore(); }
  });
});
