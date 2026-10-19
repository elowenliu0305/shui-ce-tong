import type { AgentConversation } from "../../domain/agent";
import type { AssessmentRun, RiskQuestionnaireDraft } from "../../domain/assessment";
import type { Enterprise, CompanyProfileDraft } from "../../domain/enterprise";
import type { FileAnalysisRecord } from "../../domain/file-analysis";
import type { Favorite } from "../../domain/knowledge";
import type { ReportSnapshot } from "../../domain/report";
import type { AccountSession } from "../../domain/shared";
import { demoAccount, type MockAccountRecord } from "../../fixtures/accounts";
import { demoEnterprises } from "../../fixtures/enterprises";

export const MOCK_SCHEMA_VERSION = 2 as const;
export const MOCK_STORAGE_KEY = "shuicetong.frontend.mock.v2";

export interface MockEnvelope {
  schemaVersion: typeof MOCK_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  session: AccountSession | null;
  activeEnterpriseId: string | null;
  accountsById: Record<string, MockAccountRecord>;
  enterprisesById: Record<string, Enterprise>;
  profileDraftsByEnterpriseId: Record<string, CompanyProfileDraft>;
  riskDraftsByEnterpriseId: Record<string, RiskQuestionnaireDraft>;
  assessmentRunsById: Record<string, AssessmentRun>;
  reportSnapshotsById: Record<string, ReportSnapshot>;
  favoritesById: Record<string, Favorite>;
  agentConversationsById: Record<string, AgentConversation>;
  fileAnalysisRecordsById: Record<string, FileAnalysisRecord>;
  preferences: {
    lastVisitedPath: string;
  };
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MockDatabase {
  read(): Readonly<MockEnvelope>;
  reset(): Readonly<MockEnvelope>;
  transact(mutator: (draft: MockEnvelope) => void): Readonly<MockEnvelope>;
}

const seedDate = "2026-10-15T00:00:00.000Z";

export function createSeedEnvelope(): MockEnvelope {
  return {
    schemaVersion: MOCK_SCHEMA_VERSION,
    revision: 0,
    updatedAt: seedDate,
    session: null,
    activeEnterpriseId: null,
    accountsById: { [demoAccount.id]: clone(demoAccount) },
    enterprisesById: Object.fromEntries(demoEnterprises.map((enterprise) => [enterprise.id, clone(enterprise)])),
    profileDraftsByEnterpriseId: {},
    riskDraftsByEnterpriseId: {},
    assessmentRunsById: {},
    reportSnapshotsById: {},
    favoritesById: {},
    agentConversationsById: {},
    fileAnalysisRecordsById: {},
    preferences: { lastVisitedPath: "/" }
  };
}

export function createEmptyEnvelope(): MockEnvelope {
  return {
    schemaVersion: MOCK_SCHEMA_VERSION,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
    session: null,
    activeEnterpriseId: null,
    accountsById: {},
    enterprisesById: {},
    profileDraftsByEnterpriseId: {},
    riskDraftsByEnterpriseId: {},
    assessmentRunsById: {},
    reportSnapshotsById: {},
    favoritesById: {},
    agentConversationsById: {},
    fileAnalysisRecordsById: {},
    preferences: { lastVisitedPath: "/" },
  };
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function isValidEnvelope(value: unknown): value is MockEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MockEnvelope>;
  if (candidate.schemaVersion !== MOCK_SCHEMA_VERSION || typeof candidate.revision !== "number") return false;
  const maps = [
    candidate.accountsById,
    candidate.enterprisesById,
    candidate.profileDraftsByEnterpriseId,
    candidate.riskDraftsByEnterpriseId,
    candidate.assessmentRunsById,
    candidate.reportSnapshotsById,
    candidate.favoritesById,
    candidate.agentConversationsById,
    candidate.fileAnalysisRecordsById
  ];
  if (maps.some((map) => !map || typeof map !== "object" || Array.isArray(map))) return false;
  return Object.entries(candidate.enterprisesById ?? {}).every(([id, enterprise]) => id === enterprise.id);
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createMockDatabase(storage: KeyValueStorage | null = defaultStorage()): MockDatabase {
  let memory = createSeedEnvelope();

  const persist = (next: MockEnvelope) => {
    memory = clone(next);
    storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(next));
  };

  const load = (): MockEnvelope => {
    const raw = storage?.getItem(MOCK_STORAGE_KEY);
    if (!raw) return clone(memory);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidEnvelope(parsed)) return clone(parsed);
    } catch {
      storage?.removeItem(MOCK_STORAGE_KEY);
    }
    const seeded = createSeedEnvelope();
    persist(seeded);
    return seeded;
  };

  return {
    read() {
      return deepFreeze(load());
    },
    reset() {
      const seeded = createSeedEnvelope();
      persist(seeded);
      return deepFreeze(clone(seeded));
    },
    transact(mutator) {
      const draft = load();
      mutator(draft);
      draft.revision += 1;
      draft.updatedAt = new Date().toISOString();
      if (!isValidEnvelope(draft)) throw new Error("Mock 数据写入未通过结构校验");
      persist(draft);
      return deepFreeze(clone(draft));
    }
  };
}
