import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { LoadingState } from "../../components/feedback/AsyncState";

export function AnalyzingPage() {
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!activeEnterpriseId) return;
    const timer = window.setTimeout(() => {
      void dependencies.assessment.complete(activeEnterpriseId).then(async (response) => {
        if (response.ok) {
          await refresh();
          navigate(`/reports/${response.data.id}`, { replace: true });
        }
        else setError(response.error.message);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeEnterpriseId, dependencies, navigate, refresh]);

  if (!error) return <LoadingState label="正在计算风险、匹配政策并生成报告快照…" />;
  return <div className="analysis-result"><span className="analysis-check analysis-check--error">!</span><h2>报告生成失败</h2><p>{error}</p><Link className="button button--primary" to="/assessment/confirm">返回检查</Link></div>;
}
