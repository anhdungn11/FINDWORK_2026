import { EmailProviderError, EmailProviderService } from "../src/infrastructure/email/email-provider.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";

describe("Resend invitation template v1 (mocked fetch only)", () => {
  const settings = {
    mode: "resend", resendApiKey: "fake-test-key", assertInvitationWorkerReady: jest.fn(),
  } as unknown as EmailDeliverySettings;
  const provider = new EmailProviderService(settings);
  const input = {
    from: "FINDWORK <invite@example.invalid>", to: "member@example.invalid",
    acceptUrl: "https://example.invalid/company-invitations/accept#token=test-secret",
    idempotencyKey: "invite:00000000-0000-0000-0000-000000000001",
  };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: "mock-message-id" }),
    } as Response);
  });
  afterEach(() => fetchSpy.mockRestore());

  it("renders stable, separate invitation HTML and text across retries", async () => {
    await provider.sendInvitation(input);
    await provider.sendInvitation(input);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const first = fetchSpy.mock.calls[0]![1]!;
    const second = fetchSpy.mock.calls[1]![1]!;
    expect(Buffer.from(first.body as string).equals(Buffer.from(second.body as string))).toBe(true);
    expect((first.headers as Record<string, string>)["Idempotency-Key"]).toBe(input.idempotencyKey);
    const body = JSON.parse(first.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      from: input.from, to: [input.to], subject: "Invitation to join a company on FINDWORK",
      text: `You have been invited to join a company on FINDWORK.\n\nOpen this link to review and accept the invitation:\n${input.acceptUrl}\n\nSign in with the invited email address. If you did not expect this invitation, you can ignore this message.`,
      html: `<p>You have been invited to join a company on FINDWORK.</p><p><a href="${input.acceptUrl}">Review invitation</a></p><p>Sign in with the invited email address. If you did not expect this invitation, you can ignore this message.</p>`,
    });
    expect(body.html).not.toContain("Verify your FINDWORK email");
  });

  it("retries concurrent idempotent requests with identical request bytes", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 409,
      json: async () => ({ name: "concurrent_idempotent_requests" }) } as Response);
    await expect(provider.sendInvitation(input)).rejects.toMatchObject({ errorCode: "HTTP_409", retryable: true });
    await expect(provider.sendInvitation(input)).resolves.toEqual({ providerMessageId: "mock-message-id" });
    const first = fetchSpy.mock.calls[0]![1]!;
    const second = fetchSpy.mock.calls[1]![1]!;
    expect(Buffer.from(first.body as string).equals(Buffer.from(second.body as string))).toBe(true);
    expect(first.headers).toEqual(second.headers);
  });

  it("treats a changed idempotent request as terminal", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 409,
      json: async () => ({ name: "invalid_idempotent_request" }) } as Response);
    await expect(provider.sendInvitation(input)).rejects.toMatchObject({ errorCode: "HTTP_409", retryable: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("classifies rate limiting and permanent rejection without response-body logging", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ name: "rate_limit_exceeded" }) } as Response);
    await expect(provider.sendInvitation(input)).rejects.toMatchObject({ errorCode: "HTTP_429", retryable: true });
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ name: "validation_error" }) } as Response);
    await expect(provider.sendInvitation(input)).rejects.toMatchObject({ errorCode: "HTTP_422", retryable: false });
    expect(EmailProviderError).toBeDefined();
  });
});
