import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { KnowledgeKind, KnowledgeListItem } from "../../domain/knowledge";
import { KnowledgeCard } from "./KnowledgeCard";

export function KnowledgePage() {
  const { session, activeEnterpriseId, dependencies } = useAppContext();
  const [kind, setKind] = useState<KnowledgeKind | "all">("all");
  const [items, setItems] = useState<KnowledgeListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!session) return () => { cancelled = true; };
    void dependencies.knowledge.list(session.accountId, { kind, enterpriseId: activeEnterpriseId ?? undefined }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setItems(result.data.items);
        setError(null);
      }
      else {
        setItems([]);
        setError(result.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, kind, reloadKey, session]);
  return <div className="page-stack knowledge-page"><PageHeader title="政策与时讯" /><Link className="search-entry" to="/search">⌕ 搜索标题、文号、机构和正文</Link><div className="filter-tabs" role="tablist">{(["all", "policy", "news", "case", "other"] as const).map((value) => <button role="tab" aria-selected={kind === value} key={value} onClick={() => setKind(value)}>{value === "all" ? "全部" : value === "policy" ? "政策" : value === "news" ? "时讯" : value === "case" ? "案例" : "其他"}</button>)}</div>{items === null ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : items.length ? <div className="knowledge-list">{items.map((item) => <KnowledgeCard key={item.document.id} item={item} />)}</div> : <EmptyState title="暂无资料" description="当前筛选下没有可展示的资料。" />}</div>;
}
