import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import { AiProviderService } from "../src/modules/ai/ai-provider.service";
import { validateEnvironment } from "../src/config/env.validation";

const configured = {
  FINDWORK_AI_API_KEY: "unit-test-key-with-sufficient-length",
  FINDWORK_AI_MODEL: "unit-test-vision-model",
  FINDWORK_AI_INPUT_USD_PER_MILLION: "1",
  FINDWORK_AI_OUTPUT_USD_PER_MILLION: "2",
  FINDWORK_AI_TRANSCRIPTION_MODEL: "unit-test-transcription-model",
};
const provider = (settings: Record<string, string> = configured) => new AiProviderService({
  get: (name: string) => settings[name],
} as ConfigService);

describe("OpenAI AI provider adapter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("rejects partial or unsupported AI configuration at API startup", () => {
    const base = { NODE_ENV: "test", DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/findwork_test",
      JWT_ACCESS_SECRET: "unit-test-access-secret-with-at-least-thirty-two", REFRESH_TOKEN_PEPPER: "unit-test-refresh-secret-with-at-least-thirty-two" };
    expect(() => validateEnvironment({ ...base })).not.toThrow();
    expect(() => validateEnvironment({ ...base, FINDWORK_AI_API_KEY: "test-only-key-with-no-model" })).toThrow("FINDWORK_AI_MODEL");
    expect(() => validateEnvironment({ ...base, ...configured, FINDWORK_AI_PROVIDER: "gemini" })).toThrow("FINDWORK_AI_PROVIDER");
    expect(() => validateEnvironment({ ...base, ...configured, FINDWORK_AI_INPUT_USD_PER_MILLION: "0" })).toThrow("FINDWORK_AI_INPUT_USD_PER_MILLION");
    expect(validateEnvironment({ ...base, ...configured }).FINDWORK_AI_PROVIDER).toBe("openai");
  });

  it("rejects missing credentials before making an outbound request", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    await expect(provider({}).generate([], "Hello")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unsupported provider configuration without making a request", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    await expect(provider({ ...configured, FINDWORK_AI_PROVIDER: "gemini" }).generate([], "Hello"))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    [401, "AI_PROVIDER_AUTH_INVALID"], [403, "AI_PROVIDER_AUTH_INVALID"],
    [429, "AI_PROVIDER_RATE_LIMITED"], [503, "AI_PROVIDER_UNAVAILABLE"],
    [400, "AI_PROVIDER_REQUEST_REJECTED"],
  ])("maps provider HTTP %i to safe %s without relaying its body", async (status, code) => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("secret provider detail", { status }));
    try { await provider().generate([], "Hello"); throw new Error("Expected provider failure"); }
    catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({ code });
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain("secret provider detail");
    }
  });

  it("reports a provider timeout without leaking the underlying message", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("private timeout context", "TimeoutError"));
    try { await provider().generate([], "Hello"); throw new Error("Expected timeout"); }
    catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({ code: "AI_PROVIDER_TIMEOUT" });
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain("private timeout context");
    }
  });

  it("sends owned text history and actual image bytes to Responses without provider retention", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: "Interview guidance" }] }],
      usage: { input_tokens: 12, output_tokens: 3, total_tokens: 15 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const image = Buffer.from("real-image-bytes");
    const result = await provider().generate([{ role: "user", content: "Earlier question" }],
      "Describe this CV image", { bytes: image, mimeType: "image/png" });
    expect(result).toEqual({ text: "Interview guidance", inputTokens: 12, outputTokens: 3, totalTokens: 15 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ model: configured.FINDWORK_AI_MODEL, store: false, max_output_tokens: 700 });
    expect(body.input[0]).toEqual({ role: "user", content: "Earlier question" });
    expect(body.input[1].content[1]).toEqual({ type: "input_image",
      image_url: `data:image/png;base64,${image.toString("base64")}`, detail: "low" });
  });

  it("submits WAV bytes to the transcription endpoint and returns provider text", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ text: "Apply for this role" }),
      { status: 200, headers: { "Content-Type": "application/json" } }));
    const result = await provider().transcribe(Buffer.from("RIFF-test-WAVE"));
    expect(result).toBe("Apply for this role");
    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get("model")).toBe(configured.FINDWORK_AI_TRANSCRIPTION_MODEL);
    expect(((options?.body as FormData).get("file") as Blob).size).toBe(14);
  });
});
