import { useMemo, type ReactNode } from "react";

import type { AppSnapshotSource } from "../services/contracts/app-snapshot-source";
import { MockAuthService } from "../services/mock/mock-auth-service";
import { MockAssessmentService } from "../services/mock/mock-assessment-service";
import { MockAgentService } from "../services/mock/mock-agent-service";
import { createMockDatabase } from "../services/mock/mock-database";
import { MockEnterpriseService } from "../services/mock/mock-enterprise-service";
import { MockFileAnalysisService } from "../services/mock/mock-file-analysis-service";
import { MockKnowledgeService } from "../services/mock/mock-knowledge-service";
import { SupabaseAuthService } from "../services/supabase/supabase-auth-service";
import { SupabaseAssessmentService } from "../services/supabase/supabase-assessment-service";
import { SupabaseAgentService } from "../services/supabase/supabase-agent-service";
import { getDataBackend } from "../services/supabase/config";
import { SupabaseEnterpriseService } from "../services/supabase/supabase-enterprise-service";
import { SupabaseFileAnalysisService } from "../services/supabase/supabase-file-analysis-service";
import { SupabaseKnowledgeService } from "../services/supabase/supabase-knowledge-service";
import { SupabaseSnapshotSource } from "../services/supabase/supabase-snapshot-source";
import { AppStateProvider, type AppDependencies } from "./app-context";

function createMockDependencies(): AppDependencies {
  const database = createMockDatabase();
  const snapshot: AppSnapshotSource = {
    readyInitially: true,
    initial: () => database.read(),
    read: async () => database.read(),
  };
  return {
    snapshot,
    auth: new MockAuthService(database),
    assessment: new MockAssessmentService(database),
    agent: new MockAgentService(database),
    enterprises: new MockEnterpriseService(database),
    knowledge: new MockKnowledgeService(database),
    files: new MockFileAnalysisService(database),
  };
}

function createSupabaseDependencies(): AppDependencies {
  const auth = new SupabaseAuthService();
  const enterprises = new SupabaseEnterpriseService();
  return {
    snapshot: new SupabaseSnapshotSource(auth, enterprises),
    auth,
    enterprises,
    assessment: new SupabaseAssessmentService(),
    knowledge: new SupabaseKnowledgeService(),
    agent: new SupabaseAgentService(),
    files: new SupabaseFileAnalysisService(),
  };
}

export function AppProviders({ children, dependencies }: { children: ReactNode; dependencies?: AppDependencies }) {
  const resolved = useMemo<AppDependencies>(() => {
    if (dependencies) return dependencies;
    return getDataBackend() === "supabase" ? createSupabaseDependencies() : createMockDependencies();
  }, [dependencies]);
  return <AppStateProvider dependencies={resolved}>{children}</AppStateProvider>;
}
