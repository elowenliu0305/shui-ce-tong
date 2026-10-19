export interface MockAccountRecord {
  id: string;
  emailNormalized: string;
  emailMasked: string;
  emailVerified: boolean;
  credentialVerifier: string;
  verificationRequested: boolean;
  passwordResetRequested: boolean;
}

export const demoAccount: MockAccountRecord = {
  id: "account-demo",
  emailNormalized: "demo@shuicetong.cn",
  emailMasked: "d***@shuicetong.cn",
  emailVerified: true,
  credentialVerifier: "mock-v1-de89de73",
  verificationRequested: false,
  passwordResetRequested: false
};
