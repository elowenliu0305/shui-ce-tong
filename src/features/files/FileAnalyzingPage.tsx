import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState } from "../../components/feedback/AsyncState";

export function FileAnalyzingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const recordId = (location.state as { recordId?: string } | null)?.recordId;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!recordId || !activeEnterpriseId) return;
    let cancelled = false;
    let timer = 0;
    let attempt = 0;
    const poll = async () => {
      const result = await dependencies.files.refreshStatus(recordId, activeEnterpriseId);
      if (cancelled) return;
      if (!result.ok) { setError(result.error.message); return; }
      setStep((value) => Math.min(value + 1, 2));
      if (result.data.status === "completed" || result.data.status === "failed") {
        await refresh();
        if (!cancelled) navigate("/files/result", { replace: true, state: { recordId } });
        return;
      }
      attempt += 1;
      if (attempt >= 20) { setError("处理时间较长，可从文件记录稍后查看状态。"); return; }
      timer = window.setTimeout(() => { void poll(); }, 600);
    };
    timer = window.setTimeout(() => { void poll(); }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeEnterpriseId, dependencies, navigate, recordId, refresh, retry]);
  if (!recordId) return <EmptyState title="任务不存在" description="请重新选择文件和演示任务。" />;
  if (error) return <div className="page-stack"><ErrorState message={error} onRetry={() => { setError(null); setRetry((value) => value + 1); }} /></div>;
  return <div className="file-analyzing"><span className="spinner" /><p className="eyebrow">处理进度</p><h1>{step === 0 ? "确认私有文件" : "生成安全结果"}</h1><p>系统会明确区分未读取、部分读取、处理完成或失败，不会把失败伪装成分析结论。</p><div className="question-progress"><i style={{ width: `${step ? 72 : 32}%` }} /></div></div>;
}
