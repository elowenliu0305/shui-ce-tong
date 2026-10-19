import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { FileAnalysisRecord } from "../../domain/file-analysis";

export function FileHistoryPage() {
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [records, setRecords] = useState<FileAnalysisRecord[] | null>(null);
  const [loadedEnterpriseId, setLoadedEnterpriseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!activeEnterpriseId) return () => { cancelled = true; };
    void dependencies.files.list(activeEnterpriseId).then((result) => {
      if (cancelled) return;
      setLoadedEnterpriseId(activeEnterpriseId);
      if (result.ok) { setRecords(result.data); setError(null); }
      else { setRecords([]); setError(result.error.message); }
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, reload]);
  const visibleRecords = loadedEnterpriseId === activeEnterpriseId ? records : null;
  return <div className="page-stack"><PageHeader title="文件记录" backTo="/files" />{visibleRecords === null ? <LoadingState label="正在加载文件记录…" /> : error ? <ErrorState message={error} onRetry={() => setReload((value) => value + 1)} /> : visibleRecords.length ? <div className="file-record-list">{visibleRecords.map((record) => <article className="card file-record" key={record.id}><Link to="/files/result" state={{ recordId: record.id }}><b>{record.displayName}</b><span>{record.selectedTask} · {record.readingStatus === "not-read" ? "正文未读取" : record.readingStatus === "partial" ? "正文部分读取" : record.readingStatus === "failed" ? "处理失败" : "正文已读取"}</span></Link><button disabled={busyId === record.id} onClick={async () => { if (!activeEnterpriseId || !window.confirm("确认删除这份文件、派生内容和分析记录？删除后无法恢复。")) return; setBusyId(record.id); const result = await dependencies.files.delete(record.id, activeEnterpriseId); setBusyId(null); if (result.ok) { await refresh(); setReload((value) => value + 1); } else setError(result.error.message); }}>{busyId === record.id ? "删除中…" : "删除"}</button></article>)}</div> : <EmptyState title="还没有文件记录" description="选择文件并完成一次流程后会显示在这里。" />}</div>;
}
