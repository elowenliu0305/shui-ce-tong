import { describe, expect, it } from "vitest";

import { createMockDatabase } from "../../src/services/mock/mock-database";
import { MockFileAnalysisService } from "../../src/services/mock/mock-file-analysis-service";
import { bytesMatchDeclaredType, MAX_ENTERPRISE_FILE_BYTES, validateFileMetadata } from "../../supabase/functions/enterprise-file-upload/file-policy.ts";
import { createMemoryStorage } from "../test-storage";

describe("企业文件上传状态与安全校验", () => {
  it("限制名称、大小、扩展名和声明 MIME", () => {
    expect(validateFileMetadata("报告.pdf", "application/pdf", 128)).toMatchObject({ extension: ".pdf" });
    expect(() => validateFileMetadata("../报告.pdf", "application/pdf", 128)).toThrow("invalid_file_name");
    expect(() => validateFileMetadata("报告.exe", "application/octet-stream", 128)).toThrow("unsupported_file_type");
    expect(() => validateFileMetadata("报告.pdf", "image/png", 128)).toThrow("mime_extension_mismatch");
    expect(() => validateFileMetadata("报告.pdf", "application/pdf", MAX_ENTERPRISE_FILE_BYTES + 1)).toThrow("invalid_file_size");
  });

  it("核对文件魔数或文本编码，拒绝扩展名伪装", () => {
    expect(bytesMatchDeclaredType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), ".pdf")).toBe(true);
    expect(bytesMatchDeclaredType(new Uint8Array([0x4d, 0x5a, 0x90]), ".pdf")).toBe(false);
    expect(bytesMatchDeclaredType(new TextEncoder().encode("列一,列二\n1,2"), ".csv")).toBe(true);
    expect(bytesMatchDeclaredType(new Uint8Array([0, 1, 2]), ".txt")).toBe(false);
  });

  it("失败处理不生成事实，删除后记录不可再访问", async () => {
    const service = new MockFileAnalysisService(createMockDatabase(createMemoryStorage()));
    const created = await service.register("enterprise-nebula", { displayName: "模拟失败.pdf", mediaType: "application/pdf", byteSize: 8 }, "tax-health");
    if (!created.ok) throw new Error(created.error.message);
    await service.refreshStatus(created.data.id, "enterprise-nebula");
    const failed = await service.refreshStatus(created.data.id, "enterprise-nebula");
    expect(failed.ok && failed.data).toMatchObject({ status: "failed", readingStatus: "failed", contentRead: false, resultSummary: null });
    expect(await service.delete(created.data.id, "enterprise-nebula")).toMatchObject({ ok: true });
    expect(await service.get(created.data.id, "enterprise-nebula")).toMatchObject({ ok: false });
  });
});
