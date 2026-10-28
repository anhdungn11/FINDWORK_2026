import React, { type ReactNode } from "react";

void React;

interface AiMarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

/**
 * Validates whether a URL is safe to open as a hyperlink.
 * Strictly permits http, https, mailto, and relative paths.
 * Blocks dangerous schemes like javascript:, data:, vbscript:.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}

/**
 * Parses inline markdown tokens:
 * - Code: `code`
 * - Links: [label](url)
 * - Bold + Italic: ***text*** or ___text___
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 */
export function parseInlineMarkdown(text: string, isUser: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tokenizer regex matching code, links, bold-italic, bold, italic, strikethrough
  const inlineRegex = /(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*\*([^*]+)\*\*\*|___([^_]+)___)|(\*\*([^*]+)\*\*|__([^_]+)__)|(\*([^*]+)\*|_([^_]+)_)|(~~([^~]+)~~)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = `${match.index}-${nodes.length}`;

    if (match[1]) {
      // Inline code: `code`
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "0.85em",
            padding: "2px 5px",
            borderRadius: "4px",
            backgroundColor: isUser ? "rgba(255, 255, 255, 0.22)" : "#e2e8f0",
            color: isUser ? "#ffffff" : "#0f172a",
          }}
        >
          {match[2]}
        </code>
      );
    } else if (match[3]) {
      // Link: [label](url)
      const label = match[4];
      const rawUrl = match[5];
      const safe = isSafeUrl(rawUrl);

      if (safe) {
        nodes.push(
          <a
            key={key}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isUser ? "#e0f2fe" : "#0284c7",
              textDecoration: "underline",
              fontWeight: 600,
              wordBreak: "break-all",
            }}
          >
            {label}
          </a>
        );
      } else {
        // Unsafe URL: render as plain text to prevent XSS
        nodes.push(`[${label}](${rawUrl})`);
      }
    } else if (match[6]) {
      // Bold + Italic: ***text***
      const boldItalicContent = match[7] || match[8];
      nodes.push(
        <strong key={key} style={{ fontWeight: 700 }}>
          <em>{boldItalicContent}</em>
        </strong>
      );
    } else if (match[9]) {
      // Bold: **text** or __text__
      const boldContent = match[10] || match[11];
      nodes.push(
        <strong key={key} style={{ fontWeight: 700 }}>
          {boldContent}
        </strong>
      );
    } else if (match[12]) {
      // Italic: *text* or _text_
      const italicContent = match[13] || match[14];
      nodes.push(
        <em key={key} style={{ fontStyle: "italic" }}>
          {italicContent}
        </em>
      );
    } else if (match[15]) {
      // Strikethrough: ~~text~~
      nodes.push(<del key={key}>{match[16]}</del>);
    }

    lastIndex = inlineRegex.lastIndex;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

interface BlockItem {
  type: "code" | "h1" | "h2" | "h3" | "h4" | "ul" | "ol" | "blockquote" | "hr" | "p";
  content?: string;
  items?: string[];
  lang?: string;
}

/**
 * Tokenizes markdown raw text into high-level structural blocks:
 * code blocks, headings, unordered lists, ordered lists, blockquotes, horizontal rules, and paragraphs.
 */
export function parseBlocks(markdown: string): BlockItem[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: BlockItem[] = [];

  let inCode = false;
  let codeLang = "";
  let codeBuffer: string[] = [];

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: "p",
        content: currentParagraph.join("\n"),
      });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type,
        items: [...currentList.items],
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block toggle
    if (line.trim().startsWith("```")) {
      if (inCode) {
        // End code block
        blocks.push({
          type: "code",
          lang: codeLang,
          content: codeBuffer.join("\n"),
        });
        inCode = false;
        codeLang = "";
        codeBuffer = [];
      } else {
        // Start code block
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Empty line separates paragraphs and lists
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const hType = level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      blocks.push({
        type: hType,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      blocks.push({ type: "hr" });
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      flushParagraph();
      flushList();
      const quoteText = line.replace(/^\s*>\s?/, "");
      blocks.push({
        type: "blockquote",
        content: quoteText,
      });
      continue;
    }

    // Unordered list (*, -, +)
    const ulMatch = line.match(/^(\*|-|\+)\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[2].trim());
      continue;
    }

    // Ordered list (1., 2., etc.)
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2].trim());
      continue;
    }

    // Regular paragraph line
    flushList();
    currentParagraph.push(line);
  }

  // Cleanup pending buffers
  if (inCode) {
    blocks.push({
      type: "code",
      lang: codeLang,
      content: codeBuffer.join("\n"),
    });
  }
  flushParagraph();
  flushList();

  return blocks;
}

export const AiMarkdownMessage = ({ content, isUser = false }: AiMarkdownMessageProps) => {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div
      style={{
        lineHeight: 1.6,
        fontSize: "0.9125rem",
        color: isUser ? "#ffffff" : "#0f172a",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return (
              <h3
                key={idx}
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  margin: "6px 0 2px",
                  color: isUser ? "#ffffff" : "#0f172a",
                  lineHeight: 1.35,
                }}
              >
                {parseInlineMarkdown(block.content || "", isUser)}
              </h3>
            );
          case "h2":
            return (
              <h4
                key={idx}
                style={{
                  fontSize: "1.025rem",
                  fontWeight: 700,
                  margin: "5px 0 2px",
                  color: isUser ? "#ffffff" : "#0f172a",
                  lineHeight: 1.35,
                }}
              >
                {parseInlineMarkdown(block.content || "", isUser)}
              </h4>
            );
          case "h3":
          case "h4":
            return (
              <h5
                key={idx}
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 650,
                  margin: "4px 0 2px",
                  color: isUser ? "#ffffff" : "#0f172a",
                  lineHeight: 1.35,
                }}
              >
                {parseInlineMarkdown(block.content || "", isUser)}
              </h5>
            );
          case "ul":
            return (
              <ul
                key={idx}
                style={{
                  margin: "2px 0 4px",
                  paddingLeft: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  listStyleType: "disc",
                }}
              >
                {(block.items || []).map((item, itemIdx) => (
                  <li key={itemIdx} style={{ lineHeight: 1.5 }}>
                    {parseInlineMarkdown(item, isUser)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol
                key={idx}
                style={{
                  margin: "2px 0 4px",
                  paddingLeft: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  listStyleType: "decimal",
                }}
              >
                {(block.items || []).map((item, itemIdx) => (
                  <li key={itemIdx} style={{ lineHeight: 1.5 }}>
                    {parseInlineMarkdown(item, isUser)}
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={idx}
                style={{
                  margin: "6px 0",
                  padding: "10px 12px",
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  borderRadius: "8px",
                  overflowX: "auto",
                  fontSize: "0.825rem",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  lineHeight: 1.45,
                }}
              >
                <code>{block.content}</code>
              </pre>
            );
          case "blockquote":
            return (
              <blockquote
                key={idx}
                style={{
                  margin: "4px 0",
                  padding: "4px 10px",
                  borderLeft: `3px solid ${isUser ? "rgba(255,255,255,0.6)" : "#0284c7"}`,
                  backgroundColor: isUser ? "rgba(255,255,255,0.08)" : "#f8fafc",
                  fontStyle: "italic",
                  borderRadius: "0 4px 4px 0",
                }}
              >
                {parseInlineMarkdown(block.content || "", isUser)}
              </blockquote>
            );
          case "hr":
            return (
              <hr
                key={idx}
                style={{
                  margin: "8px 0",
                  border: "none",
                  borderTop: `1px solid ${isUser ? "rgba(255,255,255,0.2)" : "#e2e8f0"}`,
                }}
              />
            );
          case "p":
          default:
            return (
              <p
                key={idx}
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {parseInlineMarkdown(block.content || "", isUser)}
              </p>
            );
        }
      })}
    </div>
  );
};
