import type { AccountSession } from "../../domain/shared";
import type { ServiceResult } from "./service-result";

export interface AuthService {
  getSession(): Promise<ServiceResult<AccountSession | null>>;
  register(email: string, password: string): Promise<ServiceResult<{ emailMasked: string }>>;
  resendVerification?(email: string): Promise<ServiceResult<{ emailMasked: string }>>;
  verifyEmail(email: string, code: string): Promise<ServiceResult<AccountSession>>;
  signIn(email: string, password: string): Promise<ServiceResult<AccountSession>>;
  startDemoSession?(): Promise<ServiceResult<AccountSession>>;
  signOut(): Promise<ServiceResult<void>>;
  requestPasswordReset(email: string): Promise<ServiceResult<{ emailMasked: string }>>;
  resetPassword(email: string, code: string, newPassword: string): Promise<ServiceResult<void>>;
}
