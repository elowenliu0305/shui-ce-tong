import { describe, expect, it } from "vitest";

import { chunkKnowledgeDocument, tokenizeChineseSearch, validateEmbeddingGeneration } from "../chunk-document";
import { normalizeExtractedText, parseKnowledgeSource } from "../parse-source";

describe("knowledge parsing and chunk generation", () => {
  it("parses MHTML policy metadata and keeps the source URL", async () => {
    const source = Buffer.from(`Mime-Version: 1.0\nContent-Base: https://example.gov.cn/policy/1\nContent-Type: Multipart/related; boundary=demo; type=text/html\n\n<html><style>.hide{display:none}</style><body><h1>研发费用政策</h1><p>国家税务总局公告2026年第3号</p><p>2026年1月2日</p><p>第一条 企业应当留存资料。</p></body></html>`);
    const result = await parseKnowledgeSource({ originalName: "国家税务总局关于研发费用政策的公告.doc", relativePath: "资料/政策/国家税务总局关于研发费用政策的公告.doc", detectedMime: "multipart/related", buffer: source });
    expect(result.status).toBe("parsed");
    expect(result.metadata.sourceUrl).toBe("https://example.gov.cn/policy/1");
    expect(result.metadata.documentNumber).toBe("国家税务总局公告2026年第3号");
    expect(result.metadata.publishedOn).toBe("2026-01-02");
    expect(result.normalizedText).toContain("企业应当留存资料");
    expect(result.normalizedText).not.toContain("display:none");
  });

  it("creates structured chunks with stable locators, overlap and Chinese tokens", () => {
    const paragraphs = Array.from({ length: 18 }, (_, index) => `第${index + 1}条 这是第${index + 1}条政策正文，企业应当保存真实凭证并按照规定期限完成申报。相关资料需要能够对应业务合同、付款记录和发票信息。`);
    const text = normalizeExtractedText(paragraphs.join("\n"));
    const chunks = chunkKnowledgeDocument(text, { targetMin: 260, targetMax: 420, overlapMin: 40, overlapMax: 90 });
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual(chunks.map((_, index) => index));
    expect(chunks.every((chunk) => chunk.content.length <= 420)).toBe(true);
    expect(chunks.every((chunk) => chunk.charEnd > chunk.charStart)).toBe(true);
    expect(chunks[1].charStart).toBeLessThan(chunks[0].charEnd);
    expect(chunks[0].headingPath.at(-1)).toMatch(/^第1条/);
    expect(chunks[0].searchTokens).toContain("企业");
    expect(tokenizeChineseSearch("研发费用 Qwen3-Embedding")).toEqual(expect.arrayContaining(["研发", "qwen3-embedding"]));
  });

  it("blocks incomplete or wrong-dimension embedding generations", () => {
    expect(validateEmbeddingGeneration(["a", "b"], [{ chunkId: "a", values: [0, 1] }], 2)).toMatchObject({ valid: false, errors: ["missing:b"] });
    expect(validateEmbeddingGeneration(["a"], [{ chunkId: "a", values: [0] }], 2)).toMatchObject({ valid: false, errors: ["dimension:a"] });
    expect(validateEmbeddingGeneration(["a", "b"], [{ chunkId: "a", values: [0, 1] }, { chunkId: "b", values: [1, 0] }], 2)).toMatchObject({ valid: true, chunkCount: 2, embeddingCount: 2 });
  });
});
