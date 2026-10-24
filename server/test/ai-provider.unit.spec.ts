import { ConfigService } from "@nestjs/config";
import { ServiceUnavailableException } from "@nestjs/common";
import { AiProviderService } from "../src/modules/ai/ai-provider.service";

const configured = {
  FINDWORK_AI_API_KEY: "unit-test-key",
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

  it("rejects missing credentials before making an outbound request", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    await expect(provider({}).generate([], "Hello")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
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
