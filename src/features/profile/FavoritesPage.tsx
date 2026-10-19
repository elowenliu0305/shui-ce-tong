import { useEffect, useState } from "react";

import { useAppContext } from "../../app/app-context";
import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { KnowledgeListItem } from "../../domain/knowledge";
import { KnowledgeCard } from "../knowledge/KnowledgeCard";

export function FavoritesPage() {
  const { session, activeEnterpriseId, dependencies } = useAppContext();
  const [items, setItems] = useState<KnowledgeListItem[] | null>(null);
  useEffect(() => { if (session) void dependencies.knowledge.list(session.accountId, { favoritesOnly: true, enterpriseId: activeEnterpriseId ?? undefined }).then((result) => setItems(result.ok ? result.data.items : [])); }, [activeEnterpriseId, dependencies, session]);
  return <div className="page-stack"><PageHeader title="我的收藏" backTo="/me" />{items === null ? <LoadingState /> : items.length ? <div className="knowledge-list">{items.map((item) => <KnowledgeCard key={item.document.id} item={item} />)}</div> : <EmptyState title="还没有收藏" description="在资料详情页点击收藏后，会显示在这里；收藏不随企业删除。" />}</div>;
}
