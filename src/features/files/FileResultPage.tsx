import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import type { FileAnalysisRecord } from "../../domain/file-analysis";

export function FileResultPage() {
  const location = useLocation();
  const recordId = (location.state as { recordId?: string } | null)?.recordId;
  const { activeEnterpriseId, dependencies } = useAppContext();
  const [record, setRecord] = useState<FileAnalysisRecord | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => { if (recordId && activeEnterpriseId) void dependencies.files.get(recordId, activeEnterpriseId).then((result) => setRecord(result.ok ? result.data : null)); }, [activeEnterpriseId, dependencies, recordId]);
  if (!recordId) return <EmptyState title="结果不存在" description="请从文件分析页开始。" />;
  if (record === undefined) return <LoadingState />;
  if (!record) return <EmptyState title="记录不存在" description="记录可能已被删除。" />;
  const readingLabel = record.readingStatus === "complete" ? "已完整读取" : record.readingStatus === "partial" ? "部分读取" : record.readingStatus === "failed" ? "读取失败" : "未读取";
  const failed = record.status === "failed";
  return <div className="file-result"><span className="analysis-check">{failed ? "!" : "✓"}</span><StatusBadge tone={failed ? "danger" : record.contentRead ? "success" : "warning"}>{readingLabel}</StatusBadge><h1>{failed ? "文件处理失败" : "文件流程完成"}</h1><p>{failed ? "没有生成未经验证的文件事实。你可以删除记录后重新上传。" : record.resultSummary}</p><section className="card"><div><span>文件名</span><b>{record.displayName}</b></div><div><span>任务</span><b>{record.selectedTask}</b></div><div><span>正文读取</span><b>{readingLabel}</b></div></section>{error ? <p className="form-error" role="alert">{error}</p> : null}{record.sourceAvailable ? <button className="button" onClick={async () => { if (!activeEnterpriseId) return; const result = await dependencies.files.getDownloadUrl(record.id, activeEnterpriseId); if (result.ok) window.open(result.data, "_blank", "noopener,noreferrer"); else setError(result.error.message); }}>下载原文件</button> : null}<Link className="button button--primary" to="/files/history">查看文件记录</Link></div>;
}
