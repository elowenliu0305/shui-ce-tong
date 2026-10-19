import type { AuthError, Session, User } from "@supabase/supabase-js";

import type { AccountSession, AppError } from "../../domain/shared";
import type { AuthService } from "../contracts/auth-service";
import { failure, success } from "../contracts/service-result";
import { getSupabaseClient } from "./client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

function validate(email: string, password?: string): AppError | null {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized)) {
    return { code: "VALIDATION_ERROR", message: "请输入有效的邮箱地址", fieldErrors: { email: "邮箱格式不正确" }, retryable: false };
  }
  if (password !== undefined && password.length < 8) {
    return { code: "VALIDATION_ERROR", message: "密码至少需要 8 位", fieldErrors: { password: "至少 8 位" }, retryable: false };
  }
  return null;
}

function mapAuthError(error: AuthError): AppError {
  const message = error.message.toLowerCase();
  if (message.includes("email not confirmed")) {
    return { code: "EMAIL_NOT_VERIFIED", message: "请先完成邮箱验证", retryable: false };
  }
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return { code: "AUTH_REQUIRED", message: "邮箱或密码不正确", retryable: false };
  }
  if (error.status === 429) {
    return { code: "UNKNOWN", message: "操作过于频繁，请稍后重试", retryable: true };
  }
  return { code: "UNKNOWN", message: "账号服务暂时不可用，请稍后重试", retryable: true };
}

function sessionFor(session: Session, user: User = session.user): AccountSession {
  const email = user.email ?? "";
  return {
    accountId: user.id,
    emailMasked: maskEmail(email),
    emailVerified: Boolean(user.email_confirmed_at),
    expiresAt: new Date((session.expires_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

export class SupabaseAuthService implements AuthService {
  private readonly client = getSupabaseClient();

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) return failure(mapAuthError(error));
    return success(data.session ? sessionFor(data.session) : null);
  }

  async register(email: string, password: string) {
    const invalid = validate(email, password);
    if (invalid) return failure(invalid);
    const normalized = normalizeEmail(email);
    const { error } = await this.client.auth.signUp({ email: normalized, password });
    if (error) return failure(mapAuthError(error));
    return success({ emailMasked: maskEmail(normalized) });
  }

  async verifyEmail(email: string, code: string) {
    const invalid = validate(email);
    if (invalid) return failure(invalid);
    if (!/^\d{6}$/.test(code)) {
      return failure({ code: "VALIDATION_ERROR", message: "请输入邮件中的 6 位验证码", retryable: false });
    }
    const { data, error } = await this.client.auth.verifyOtp({ email: normalizeEmail(email), token: code, type: "signup" });
    if (error || !data.session) return failure(error ? mapAuthError(error) : { code: "UNKNOWN", message: "验证链接已失效，请重新注册或发送验证邮件", retryable: false });
    return success(sessionFor(data.session, data.user ?? data.session.user));
  }

  async resendVerification(email: string) {
    const invalid = validate(email);
    if (invalid) return failure(invalid);
    const normalized = normalizeEmail(email);
    const { error } = await this.client.auth.resend({ type: "signup", email: normalized });
    if (error?.status === 429) return failure(mapAuthError(error));
    return success({ emailMasked: maskEmail(normalized) });
  }

  async signIn(email: string, password: string) {
    const invalid = validate(email, password);
    if (invalid) return failure(invalid);
    const { data, error } = await this.client.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) return failure(mapAuthError(error));
    return success(sessionFor(data.session, data.user));
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    return error ? failure(mapAuthError(error)) : success(undefined);
  }

  async requestPasswordReset(email: string) {
    const invalid = validate(email);
    if (invalid) return failure(invalid);
    const normalized = normalizeEmail(email);
    await this.client.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return success({ emailMasked: maskEmail(normalized) });
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const invalid = validate(email, newPassword);
    if (invalid) return failure(invalid);
    if (!/^\d{6}$/.test(code)) {
      return failure({ code: "VALIDATION_ERROR", message: "请输入邮件中的 6 位验证码", retryable: false });
    }
    const verified = await this.client.auth.verifyOtp({ email: normalizeEmail(email), token: code, type: "recovery" });
    if (verified.error) return failure(mapAuthError(verified.error));
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    return error ? failure(mapAuthError(error)) : success(undefined);
  }
}
