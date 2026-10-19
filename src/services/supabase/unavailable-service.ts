import type { AppError } from "../../domain/shared";
import { failure } from "../contracts/service-result";

export function createUnavailableService<T extends object>(name: string): T {
  const error: AppError = {
    code: "STORAGE_ERROR",
    message: `${name}真实服务正在接入，请稍后再试。`,
    retryable: false,
  };
  return new Proxy({}, {
    get: () => async () => failure(error),
  }) as T;
}
