export type ISODate = string;
export type ISODateTime = string;

export type FieldSource = "user" | "ocr-demo" | "seed";

export type FieldValue<T> =
  | { status: "known"; value: T; source: FieldSource; updatedAt: ISODateTime }
  | { status: "unknown" | "unset"; source: FieldSource; updatedAt: ISODateTime };

export interface MoneyValue {
  amountYuan: number;
  currency: "CNY";
  dataYear: number;
}

export interface Citation {
  documentId: string;
  sourceId: string;
  title: string;
  docNo: string | null;
  locator: string;
  excerpt: string | null;
}

export interface AccountSession {
  accountId: string;
  emailMasked: string;
  emailVerified: boolean;
  expiresAt: ISODateTime;
}

export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "EMAIL_NOT_VERIFIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STORAGE_ERROR"
  | "UNKNOWN";

export interface AppError {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
}

export function known<T>(value: T, source: FieldSource = "user", updatedAt = new Date().toISOString()): FieldValue<T> {
  return { status: "known", value, source, updatedAt };
}

export function unknown<T>(source: FieldSource = "user", updatedAt = new Date().toISOString()): FieldValue<T> {
  return { status: "unknown", source, updatedAt };
}

export function unset<T>(source: FieldSource = "user", updatedAt = new Date().toISOString()): FieldValue<T> {
  return { status: "unset", source, updatedAt };
}
