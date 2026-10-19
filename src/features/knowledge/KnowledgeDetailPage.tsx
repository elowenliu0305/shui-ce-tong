import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import type { DownloadDescriptor, KnowledgeListItem } from "../../domain/knowledge";
import { FavoriteButton } from "./FavoriteButton";
import { createAgentHref } from "../agent/agent-navigation";

export function KnowledgeDetailPage() {
  const { documentId = "" } = useParams();
  const { session, activeEnterpriseId, dependencies } = useAppContext();
  const [item, setItem] = useState<KnowledgeListItem | null | undefined>(undefined);
  const [download, setDownload] = useState<DownloadDescriptor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!session) return () => { cancelled = true; };
    void dependencies.knowledge.get(session.accountId, documentId, activeEnterpriseId ?? undefined).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setItem(result.data);
        setError(null);
      }
      else if (result.error.code === "NOT_FOUND") setItem(null);
      else {
        setItem(null);
        setError(result.error.message);
      }
    });
    void dependencies.knowledge.getDownload(documentId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDownload(result.data);
        setDownloadError(null);
      }
      else setDownloadError(result.error.message);
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, documentId, reloadKey, session]);
  if (item === undefined) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  if (!item) return <EmptyState title="资料不存在" description="该资料可能已被移除。" />;
  const { document } = item;
  return <div className="page-stack knowledge-detail"><PageHeader title="资料详情" backTo="/knowledge" action={<FavoriteButton documentId={document.id} initial={item.favorite} />} /><section className="card knowledge-detail__hero"><div><StatusBadge tone={document.effectiveStatus === "effective" ? "success" : document.effectiveStatus === "expired" ? "danger" : "warning"}>{document.effectiveStatus === "effective" ? "现行有效" : document.effectiveStatus === "expired" ? "已失效" : "效力待核验"}</StatusBadge><StatusBadge tone={document.parseStatus === "parsed" ? "brand" : "warning"}>{document.parseStatus === "parsed" ? "全文已解析" : document.parseStatus === "partial" ? "部分解析" : "解析失败"}</StatusBadge></div><h1>{document.title}</h1><dl><div><dt>文号</dt><dd>{document.docNo ?? "未提取"}</dd></div><div><dt>发布机构</dt><dd>{document.issuer.join("、") || "未提取"}</dd></div><div><dt>发布日期</dt><dd>{document.publishedAt ?? "未提取"}</dd></div><div><dt>规则用途</dt><dd>{document.matchEligibility === "structured-verified" ? "可参与结构化匹配" : "仅检索查看"}</dd></div></dl></section><section className="card document-body"><h2>资料内容</h2>{document.fullText ? <p>{document.fullText}</p> : <div className="parse-warning">原文件未成功解析，因此不展示推测正文。你仍可通过下方入口获取原文件。</div>}</section><section className="download-card card"><div><b>{download?.fileName ?? "原始文件"}</b><span>{downloadError ?? download?.mimeType ?? "文件类型未知"}</span></div><button disabled={!download?.available} onClick={() => { if (!download?.downloadRef) return; if (download.downloadRef.startsWith("mock://")) window.alert("演示环境已校验原文件下载入口；生产环境将打开短期签名链接。"); else window.open(download.downloadRef, "_blank", "noopener,noreferrer"); }}>下载原文件</button></section><Link className="button button--secondary" to={createAgentHref({ documentId: document.id })}>✦ 基于本资料问 AI</Link></div>;
}
