import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { Enterprise } from "../../domain/enterprise";
import { useAppContext } from "../../app/app-context";
import { EnterpriseForm } from "./EnterpriseForm";

export function EditEnterprisePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { dependencies, refresh } = useAppContext();
  const [enterprise, setEnterprise] = useState<Enterprise | null | undefined>(undefined);

  useEffect(() => { void dependencies.enterprises.get(id).then((result) => setEnterprise(result.ok ? result.data : null)); }, [dependencies, id]);
  if (enterprise === undefined) return <LoadingState />;
  if (!enterprise) return <EmptyState title="企业不存在" description="该企业可能已经被删除。" />;

  return (
    <div className="page-stack">
      <PageHeader title="编辑企业" backTo="/enterprises" />
      <EnterpriseForm initial={enterprise} submitLabel="保存企业信息" onSubmit={async (input) => {
        const result = await dependencies.enterprises.update(id, input);
        if (!result.ok) return result.error.message;
        refresh();
        navigate("/enterprises");
        return null;
      }} />
    </div>
  );
}
