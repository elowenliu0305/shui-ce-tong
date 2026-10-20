import { useNavigate } from "react-router-dom";

import { MobileCanvas } from "../../components/layout/MobileCanvas";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAppContext } from "../../app/app-context";
import { EnterpriseForm } from "./EnterpriseForm";

export function NewEnterprisePage() {
  const { session, dependencies, refresh } = useAppContext();
  const navigate = useNavigate();

  return (
    <MobileCanvas>
      <main className="standalone-page page-stack">
        <PageHeader title="创建企业" />
        <section className="onboarding-copy"><p className="eyebrow">第一步</p><h2>先建立你的企业档案</h2><p>账号可以管理多家企业；体检、报告、AI 会话和文件记录会按企业隔离。</p></section>
        <EnterpriseForm submitLabel="创建并进入首页" onSubmit={async (input) => {
          if (!session) return "登录状态已失效，请重新登录";
          const result = await dependencies.enterprises.create(session.accountId, input);
          if (!result.ok) return result.error.message;
          await refresh();
          navigate("/", { replace: true });
          return null;
        }} />
      </main>
    </MobileCanvas>
  );
}
