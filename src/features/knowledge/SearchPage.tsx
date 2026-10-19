import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { KnowledgeListItem } from "../../domain/knowledge";
import { KnowledgeCard } from "./KnowledgeCard";

export function SearchPage() {
  const { session, activeEnterpriseId, dependencies } = useAppContext();
  const location = useLocation();
  const initialQuery = (location.state as { query?: string } | null)?.query ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);
  const runSearch = useCallback(async (value: string) => {
    if (!session) return;
    const normalized = value.trim();
    setSubmitted(normalized);
    setError(null);
    if (!normalized) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await dependencies.knowledge.list(session.accountId, { query: normalized, enterpriseId: activeEnterpriseId ?? undefined });
    setLoading(false);
    if (result.ok) setItems(result.data.items);
    else {
      setItems([]);
      setError(result.error.message);
    }
  }, [activeEnterpriseId, dependencies, session]);
  async function search(event: FormEvent) {
    event.preventDefault();
    await runSearch(query);
  }
  useEffect(() => {
    let cancelled = false;
    if (!initialQuery || !session) return () => { cancelled = true; };
    void dependencies.knowledge.list(session.accountId, { query: initialQuery, enterpriseId: activeEnterpriseId ?? undefined }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setItems(result.data.items);
        setError(null);
      } else {
        setItems([]);
        setError(result.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, initialQuery, session]);
  return <div className="page-stack search-page"><PageHeader title="全库搜索" backTo="/knowledge" /><form className="search-form" onSubmit={search}><input aria-label="搜索资料" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词" autoFocus /><button type="submit" disabled={loading}>搜索</button></form>{submitted ? <p className="search-count">“{submitted}”找到 {items.length} 条结果</p> : <p className="search-count">可检索标题、文号、发布机构、摘要和已解析正文。</p>}{loading ? <LoadingState label="正在搜索全部资料…" /> : error ? <ErrorState message={error} onRetry={() => void runSearch(submitted)} /> : submitted && !items.length ? <EmptyState title="没有找到相关资料" description="换一个关键词，或返回资料库按类型浏览。" /> : <div className="knowledge-list">{items.map((item) => <KnowledgeCard key={item.document.id} item={item} />)}</div>}</div>;
}
