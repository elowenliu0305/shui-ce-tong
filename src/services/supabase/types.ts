import type { AppError, AppErrorCode } from "../../domain/shared";

export type ServerErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "idempotency_mismatch"
  | "dependency_unavailable"
  | "rate_limited"
  | "internal_error";

export interface ServerErrorEnvelope {
  error: {
    code: ServerErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}

export interface RevisionedRow {
  revision: number;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

const appErrorCodes: Record<ServerErrorCode, AppErrorCode> = {
  unauthorized: "AUTH_REQUIRED",
  forbidden: "NOT_FOUND",
  not_found: "NOT_FOUND",
  validation_failed: "VALIDATION_ERROR",
  conflict: "CONFLICT",
  idempotency_mismatch: "CONFLICT",
  dependency_unavailable: "STORAGE_ERROR",
  rate_limited: "UNKNOWN",
  internal_error: "UNKNOWN",
};

export function toAppError(envelope: ServerErrorEnvelope): AppError {
  return {
    code: appErrorCodes[envelope.error.code],
    message: envelope.error.message,
    retryable: envelope.error.retryable,
  };
}
