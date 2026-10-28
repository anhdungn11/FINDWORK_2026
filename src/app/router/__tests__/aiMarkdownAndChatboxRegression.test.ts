import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  isSafeUrl,
  parseBlocks,
  parseInlineMarkdown,
} from "../../../features/ai/components/AiMarkdownMessage";

test("Markdown Security: isSafeUrl allows valid web and email URLs, rejects malicious schemes", () => {
  // Safe protocols
  assert.equal(isSafeUrl("https://findwork.vn/jobs"), true);
  assert.equal(isSafeUrl("http://localhost:5173"), true);
  assert.equal(isSafeUrl("mailto:support@findwork.vn"), true);
  assert.equal(isSafeUrl("/jobs/123"), true);

  // Dangerous / XSS attempts
  assert.equal(isSafeUrl("javascript:alert(document.domain)"), false);
  assert.equal(isSafeUrl("vbscript:msgbox(1)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeUrl("//malicious.com/steal"), false);
  assert.equal(isSafeUrl(""), false);
});

test("Markdown Parser: parseBlocks separates code blocks, headings, lists, quotes, and paragraphs", () => {
  const markdownSample = `### Kỹ năng cần chuẩn bị cho Senior React
Dưới đây là các kỹ năng trọng tâm:

* Thành thạo React 19 và TypeScript
* Tối ưu hiệu năng và SSR
* Kiến trúc State Management và Design Tokens

1. Vòng phỏng vấn kỹ thuật
2. Vòng văn hóa doanh nghiệp

> Lưu ý: Hãy chuẩn bị một dự án tiêu biểu để trình bày.

\`\`\`javascript
const greet = () => console.log("Hello FINDWORK");
\`\`\`
`;

  const blocks = parseBlocks(markdownSample);

  // 1 heading
  const hBlock = blocks.find((b) => b.type === "h3");
  assert.ok(hBlock, "Finds h3 heading");
  assert.equal(hBlock.content, "Kỹ năng cần chuẩn bị cho Senior React");

  // Paragraph
  const pBlock = blocks.find((b) => b.type === "p");
  assert.ok(pBlock, "Finds introductory paragraph");

  // Unordered list
  const ulBlock = blocks.find((b) => b.type === "ul");
  assert.ok(ulBlock, "Finds unordered list");
  assert.equal(ulBlock.items?.length, 3);
  assert.equal(ulBlock.items?.[0], "Thành thạo React 19 và TypeScript");

  // Ordered list
  const olBlock = blocks.find((b) => b.type === "ol");
  assert.ok(olBlock, "Finds ordered list");
  assert.equal(olBlock.items?.length, 2);
  assert.equal(olBlock.items?.[0], "Vòng phỏng vấn kỹ thuật");

  // Blockquote
  const qBlock = blocks.find((b) => b.type === "blockquote");
  assert.ok(qBlock, "Finds blockquote");
  assert.match(qBlock.content ?? "", /Lưu ý/);

  // Code block
  const cBlock = blocks.find((b) => b.type === "code");
  assert.ok(cBlock, "Finds code block");
  assert.equal(cBlock.lang, "javascript");
  assert.match(cBlock.content ?? "", /Hello FINDWORK/);
});

test("Markdown Inline: parseInlineMarkdown handles bold, italic, code, and safe links", () => {
  const text = "Chào bạn! Vui lòng xem **quy định tuyển dụng** tại [FINDWORK](https://findwork.vn) và chạy lệnh `npm test`.";
  const nodes = parseInlineMarkdown(text, false);

  assert.ok(nodes.length > 1, "Parses multiple inline tokens");

  // Verify safe link element is created
  const linkNode = nodes.find((n) => React.isValidElement(n) && n.type === "a") as React.ReactElement<any>;
  assert.ok(linkNode, "Creates safe <a> anchor");
  assert.equal(linkNode.props.href, "https://findwork.vn");
  assert.equal(linkNode.props.target, "_blank");
  assert.equal(linkNode.props.rel, "noopener noreferrer");

  // Verify bold element is created
  const boldNode = nodes.find((n) => React.isValidElement(n) && n.type === "strong");
  assert.ok(boldNode, "Creates <strong> element for bold text");

  // Verify inline code element is created
  const codeNode = nodes.find((n) => React.isValidElement(n) && n.type === "code") as React.ReactElement<any>;
  assert.ok(codeNode, "Creates <code> element for inline code");
  assert.equal(codeNode.props.children, "npm test");
});

test("Markdown Security: parseInlineMarkdown neutralizes XSS links without rendering anchor tag", () => {
  const xssText = "Click here: [Hacked](javascript:alert(document.cookie))";
  const nodes = parseInlineMarkdown(xssText, false);

  // No anchor tag should be created for javascript: url
  const unsafeLink = nodes.find((n) => React.isValidElement(n) && n.type === "a");
  assert.equal(unsafeLink, undefined, "Does NOT create anchor for javascript: scheme");

  // Instead, the literal string fallback is retained
  const hasFallbackText = nodes.some((n) => typeof n === "string" && n.includes("javascript:alert"));
  assert.ok(hasFallbackText, "Retains safe plain text representation");
});


test("Auth UX Regression: LoginPage contains accessible forgot-password navigation", async () => {
  const fs = await import("node:fs");
  const loginCode = fs.readFileSync("src/pages/auth/LoginPage/LoginPage.tsx", "utf-8");

  assert.ok(
    loginCode.includes('to="/forgot-password"'),
    "LoginPage must include Link to /forgot-password"
  );
  assert.ok(
    loginCode.includes("Quên mật khẩu?"),
    "LoginPage must render user-visible 'Quên mật khẩu?' text"
  );
});

test("Modal Accessibility Regression: ApplicationChatModal and InterviewSchedulingModal support Escape key", async () => {
  const fs = await import("node:fs");
  const chatModalCode = fs.readFileSync("src/components/messaging/ApplicationChatModal.tsx", "utf-8");
  const interviewModalCode = fs.readFileSync("src/features/interview/InterviewSchedulingModal.tsx", "utf-8");

  assert.ok(
    chatModalCode.includes('e.key === "Escape"') && chatModalCode.includes("onClose()"),
    "ApplicationChatModal must listen to Escape key and invoke onClose"
  );
  assert.ok(
    interviewModalCode.includes('e.key === "Escape"') && interviewModalCode.includes("onClose()"),
    "InterviewSchedulingModal must listen to Escape key and invoke onClose"
  );
});

test("AI Assistant UI Regression: AiAssistantModal supports retry on failed messages and Markdown rendering", async () => {
  const fs = await import("node:fs");
  const modalCode = fs.readFileSync("src/features/ai/AiAssistantModal.tsx", "utf-8");

  assert.ok(
    modalCode.includes("handleRetryMessage"),
    "AiAssistantModal must define handleRetryMessage for failed messages"
  );
  assert.ok(
    modalCode.includes("Thử lại"),
    "AiAssistantModal must render a 'Thử lại' button when m.status === 'error'"
  );
  assert.ok(
    modalCode.includes("<AiMarkdownMessage"),
    "AiAssistantModal must render assistant messages using AiMarkdownMessage"
  );
  assert.ok(
    modalCode.includes("categoryPillsScroll"),
    "AiAssistantModal must use categoryPillsScroll class for smooth horizontal overflow handling"
  );
});
