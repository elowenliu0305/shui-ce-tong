import { createBrowserRouter, Outlet } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { MobileCanvas } from "../components/layout/MobileCanvas";
import { PageHeader } from "../components/layout/PageHeader";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage";
import { AnalyzingPage } from "../features/assessment/AnalyzingPage";
import { AssessmentConfirmPage } from "../features/assessment/AssessmentConfirmPage";
import { AssessmentIntroPage } from "../features/assessment/AssessmentIntroPage";
import { AssessmentMethodPage } from "../features/assessment/AssessmentMethodPage";
import { ProfilePage as AssessmentProfilePage } from "../features/assessment/ProfilePage";
import { QuestionnairePage } from "../features/assessment/QuestionnairePage";
import { EditEnterprisePage } from "../features/enterprises/EditEnterprisePage";
import { EnterpriseListPage } from "../features/enterprises/EnterpriseListPage";
import { NewEnterprisePage } from "../features/enterprises/NewEnterprisePage";
import { HomePage } from "../features/home/HomePage";
import { KnowledgeDetailPage } from "../features/knowledge/KnowledgeDetailPage";
import { KnowledgePage } from "../features/knowledge/KnowledgePage";
import { SearchPage } from "../features/knowledge/SearchPage";
import { FavoritesPage } from "../features/profile/FavoritesPage";
import { AgentHistoryPage } from "../features/agent/AgentHistoryPage";
import { AgentPage } from "../features/agent/AgentPage";
import { FileAnalyzingPage } from "../features/files/FileAnalyzingPage";
import { FileHistoryPage } from "../features/files/FileHistoryPage";
import { FileResultPage } from "../features/files/FileResultPage";
import { FileSelectPage } from "../features/files/FileSelectPage";
import { FileTaskPage } from "../features/files/FileTaskPage";
import { ProfilePage as UserProfilePage } from "../features/profile/ProfilePage";
import { PolicyDetailPage } from "../features/reports/PolicyDetailPage";
import { PolicyListPage } from "../features/reports/PolicyListPage";
import { ReportHistoryPage } from "../features/reports/ReportHistoryPage";
import { ReportPage } from "../features/reports/ReportPage";
import { RiskDetailPage } from "../features/reports/RiskDetailPage";
import { RiskListPage } from "../features/reports/RiskListPage";
import { AuthenticatedGuard, EnterpriseGuard } from "./route-guards";

function AuthGate() {
  return <AuthenticatedGuard><Outlet /></AuthenticatedGuard>;
}

function EnterpriseGate() {
  return <EnterpriseGuard><Outlet /></EnterpriseGuard>;
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-stack">
      <PageHeader title={title} />
      <section className="placeholder-card">
        <span className="brand-mark brand-mark--small">税</span>
        <p className="eyebrow">正式前端搭建中</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
    </div>
  );
}

const page = (title: string, description: string) => <PlaceholderPage title={title} description={description} />;

export const appRouter = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <AuthGate />,
    children: [
      { path: "/enterprises/new", element: <NewEnterprisePage /> },
      {
        element: <EnterpriseGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/enterprises", element: <EnterpriseListPage /> },
              { path: "/enterprises/:id/edit", element: <EditEnterprisePage /> },
              { path: "/assessment", element: <AssessmentIntroPage /> },
              { path: "/assessment/method", element: <AssessmentMethodPage /> },
              { path: "/assessment/profile", element: <AssessmentProfilePage /> },
              { path: "/assessment/questions/:index", element: <QuestionnairePage /> },
              { path: "/assessment/confirm", element: <AssessmentConfirmPage /> },
              { path: "/assessment/analyzing", element: <AnalyzingPage /> },
              { path: "/reports/history", element: <ReportHistoryPage /> },
              { path: "/reports/:reportId", element: <ReportPage /> },
              { path: "/reports/:reportId/policies", element: <PolicyListPage /> },
              { path: "/reports/:reportId/policies/:policyId", element: <PolicyDetailPage /> },
              { path: "/reports/:reportId/risks", element: <RiskListPage /> },
              { path: "/reports/:reportId/risks/:riskId", element: <RiskDetailPage /> },
              { path: "/knowledge", element: <KnowledgePage /> },
              { path: "/search", element: <SearchPage /> },
              { path: "/knowledge/:documentId", element: <KnowledgeDetailPage /> },
              { path: "/agent", element: <AgentPage /> },
              { path: "/agent/history", element: <AgentHistoryPage /> },
              { path: "/files", element: <FileSelectPage /> },
              { path: "/files/task", element: <FileTaskPage /> },
              { path: "/files/analyzing", element: <FileAnalyzingPage /> },
              { path: "/files/result", element: <FileResultPage /> },
              { path: "/files/history", element: <FileHistoryPage /> },
              { path: "/me", element: <UserProfilePage /> },
              { path: "/favorites", element: <FavoritesPage /> },
              { path: "/settings", element: page("设置", "管理演示账号和本地数据。") }
            ]
          }
        ]
      }
    ]
  },
  { path: "*", element: <MobileCanvas>{page("页面不存在", "请从底部导航返回可用页面。")}</MobileCanvas> }
]);
