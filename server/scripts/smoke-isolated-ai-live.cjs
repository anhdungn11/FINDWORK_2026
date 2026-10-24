// One controlled real-provider text request. Does not register users or log prompts, tokens or replies.
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const dotenv = require("dotenv");
const base = "http://127.0.0.1:3002/api/v1";
const env = dotenv.parse(readFileSync(resolve(__dirname, "..", ".env.employer-media.local")));
if (process.argv.slice(2).join(" ") !== "--live" || process.env.FINDWORK_AI_SMOKE_ALLOW_LIVE !== "YES") {
  throw new Error("Run with --live and FINDWORK_AI_SMOKE_ALLOW_LIVE=YES after provider configuration");
}
if (!env.FINDWORK_AI_API_KEY || !env.FINDWORK_AI_MODEL ||
    !env.FINDWORK_AI_INPUT_USD_PER_MILLION || !env.FINDWORK_AI_OUTPUT_USD_PER_MILLION ||
    (env.FINDWORK_AI_PROVIDER && env.FINDWORK_AI_PROVIDER !== "openai")) {
  throw new Error("LIVE_AI_BLOCKED: server-only OpenAI key, model and pricing are required");
}
const inputPrice = Number(env.FINDWORK_AI_INPUT_USD_PER_MILLION);
const outputPrice = Number(env.FINDWORK_AI_OUTPUT_USD_PER_MILLION);
const reserveCost = Math.ceil(8300 * inputPrice + 700 * outputPrice);
const ceiling = Number(process.env.FINDWORK_AI_SMOKE_MAX_COST_MICROS);
const hasBearer = !!process.env.FINDWORK_AI_SMOKE_BEARER;
if (!Number.isFinite(reserveCost) || !Number.isInteger(ceiling) || ceiling < reserveCost ||
    ceiling > (hasBearer ? 20_000 : 3_000)) {
  throw new Error("LIVE_AI_BLOCKED: explicit smoke cost ceiling must cover one reservation within the account budget");
}

async function call(method, path, headers, json) {
  const response = await fetch(base + path, { method, headers: {
    ...headers, ...(json && { "Content-Type": "application/json" }),
  }, ...(json && { body: JSON.stringify(json) }), signal: AbortSignal.timeout(35_000) });
  const body = await response.json();
  return { status: response.status, body };
}

async function main() {
  const health = await call("GET", "/health", {});
  if (health.status !== 200 || health.body.database !== "up") throw new Error("LIVE_AI_BLOCKED: isolated backend health failed");
  const headers = {};
  if (hasBearer) headers.Authorization = `Bearer ${process.env.FINDWORK_AI_SMOKE_BEARER}`;
  else if (process.env.FINDWORK_AI_SMOKE_GUEST_TOKEN) {
    headers["X-Findwork-Guest-Token"] = process.env.FINDWORK_AI_SMOKE_GUEST_TOKEN;
  } else {
    const guest = await call("POST", "/ai/guest-sessions", {});
    if (guest.status !== 201 || !guest.body.token) throw new Error(`LIVE_AI_BLOCKED: guest session HTTP ${guest.status} ${guest.body.code ?? ""}`);
    headers["X-Findwork-Guest-Token"] = guest.body.token;
  }
  const conversation = await call("POST", "/ai/conversations", headers);
  if (conversation.status !== 201 || !conversation.body.id) {
    throw new Error(`LIVE_AI_BLOCKED: conversation HTTP ${conversation.status} ${conversation.body.code ?? ""}`);
  }
  const id = conversation.body.id;
  try {
    const reply = await call("POST", `/ai/conversations/${id}/messages`, headers,
      { content: "Give one brief job interview preparation tip in Vietnamese." });
    if (reply.status !== 201 && reply.status !== 200) {
      throw new Error(`LIVE_AI_BLOCKED: provider response HTTP ${reply.status} ${reply.body.code ?? ""}`);
    }
    const assistant = reply.body.assistant;
    const history = await call("GET", `/ai/conversations/${id}/messages`, headers);
    if (typeof assistant?.content !== "string" || !assistant.content.trim() ||
        !Number.isInteger(reply.body.usage?.totalTokens) || reply.body.usage.totalTokens < 1 ||
        history.status !== 200 || !history.body.some((row) => row.id === assistant.id)) {
      throw new Error("LIVE_AI_BLOCKED: assistant content, usage or persisted history invalid");
    }
    console.log(JSON.stringify({ status: "LIVE_AI_TEXT_PASS", http: reply.status,
      assistantCharacters: assistant.content.length, totalTokens: reply.body.usage.totalTokens,
      estimatedCostMicros: reply.body.usage.estimatedCostMicros }));
  } finally {
    const removed = await call("DELETE", `/ai/conversations/${id}`, headers);
    if (removed.status !== 200) console.error(`Smoke conversation cleanup HTTP ${removed.status}`);
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "LIVE_AI_BLOCKED"); process.exitCode = 1; });
