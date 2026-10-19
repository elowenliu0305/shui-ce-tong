import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";

import mammoth from "mammoth";

const execFileAsync = promisify(execFile);

export interface ParsedSourceMetadata {
  title: string;
  documentNumber: string | null;
  issuer: string[];
  publishedOn: string | null;
  category: "policy" | "news" | "case" | "other";
  sourceUrl: string | null;
}

export interface ParsedSource {
  status: "parsed" | "partial" | "failed" | "unsupported";
  parserName: string;
  parserVersion: string;
  warnings: string[];
  metadata: ParsedSourceMetadata;
  normalizedText: string | null;
  normalizedTextSha256: string | null;
  pageMappingConfidence: "none" | "low" | "high";
  errorCode: string | null;
}

export interface ParseSourceInput {
  originalName: string;
  relativePath: string;
  detectedMime: string;
  filePath?: string;
  buffer?: Buffer;
}

function decodeEntity(value: string): string {
  const named: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? match;
  });
}

export function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mhtmlToText(source: string): { text: string; sourceUrl: string | null } {
  const sourceUrl = source.match(/^Content-(?:Base|Location):\s*(https?:\/\/\S+)/im)?.[1] ?? null;
  const htmlStart = source.search(/<!doctype html|<html\b/i);
  const htmlEnd = source.search(/<\/html>/i);
  if (htmlStart < 0) return { text: source, sourceUrl };
  const html = source.slice(htmlStart, htmlEnd >= htmlStart ? htmlEnd + 7 : undefined)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(style|script|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<(br|hr)\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return { text: decodeEntity(html), sourceUrl };
}

function inferCategory(relativePath: string): ParsedSourceMetadata["category"] {
  if (relativePath.includes("/政策/")) return "policy";
  if (relativePath.includes("/案例/")) return "case";
  if (relativePath.includes("/时讯/") || relativePath.includes("/新闻/")) return "news";
  return "other";
}

function inferDocumentNumber(text: string): string | null {
  const patterns = [
    /国家税务总局令第\d+号/,
    /[\u4e00-\u9fff]{1,20}(?:公告|令)\d{4}年第\d+号/,
    /[\u4e00-\u9fff]{1,20}[〔（(]\d{4}[〕）)]\d+号/,
  ];
  return patterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean) ?? null;
}

function inferIssuer(title: string, text: string): string[] {
  const explicit = text.match(/(?:发文机关|发布机构)[：:]\s*([^\n]{2,100})/)?.[1];
  const candidate = explicit ?? (title.includes("关于") ? title.slice(0, title.indexOf("关于")) : "");
  if (!candidate || candidate.startsWith("关于")) return [];
  return candidate.split(/[、，,]\s*|\s{2,}/).map((item) => item.trim()).filter((item) => item.length >= 2 && item.length <= 40).slice(0, 8);
}

function inferPublishedOn(text: string): string | null {
  const match = text.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

async function inputBuffer(input: ParseSourceInput): Promise<Buffer> {
  if (input.buffer) return input.buffer;
  if (input.filePath) return readFile(input.filePath);
  throw new Error("缺少待解析文件内容");
}

async function parseLegacyWord(input: ParseSourceInput): Promise<string> {
  let directory: string | null = null;
  let path = input.filePath;
  try {
    if (!path) {
      directory = await mkdtemp(join(tmpdir(), "shuicetong-doc-"));
      path = join(directory, `source${extname(input.originalName) || ".doc"}`);
      await writeFile(path, await inputBuffer(input));
    }
    const result = await execFileAsync("/usr/bin/textutil", ["-convert", "txt", "-stdout", path], { maxBuffer: 64 * 1024 * 1024 });
    return result.stdout;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

export async function parseKnowledgeSource(input: ParseSourceInput): Promise<ParsedSource> {
  const title = basename(input.originalName, extname(input.originalName)).replace(/\s+\(\d+\)$/, "").trim();
  const baseMetadata: ParsedSourceMetadata = {
    title,
    documentNumber: null,
    issuer: [],
    publishedOn: null,
    category: inferCategory(input.relativePath),
    sourceUrl: null,
  };
  const warnings: string[] = [];
  let rawText = "";
  let parserName = "unsupported";
  let sourceUrl: string | null = null;

  try {
    if (input.detectedMime === "multipart/related") {
      parserName = "mhtml-html";
      const result = mhtmlToText((await inputBuffer(input)).toString("utf8"));
      rawText = result.text;
      sourceUrl = result.sourceUrl;
    } else if (input.detectedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      parserName = "mammoth";
      const result = await mammoth.extractRawText({ buffer: await inputBuffer(input) });
      rawText = result.value;
      warnings.push(...result.messages.map((message) => `${message.type}:${message.message}`));
    } else if (input.detectedMime === "application/msword") {
      parserName = "macos-textutil";
      rawText = await parseLegacyWord(input);
    } else if (input.detectedMime === "text/plain") {
      parserName = "utf8-text";
      rawText = (await inputBuffer(input)).toString("utf8");
    } else {
      return { status: "unsupported", parserName, parserVersion: "1", warnings, metadata: baseMetadata, normalizedText: null, normalizedTextSha256: null, pageMappingConfidence: "none", errorCode: "unsupported_mime" };
    }

    const normalizedText = normalizeExtractedText(rawText);
    if (!normalizedText) {
      return { status: "failed", parserName, parserVersion: "1", warnings: [...warnings, "empty_extracted_text"], metadata: baseMetadata, normalizedText: null, normalizedTextSha256: null, pageMappingConfidence: "none", errorCode: "empty_extracted_text" };
    }
    const metadata = {
      ...baseMetadata,
      documentNumber: inferDocumentNumber(normalizedText),
      issuer: inferIssuer(title, normalizedText),
      publishedOn: inferPublishedOn(normalizedText),
      sourceUrl,
    };
    return {
      status: warnings.length ? "partial" : "parsed",
      parserName,
      parserVersion: "1",
      warnings,
      metadata,
      normalizedText,
      normalizedTextSha256: createHash("sha256").update(normalizedText).digest("hex"),
      pageMappingConfidence: "none",
      errorCode: null,
    };
  } catch (error) {
    return {
      status: "failed",
      parserName,
      parserVersion: "1",
      warnings: [...warnings, error instanceof Error ? error.message : String(error)],
      metadata: baseMetadata,
      normalizedText: null,
      normalizedTextSha256: null,
      pageMappingConfidence: "none",
      errorCode: "parse_failed",
    };
  }
}
