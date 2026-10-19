import type { AppError } from "../../domain/shared";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export interface PageResult<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

export const success = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const failure = (error: AppError): ServiceResult<never> => ({ ok: false, error });
