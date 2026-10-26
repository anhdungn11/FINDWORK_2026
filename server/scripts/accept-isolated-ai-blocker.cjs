// Real HTTP check: missing provider credentials must never produce a fake AI reply.
const base = process.env.FINDWORK_ACCEPTANCE_API_BASE || "http://127.0.0.1:3002/api/v1";
const parsed = new URL(base);
if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" ||
    !["3002", "3003"].includes(parsed.port) || parsed.pathname !== "/api/v1") {
  throw new Error("Only an expected loopback acceptance API may be tested");
}
async function call(method, route, token, content) {
  const response = await fetch(base + route, { method,
    headers: { Origin: "http://127.0.0.1:5177", ...(token && { "X-Findwork-Guest-Token": token }),
      ...(content && { "Content-Type": "application/json" }) },
    ...(content && { body: JSON.stringify(content) }) });
  return { status: response.status, body: await response.json() };
}
async function main() {
  const guest = await call("POST", "/ai/guest-sessions");
  if (guest.status !== 201 || !guest.body.token) throw new Error(`guest session HTTP ${guest.status} ${guest.body.code ?? ""}`);
  const token = guest.body.token;
  const conversation = await call("POST", "/ai/conversations", token);
  if (conversation.status !== 201 || !conversation.body.id) throw new Error(`conversation HTTP ${conversation.status}`);
  const path = `/ai/conversations/${conversation.body.id}/messages`;
  const reply = await call("POST", path, token, { content: "How should I prepare for a job interview?" });
  const messages = await call("GET", path, token);
  const foreign = await call("GET", path);
  const removed = await call("DELETE", `/ai/conversations/${conversation.body.id}`, token);
  console.log(JSON.stringify({ guestStatus: guest.status, conversationStatus: conversation.status,
    replyStatus: reply.status, replyCode: reply.body.code, savedMessages: messages.body.length,
    anonymousHistoryStatus: foreign.status, removedStatus: removed.status }));
  if (reply.status !== 503 || reply.body.code !== "AI_PROVIDER_NOT_CONFIGURED" ||
      messages.status !== 200 || messages.body.length !== 0 || foreign.status !== 401 || removed.status !== 200) {
    throw new Error("AI blocker or history contract mismatch");
  }
}
main().catch((error) => { console.error(`AI_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
