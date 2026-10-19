export const MAX_ENTERPRISE_FILE_BYTES = 20 * 1024 * 1024;

const typeByExtension: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".csv": ["text/csv", "text/plain", "application/vnd.ms-excel"],
  ".txt": ["text/plain"],
  ".json": ["application/json", "text/plain"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
};

export interface ValidatedFileMetadata {
  originalName: string;
  extension: string;
  detectedMime: string;
  byteSize: number;
}

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/(\.[a-z0-9]{1,8})$/);
  return match?.[1] ?? "";
}

export function validateFileMetadata(name: string, mime: string, byteSize: number): ValidatedFileMetadata {
  const originalName = name.trim();
  if (!originalName || originalName.length > 255 || /[\0\\/]/.test(originalName)) throw new Error("invalid_file_name");
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > MAX_ENTERPRISE_FILE_BYTES) throw new Error("invalid_file_size");
  const extension = extensionOf(originalName);
  const allowed = typeByExtension[extension];
  if (!allowed) throw new Error("unsupported_file_type");
  const normalizedMime = mime.trim().toLowerCase() || allowed[0];
  if (!allowed.includes(normalizedMime)) throw new Error("mime_extension_mismatch");
  return { originalName, extension, detectedMime: normalizedMime, byteSize };
}

function startsWith(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function isText(bytes: Uint8Array): boolean {
  if (bytes.some((value) => value === 0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function bytesMatchDeclaredType(bytes: Uint8Array, extension: string): boolean {
  if (!bytes.length) return false;
  if (extension === ".pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === ".png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === ".jpg" || extension === ".jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === ".doc" || extension === ".xls") return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === ".docx" || extension === ".xlsx") return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  return isText(bytes);
}
