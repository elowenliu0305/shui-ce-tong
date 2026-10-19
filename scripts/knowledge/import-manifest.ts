import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";

import iconv from "iconv-lite";
import yauzl, { type Entry, type ZipFile } from "yauzl";

export interface ArchiveScanLimits {
  maxArchiveBytes: number;
  maxEntries: number;
  maxMemberBytes: number;
  maxExpandedBytes: number;
  maxCompressionRatio: number;
}

export const DEFAULT_ARCHIVE_LIMITS: ArchiveScanLimits = {
  maxArchiveBytes: 256 * 1024 * 1024,
  maxEntries: 2_000,
  maxMemberBytes: 64 * 1024 * 1024,
  maxExpandedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 200,
};

export type SourceScanStatus = "ready" | "empty" | "encrypted" | "unsupported" | "rejected";

export interface ManifestSource {
  relativePath: string;
  originalName: string;
  extension: string;
  compressedBytes: number;
  byteSize: number;
  sha256: string | null;
  detectedMime: string | null;
  status: SourceScanStatus;
  issues: string[];
}

export interface KnowledgeSourceManifest {
  schemaVersion: 1;
  archiveName: string;
  archiveBytes: number;
  archiveSha256: string;
  observedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expandedBytes: number;
  generatedAt: string;
  limits: ArchiveScanLimits;
  sources: ManifestSource[];
}

export class ManifestScanError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ManifestScanError";
  }
}

function decodeFileName(raw: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return iconv.decode(raw, "gb18030");
  }
}

export function normalizeArchivePath(input: string): string {
  const normalized = input.normalize("NFC").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("\0") || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw new ManifestScanError("unsafe_path", `归档成员路径不安全：${JSON.stringify(input)}`);
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment: string) => segment === "." || segment === "..")) {
    throw new ManifestScanError("unsafe_path", `归档成员路径包含目录穿越：${JSON.stringify(input)}`);
  }
  return segments.join("/");
}

function detectedMime(head: Buffer, extension: string): string {
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return "application/msword";
  }
  if (head.length >= 4 && head.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return extension === ".docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/zip";
  }
  const headerText = head.toString("ascii").toLowerCase();
  if (headerText.startsWith("mime-version:") && headerText.includes("content-type: multipart/related")) {
    return "multipart/related";
  }
  if (head.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (head.length && !head.includes(0)) return "text/plain";
  return "application/octet-stream";
}

function expectedMimes(extension: string): string[] {
  switch (extension) {
    case ".doc": return ["application/msword", "multipart/related"];
    case ".docx": return ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    case ".pdf": return ["application/pdf"];
    case ".txt":
    case ".md": return ["text/plain"];
    default: return [];
  }
}

async function fileHash(path: string): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += value.length;
    hash.update(value);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function openZip(path: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, decodeStrings: false, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) reject(error ?? new Error("无法打开 ZIP"));
      else resolve(zip);
    });
  });
}

function readEntry(zip: ZipFile, entry: Entry): Promise<{ sha256: string; head: Buffer; bytes: number }> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) return reject(error ?? new Error("无法读取归档成员"));
      const hash = createHash("sha256");
      const head: Buffer[] = [];
      let headBytes = 0;
      let bytes = 0;
      stream.on("data", (chunk: Buffer) => {
        const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += value.length;
        hash.update(value);
        if (headBytes < 512) {
          const part = value.subarray(0, 512 - headBytes);
          head.push(part);
          headBytes += part.length;
        }
      });
      stream.once("error", reject);
      stream.once("end", () => resolve({ sha256: hash.digest("hex"), head: Buffer.concat(head), bytes }));
    });
  });
}

function readEntryBuffer(zip: ZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) return reject(error ?? new Error("无法读取归档成员"));
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.once("error", reject);
      stream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  });
}

function rawEntryName(entry: Entry): string {
  return typeof entry.fileName === "string" ? entry.fileName : decodeFileName(entry.fileName);
}

export async function scanKnowledgeArchive(
  archivePath: string,
  partialLimits: Partial<ArchiveScanLimits> = {},
): Promise<KnowledgeSourceManifest> {
  const limits = { ...DEFAULT_ARCHIVE_LIMITS, ...partialLimits };
  const archive = await fileHash(archivePath);
  if (archive.bytes > limits.maxArchiveBytes) {
    throw new ManifestScanError("archive_too_large", `归档大小 ${archive.bytes} 超过限制 ${limits.maxArchiveBytes}`);
  }

  const zip = await openZip(archivePath);
  const sources: ManifestSource[] = [];
  const normalizedPaths = new Set<string>();
  let expandedBytes = 0;

  return await new Promise<KnowledgeSourceManifest>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error);
    };
    zip.once("error", fail);
    zip.once("end", () => {
      if (settled) return;
      settled = true;
      resolve({
        schemaVersion: 1,
        archiveName: basename(archivePath),
        archiveBytes: archive.bytes,
        archiveSha256: archive.sha256,
        observedCount: sources.length,
        acceptedCount: sources.filter((source) => source.status === "ready").length,
        rejectedCount: sources.filter((source) => source.status !== "ready").length,
        expandedBytes,
        generatedAt: new Date().toISOString(),
        limits,
        sources,
      });
    });
    zip.on("entry", (entry: Entry) => {
      void (async () => {
        const decoded = rawEntryName(entry);
        const isDirectory = /\/$/.test(decoded);
        if (isDirectory) return zip.readEntry();
        if (sources.length >= limits.maxEntries) throw new ManifestScanError("too_many_entries", `文件数量超过 ${limits.maxEntries}`);
        const relativePath = normalizeArchivePath(decoded);
        if (normalizedPaths.has(relativePath)) throw new ManifestScanError("duplicate_path", `归档中存在重复规范路径：${relativePath}`);
        normalizedPaths.add(relativePath);
        expandedBytes += entry.uncompressedSize;
        if (expandedBytes > limits.maxExpandedBytes) throw new ManifestScanError("expanded_size_exceeded", "归档展开后的总大小超过限制");
        const ratio = entry.compressedSize === 0 ? (entry.uncompressedSize ? Number.POSITIVE_INFINITY : 1) : entry.uncompressedSize / entry.compressedSize;
        if (ratio > limits.maxCompressionRatio) throw new ManifestScanError("compression_ratio_exceeded", `成员压缩比异常：${relativePath}`);
        if (entry.uncompressedSize > limits.maxMemberBytes) throw new ManifestScanError("member_too_large", `成员超过单文件限制：${relativePath}`);

        const extension = extname(relativePath).toLowerCase();
        const encrypted = Boolean(entry.generalPurposeBitFlag & 0x1);
        if (encrypted) {
          sources.push({ relativePath, originalName: basename(relativePath), extension, compressedBytes: entry.compressedSize, byteSize: entry.uncompressedSize, sha256: null, detectedMime: null, status: "encrypted", issues: ["encrypted"] });
          return zip.readEntry();
        }
        const content = await readEntry(zip, entry);
        const mime = detectedMime(content.head, extension);
        const supported = expectedMimes(extension);
        const issues: string[] = [];
        let status: SourceScanStatus = "ready";
        if (!content.bytes) {
          status = "empty";
          issues.push("empty_file");
        } else if (!supported.length) {
          status = "unsupported";
          issues.push("unsupported_extension");
        } else if (!supported.includes(mime)) {
          status = "rejected";
          issues.push("mime_extension_mismatch");
        }
        sources.push({ relativePath, originalName: basename(relativePath), extension, compressedBytes: entry.compressedSize, byteSize: content.bytes, sha256: content.sha256, detectedMime: mime, status, issues });
        zip.readEntry();
      })().catch(fail);
    });
    zip.readEntry();
  });
}

export async function forEachKnowledgeArchiveMember(
  archivePath: string,
  expectedPaths: ReadonlySet<string>,
  handler: (member: { relativePath: string; buffer: Buffer }) => Promise<void>,
): Promise<void> {
  const zip = await openZip(archivePath);
  const seen = new Set<string>();
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error);
    };
    zip.once("error", fail);
    zip.once("end", () => {
      if (settled) return;
      const missing = [...expectedPaths].filter((path) => !seen.has(path));
      if (missing.length) return fail(new ManifestScanError("archive_changed", `清单生成后归档缺少 ${missing.length} 个文件`));
      settled = true;
      resolve();
    });
    zip.on("entry", (entry: Entry) => {
      void (async () => {
        const decoded = rawEntryName(entry);
        if (/\/$/.test(decoded)) return zip.readEntry();
        const relativePath = normalizeArchivePath(decoded);
        if (!expectedPaths.has(relativePath)) throw new ManifestScanError("archive_changed", `清单生成后出现未知文件：${relativePath}`);
        const buffer = await readEntryBuffer(zip, entry);
        seen.add(relativePath);
        await handler({ relativePath, buffer });
        zip.readEntry();
      })().catch(fail);
    });
    zip.readEntry();
  });
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const archivePath = argument("--archive") ?? process.argv[2];
  if (!archivePath) throw new Error("用法：npm run knowledge:manifest -- --archive <资料.zip> [--out manifest.json]");
  const manifest = await scanKnowledgeArchive(archivePath);
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  const outputPath = argument("--out");
  if (outputPath) await writeFile(outputPath, output, "utf8");
  else process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    const message = error instanceof ManifestScanError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
