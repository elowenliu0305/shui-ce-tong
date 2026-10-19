import type { AccountSession } from "../../domain/shared";
import type { AuthService } from "../contracts/auth-service";
import { failure, success, type ServiceResult } from "../contracts/service-result";
import type { MockDatabase } from "./mock-database";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createCredentialVerifier(email: string, password: string) {
  let hash = 2_166_136_261;
  for (const character of `${email.trim().toLowerCase()}::${password}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return `mock-v1-${hash.toString(16).padStart(8, "0")}`;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}

function id(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function validateCredentials(email: string, password: string): ServiceResult<{ email: string }> {
  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized)) {
    return failure({ code: "VALIDATION_ERROR", message: "请输入有效的邮箱地址", fieldErrors: { email: "邮箱格式不正确" }, retryable: false });
  }
  if (password.length < 8) {
    return failure({ code: "VALIDATION_ERROR", message: "密码至少需要 8 位", fieldErrors: { password: "至少 8 位" }, retryable: false });
  }
  return success({ email: normalized });
}

function sessionFor(accountId: string, emailMasked: string, emailVerified: boolean): AccountSession {
  return {
    accountId,
    emailMasked,
    emailVerified,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

export class MockAuthService implements AuthService {
  constructor(private readonly database: MockDatabase) {}

  async getSession() {
    return success(this.database.read().session);
  }

  async register(email: string, password: string) {
    const valid = validateCredentials(email, password);
    if (!valid.ok) return valid;
    const existing = Object.values(this.database.read().accountsById).find((account) => account.emailNormalized === valid.data.email);
    if (existing) return failure({ code: "CONFLICT", message: "该邮箱已注册，请直接登录", retryable: false });

    const accountId = id("account");
    const emailMasked = maskEmail(valid.data.email);
    this.database.transact((draft) => {
      draft.accountsById[accountId] = {
        id: accountId,
        emailNormalized: valid.data.email,
        emailMasked,
        emailVerified: false,
        credentialVerifier: createCredentialVerifier(valid.data.email, password),
        verificationRequested: true,
        passwordResetRequested: false
      };
    });
    return success({ emailMasked });
  }

  async verifyEmail(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    const account = Object.values(this.database.read().accountsById).find((item) => item.emailNormalized === normalized);
    if (!account) return failure({ code: "NOT_FOUND", message: "没有找到待验证账号", retryable: false });
    if (!/^\d{6}$/.test(code)) return failure({ code: "VALIDATION_ERROR", message: "请输入 6 位数字验证码", retryable: false });
    const session = sessionFor(account.id, account.emailMasked, true);
    this.database.transact((draft) => {
      draft.accountsById[account.id].emailVerified = true;
      draft.accountsById[account.id].verificationRequested = false;
      draft.session = session;
      draft.activeEnterpriseId = Object.values(draft.enterprisesById).find((item) => item.accountId === account.id)?.id ?? null;
    });
    return success(session);
  }

  async resendVerification(email: string) {
    const normalized = email.trim().toLowerCase();
    const account = Object.values(this.database.read().accountsById).find((item) => item.emailNormalized === normalized);
    if (account) {
      this.database.transact((draft) => { draft.accountsById[account.id].verificationRequested = true; });
    }
    return success({ emailMasked: maskEmail(normalized) });
  }

  async signIn(email: string, password: string) {
    const valid = validateCredentials(email, password);
    if (!valid.ok) return valid;
    const account = Object.values(this.database.read().accountsById).find((item) => item.emailNormalized === valid.data.email);
    if (!account || account.credentialVerifier !== createCredentialVerifier(valid.data.email, password)) {
      return failure({ code: "AUTH_REQUIRED", message: "邮箱或密码不正确", retryable: false });
    }
    if (!account.emailVerified) return failure({ code: "EMAIL_NOT_VERIFIED", message: "请先完成邮箱验证", retryable: false });
    const session = sessionFor(account.id, account.emailMasked, true);
    this.database.transact((draft) => {
      draft.session = session;
      const enterprises = Object.values(draft.enterprisesById).filter((item) => item.accountId === account.id);
      if (!enterprises.some((item) => item.id === draft.activeEnterpriseId)) draft.activeEnterpriseId = enterprises[0]?.id ?? null;
    });
    return success(session);
  }

  async startDemoSession() {
    const account = Object.values(this.database.read().accountsById).find((item) => item.id === "account-demo");
    if (!account) return failure({ code: "NOT_FOUND", message: "演示账号不存在", retryable: false });
    const session = sessionFor(account.id, account.emailMasked, true);
    this.database.transact((draft) => {
      draft.session = session;
      draft.activeEnterpriseId = Object.values(draft.enterprisesById).find((item) => item.accountId === account.id)?.id ?? null;
    });
    return success(session);
  }

  async signOut() {
    this.database.transact((draft) => {
      draft.session = null;
      draft.activeEnterpriseId = null;
    });
    return success(undefined);
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const account = Object.values(this.database.read().accountsById).find((item) => item.emailNormalized === normalized);
    if (account) {
      this.database.transact((draft) => {
        draft.accountsById[account.id].passwordResetRequested = true;
      });
    }
    return success({ emailMasked: account?.emailMasked ?? maskEmail(normalized) });
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const valid = validateCredentials(email, newPassword);
    if (!valid.ok) return valid;
    const account = Object.values(this.database.read().accountsById).find((item) => item.emailNormalized === valid.data.email);
    if (!account || !account.passwordResetRequested) return failure({ code: "NOT_FOUND", message: "重置请求已失效，请重新发起", retryable: false });
    if (!/^\d{6}$/.test(code)) return failure({ code: "VALIDATION_ERROR", message: "请输入 6 位数字验证码", retryable: false });
    this.database.transact((draft) => {
      draft.accountsById[account.id].credentialVerifier = createCredentialVerifier(valid.data.email, newPassword);
      draft.accountsById[account.id].passwordResetRequested = false;
    });
    return success(undefined);
  }
}
