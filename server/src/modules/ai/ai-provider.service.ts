import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type Role = "user" | "assistant";
type ProviderMessage = { role: Role; content: string };

@Injectable()
export class AiProviderService {
  constructor(private readonly config: ConfigService) {}
  private unavailable(response: Response): never {
    const code = response.status === 401 || response.status === 403 ? "AI_PROVIDER_AUTH_INVALID"
      : response.status === 429 ? "AI_PROVIDER_RATE_LIMITED"
      : response.status >= 500 ? "AI_PROVIDER_UNAVAILABLE" : "AI_PROVIDER_REQUEST_REJECTED";
    // Never relay provider response bodies: they may contain request or account details.
    throw new ServiceUnavailableException({ code });
  }
  private settings() {
    const provider = this.config.get<string>("FINDWORK_AI_PROVIDER") ?? "openai";
    const key = this.config.get<string>("FINDWORK_AI_API_KEY");
    const model = this.config.get<string>("FINDWORK_AI_MODEL");
    const inputPrice = Number(this.config.get<string>("FINDWORK_AI_INPUT_USD_PER_MILLION"));
    const outputPrice = Number(this.config.get<string>("FINDWORK_AI_OUTPUT_USD_PER_MILLION"));
    if (provider !== "openai" || !key || !model || !Number.isFinite(inputPrice) || inputPrice <= 0 || inputPrice > 100 ||
      !Number.isFinite(outputPrice) || outputPrice <= 0 || outputPrice > 100) {
      throw new ServiceUnavailableException({ code: "AI_PROVIDER_NOT_CONFIGURED", message: "AI provider credentials, model and pricing are required." });
    }
    return { key, model, inputPrice, outputPrice };
  }
  pricing() { const { inputPrice, outputPrice } = this.settings(); return { inputPrice, outputPrice }; }
  modelName() { return this.settings().model; }
  isConfigured() { try { this.settings(); return true; } catch { return false; } }

  async generate(history: ProviderMessage[], prompt: string, image?: { bytes: Buffer; mimeType: string },
    options?: { instructions: string; maxOutputTokens: number }) {
    const { key, model } = this.settings();
    const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" }> =
      [{ type: "input_text", text: prompt }];
    if (image) content.push({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}`, detail: "low" });
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, store: false, max_output_tokens: options?.maxOutputTokens ?? 700,
          instructions: options?.instructions ?? "You are FINDWORK's career and recruitment assistant. Give practical, honest guidance. Do not claim access to private company, candidate, or job data. Do not request passwords, tax documents, or sensitive identity data. Reply in the user's language.",
          input: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content }] }),
      });
    } catch (error) { throw new ServiceUnavailableException({ code: error !== null && typeof error === "object" && "name" in error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE" }); }
    if (!response.ok) this.unavailable(response);
    let body: { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
      usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
    try { body = await response.json(); }
    catch { throw new ServiceUnavailableException({ code: "AI_PROVIDER_RESPONSE_INVALID" }); }
    const text = body.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "").join("\n").trim();
    if (!text || !body.usage || !Number.isInteger(body.usage.total_tokens)) {
      throw new ServiceUnavailableException({ code: "AI_PROVIDER_RESPONSE_INVALID" });
    }
    return { text, inputTokens: body.usage.input_tokens ?? 0, outputTokens: body.usage.output_tokens ?? 0,
      totalTokens: body.usage.total_tokens! };
  }

  async transcribe(bytes: Buffer) {
    const { key } = this.settings();
    const model = this.config.get<string>("FINDWORK_AI_TRANSCRIPTION_MODEL");
    if (!model) throw new ServiceUnavailableException({ code: "AI_TRANSCRIPTION_NOT_CONFIGURED" });
    const form = new FormData();
    form.append("model", model);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), "speech.wav");
    let response: Response;
    try { response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(30_000),
    }); } catch (error) { throw new ServiceUnavailableException({ code: error !== null && typeof error === "object" && "name" in error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE" }); }
    if (!response.ok) this.unavailable(response);
    let result: { text?: string };
    try { result = await response.json(); }
    catch { throw new ServiceUnavailableException({ code: "AI_PROVIDER_RESPONSE_INVALID" }); }
    if (!result.text || result.text.length > 8000) throw new ServiceUnavailableException({ code: "AI_PROVIDER_RESPONSE_INVALID" });
    return result.text;
  }
}
