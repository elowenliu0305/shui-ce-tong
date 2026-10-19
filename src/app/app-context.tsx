import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";

import type { AccountSession } from "../domain/shared";
import type { AuthService } from "../services/contracts/auth-service";
import type { AssessmentService } from "../services/contracts/assessment-service";
import type { AgentService } from "../services/contracts/agent-service";
import type { EnterpriseService } from "../services/contracts/enterprise-service";
import type { KnowledgeService } from "../services/contracts/knowledge-service";
import type { FileAnalysisService } from "../services/contracts/file-analysis-service";
import type { AppSnapshotSource } from "../services/contracts/app-snapshot-source";
import type { MockEnvelope } from "../services/mock/mock-database";

interface AppState {
  envelope: Readonly<MockEnvelope>;
  busy: boolean;
  hydrated: boolean;
  notice: string | null;
}

type AppAction =
  | { type: "refresh"; envelope: Readonly<MockEnvelope> }
  | { type: "refresh-start" }
  | { type: "refresh-failed"; message: string }
  | { type: "set-busy"; busy: boolean }
  | { type: "set-notice"; notice: string | null };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "refresh":
      return { ...state, envelope: action.envelope, busy: false, hydrated: true };
    case "refresh-start":
      return { ...state, busy: true };
    case "refresh-failed":
      return { ...state, busy: false, hydrated: true, notice: action.message };
    case "set-busy":
      return { ...state, busy: action.busy };
    case "set-notice":
      return { ...state, notice: action.notice };
  }
}

export interface AppDependencies {
  snapshot: AppSnapshotSource;
  auth: AuthService;
  assessment: AssessmentService;
  agent: AgentService;
  enterprises: EnterpriseService;
  knowledge: KnowledgeService;
  files: FileAnalysisService;
}

interface AppContextValue {
  state: AppState;
  session: AccountSession | null;
  activeEnterpriseId: string | null;
  dependencies: AppDependencies;
  dispatch: Dispatch<AppAction>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ dependencies, children }: { dependencies: AppDependencies; children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    envelope: dependencies.snapshot.initial(),
    busy: !dependencies.snapshot.readyInitially,
    hydrated: dependencies.snapshot.readyInitially,
    notice: null
  });

  const refresh = useCallback(async () => {
    dispatch({ type: "refresh-start" });
    try {
      dispatch({ type: "refresh", envelope: await dependencies.snapshot.read() });
    } catch (error) {
      dispatch({ type: "refresh-failed", message: error instanceof Error ? error.message : "数据刷新失败，请稍后重试" });
    }
  }, [dependencies]);

  useEffect(() => {
    if (!dependencies.snapshot.readyInitially) void refresh();
  }, [dependencies, refresh]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    session: state.envelope.session,
    activeEnterpriseId: state.envelope.activeEnterpriseId,
    dependencies,
    dispatch,
    refresh
  }), [dependencies, refresh, state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext 必须在 AppStateProvider 中使用");
  return value;
}
