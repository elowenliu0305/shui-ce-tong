import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState } from "../../components/feedback/AsyncState";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import type { FileAnalysisTask, FileUploadSelection } from "../../domain/file-analysis";

const tasks: { id: FileAnalysisTask; title: string; description: string }[] = [
  { id: "tax-health", title: "税务健康检查", description: "演示风险归类和核验清单。" },
  { id: "rd-check", title: "研发费用归集", description: "演示研发资料完整性检查。" },
  { id: "invoice-check", title: "发票异常检查", description: "演示发票风险提示流程。" },
  { id: "cashflow-summary", title: "现金流摘要", description: "演示小微企业现金流任务。" }
];

export function FileTaskPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const selection = (location.state as { selection?: FileUploadSelection } | null)?.selection;
  const [task, setTask] = useState<FileAnalysisTask>("tax-health");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!selection) return <EmptyState title="尚未选择文件" description="请返回文件分析页重新选择。" />;
  return <div className="page-stack"><PageHeader title="选择分析任务" backTo="/files" /><section className="selected-file card"><b>{selection.displayName}</b><span>仅用于当前企业 · 删除时一并清理</span></section><div className="task-list">{tasks.map((item) => <button className={task === item.id ? "selected" : ""} key={item.id} onClick={() => setTask(item.id)}><span>{task === item.id ? "✓" : ""}</span><div><b>{item.title}</b><p>{item.description}</p></div></button>)}</div>{error ? <p className="form-error" role="alert">{error}</p> : null}<Button disabled={busy} onClick={async () => { if (!activeEnterpriseId) return; setBusy(true); setError(""); const result = await dependencies.files.register(activeEnterpriseId, selection, task); setBusy(false); if (result.ok) { await refresh(); navigate("/files/analyzing", { state: { recordId: result.data.id } }); } else setError(result.error.message); }}>{busy ? "正在安全上传…" : "开始上传并分析"}</Button></div>;
}
