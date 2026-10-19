import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { PageHeader } from "../../components/layout/PageHeader";
import type { AgentConversation } from "../../domain/agent";
import { createAgentHref } from "./agent-navigation";

export function AgentHistoryPage() {
  const { activeEnterpriseId, dependencies } = useAppContext();
  const [conversations, setConversations] = useState<AgentConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!activeEnterpriseId) return () => { cancelled = true; };
    void dependencies.agent.listConversations(activeEnterpriseId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setConversations(result.data);
        setError(null);
      } else {
        setConversations([]);
        setError(result.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, reloadKey]);
  return <div className="page-stack"><PageHeader title="AI 会话" backTo="/agent" />{conversations === null ? <LoadingState label="正在加载会话…" /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : conversations.length ? <div className="conversation-list">{conversations.map((conversation) => <Link className="conversation-card card" to={createAgentHref({ conversationId: conversation.id, reportId: conversation.reportSnapshotId, documentId: conversation.knowledgeDocumentId })} key={conversation.id}><b>{conversation.title}</b><p>{conversation.messages.at(-1)?.content}</p><span>{new Date(conversation.updatedAt).toLocaleString("zh-CN")}</span></Link>)}</div> : <EmptyState title="还没有会话" description="当前企业的 AI 对话会显示在这里，切换企业后不会串档。" />}</div>;
}
