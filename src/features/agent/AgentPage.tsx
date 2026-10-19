import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { AppIcon } from "../../components/icons/AppIcon";
import { StatusBar } from "../../components/layout/StatusBar";
import type { AgentMessage } from "../../domain/agent";

const suggestions = ["先处理哪个风险？", "研发费用加计扣除有什么依据？", "怎么改善现金流？"];

export function AgentPage() {
  const { activeEnterpriseId, state, dependencies } = useAppContext();
  const [params, setParams] = useSearchParams();
  const reportId = params.get("reportId") ?? undefined;
  const documentId = params.get("documentId") ?? undefined;
  const routeConversationId = params.get("conversationId") ?? undefined;
  const [conversationId, setConversationId] = useState(routeConversationId);
  const [loadedEnterpriseId, setLoadedEnterpriseId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enterprise = activeEnterpriseId ? state.envelope.enterprisesById[activeEnterpriseId] : null;

  useEffect(() => {
    if (!routeConversationId || !activeEnterpriseId) return;
    void dependencies.agent.getConversation(routeConversationId, activeEnterpriseId).then((result) => {
      if (result.ok) {
        setConversationId(result.data.id);
        setMessages(result.data.messages);
        setLoadedEnterpriseId(activeEnterpriseId);
        setError("");
      } else setError(result.error.message);
    });
  }, [activeEnterpriseId, dependencies, routeConversationId]);

  async function ask(value: string) {
    if (!activeEnterpriseId || !value.trim() || busy) return;
    setBusy(true);
    setError("");
    const activeConversationId = loadedEnterpriseId === activeEnterpriseId ? conversationId : undefined;
    const result = await dependencies.agent.ask({ enterpriseId: activeEnterpriseId, conversationId: activeConversationId, reportSnapshotId: reportId, knowledgeDocumentId: documentId, message: value.trim() });
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    setConversationId(result.data.conversationId);
    setParams((current) => { const next = new URLSearchParams(current); next.set("conversationId", result.data.conversationId); return next; }, { replace: true });
    const conversation = await dependencies.agent.getConversation(result.data.conversationId, activeEnterpriseId);
    if (conversation.ok) {
      setMessages(conversation.data.messages);
      setLoadedEnterpriseId(activeEnterpriseId);
    }
    setInput("");
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(input); }
  const contextLabel = reportId ? "已绑定报告快照" : documentId ? "已绑定资料来源" : "当前企业上下文";
  const visibleMessages = loadedEnterpriseId === activeEnterpriseId ? messages : [];
  return <div className="agent-page ai-page"><section className="ai-hero"><StatusBar light/><div className="home-top"><div><h1>AI 经营助手</h1><p>税务有依据，经营问题也能聊</p></div><Link className="icon-btn light" to="/agent/history" aria-label="历史会话"><AppIcon name="history" size={21}/></Link></div><div className="ai-context"><AppIcon name="report" size={17}/><span>{contextLabel}：{enterprise?.name}</span></div></section><main className="chat-feed"><article className="message assistant"><span className="avatar"><AppIcon name="bot" size={18}/></span><div className="bubble">你好，我是税策通 AI Agent。税务与政策问题我会先检索依据并附来源；其他经营问题也可以问我，我会优先从小微企业的现金流、融资、成本和经营视角协助你。</div></article>{visibleMessages.map((message) => <article className={`message ${message.role}`} key={message.id}><span className="avatar"><AppIcon name={message.role === "assistant" ? "bot" : "user"} size={18}/></span><div className="bubble"><p>{message.content}</p>{message.status === "insufficient-evidence" ? <span className="chat-status warning">依据不足</span> : null}{message.status === "tool-error" || message.status === "model-error" ? <span className="chat-status error">{message.status === "model-error" ? "回答服务异常，可重试" : "检索或上下文服务异常，可重试"}</span> : null}{message.citations.length ? <div className="citation-list">{message.citations.map((citation) => <Link key={`${citation.documentId}-${citation.locator}`} to={`/knowledge/${citation.documentId}`}><b>{citation.title}</b><span>{citation.docNo ? `${citation.docNo} · ` : ""}{citation.locator}</span>{citation.excerpt ? <small>{citation.excerpt}</small> : null}</Link>)}</div> : null}{message.suggestedFollowUps.length ? <div className="follow-ups">{message.suggestedFollowUps.map((item) => <button key={item} onClick={() => void ask(item)}>{item}</button>)}</div> : null}</div></article>)}{busy ? <article className="message assistant"><span className="avatar"><AppIcon name="bot" size={18}/></span><div className="bubble">正在分析上下文…</div></article> : null}</main>{!visibleMessages.length ? <div className="suggestions">{suggestions.map((item) => <button className="suggestion" key={item} onClick={() => void ask(item)}>{item}</button>)}</div> : null}{error ? <p className="form-error agent-error" role="alert">{error}</p> : null}<form className="chat-compose" onSubmit={submit}><span className="icon-btn"><AppIcon name="file" size={20}/></span><input aria-label="向 AI 提问" value={input} onChange={(event) => setInput(event.target.value)} placeholder="问税务、融资、现金流或经营问题…"/><button className="icon-btn send" aria-label="发送" disabled={busy || !input.trim()} type="submit"><AppIcon name="arrow" size={19}/></button></form></div>;
}
