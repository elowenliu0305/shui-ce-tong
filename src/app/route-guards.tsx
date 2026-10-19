import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingState } from "../components/feedback/AsyncState";
import { useAppContext } from "./app-context";

export function AuthenticatedGuard({ children }: { children: ReactNode }) {
  const { session, state } = useAppContext();
  const location = useLocation();

  if (!state.hydrated) return <LoadingState />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!session.emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
}

export function EnterpriseGuard({ children }: { children: ReactNode }) {
  const { session, state, activeEnterpriseId } = useAppContext();
  const enterprises = Object.values(state.envelope.enterprisesById).filter((item) => item.accountId === session?.accountId);

  if (!state.hydrated) return <LoadingState />;
  if (!activeEnterpriseId || !enterprises.some((item) => item.id === activeEnterpriseId)) {
    return <Navigate to="/enterprises/new" replace />;
  }
  return children;
}
