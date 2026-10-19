import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import yazl from "yazl";

import { ManifestScanError, normalizeArchivePath, scanKnowledgeArchive } from "../import-manifest";

const cleanup: string[] = [];

async function zipWith(entries: Array<{ name: string; content: Buffer }>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "shuicetong-archive-"));
  cleanup.push(directory);
  const path = join(directory, "fixture.zip");
  const zip = new yazl.ZipFile();
  for (const entry of entries) zip.addBuffer(entry.content, entry.name);
  zip.end();
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(path)).once("close", resolve).once("error", reject);
  });
  return path;
}

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("knowledge archive manifest", () => {
  it("rejects absolute and traversal paths before extraction", () => {
    expect(() => normalizeArchivePath("../escape.docx")).toThrowError(ManifestScanError);
    expect(() => normalizeArchivePath("/absolute.docx")).toThrowError(ManifestScanError);
    expect(() => normalizeArchivePath("C:\\escape.docx")).toThrowError(ManifestScanError);
  });

  it("keeps every member in the reconciliation manifest, including empty and mismatched files", async () => {
    const oleHeader = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32)]);
    const mhtml = Buffer.from("Mime-Version: 1.0\nContent-Type: Multipart/related; boundary=demo; type=text/html\n\n<html><body>政策正文</body></html>");
    const path = await zipWith([
      { name: "资料/政策/有效.doc", content: oleHeader },
      { name: "资料/政策/网页归档.doc", content: mhtml },
      { name: "资料/政策/空文件.doc", content: Buffer.alloc(0) },
      { name: "资料/政策/伪装.docx", content: Buffer.from("not-a-docx") },
    ]);
    const manifest = await scanKnowledgeArchive(path);
    expect(manifest.observedCount).toBe(4);
    expect(manifest.acceptedCount).toBe(2);
    expect(manifest.sources.map((item) => item.status)).toEqual(["ready", "ready", "empty", "rejected"]);
    expect(manifest.sources[0].detectedMime).toBe("application/msword");
    expect(manifest.sources[1].detectedMime).toBe("multipart/related");
    expect(manifest.sources.every((item) => item.relativePath.startsWith("资料/政策/"))).toBe(true);
  });

  it("rejects a highly expanding member as a compression bomb", async () => {
    const path = await zipWith([{ name: "资料/政策/大文件.docx", content: Buffer.alloc(1024 * 1024, 0) }]);
    await expect(scanKnowledgeArchive(path, { maxCompressionRatio: 5 })).rejects.toMatchObject({ code: "compression_ratio_exceeded" });
  });

  it("rejects members above the configured per-file limit", async () => {
    const path = await zipWith([{ name: "资料/政策/超限.docx", content: Buffer.alloc(256, 1) }]);
    await expect(scanKnowledgeArchive(path, { maxMemberBytes: 128, maxCompressionRatio: 10_000 })).rejects.toMatchObject({ code: "member_too_large" });
  });
});
