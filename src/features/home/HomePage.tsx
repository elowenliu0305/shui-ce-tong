import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { ErrorState, LoadingState } from "../../components/feedback/AsyncState";
import { AppIcon, type AppIconName } from "../../components/icons/AppIcon";
import { StatusBar } from "../../components/layout/StatusBar";
import type { KnowledgeListItem } from "../../domain/knowledge";

const services: { title: string; subtitle: string; icon: AppIconName; tone: string; to: string; accessibleLabel?: string }[] = [
  { title: "AI税务体检", subtitle: "全面诊断风险", icon: "shield", tone: "blue", to: "/assessment", accessibleLabel: "开始体检" },
  { title: "政策匹配", subtitle: "精准解读适用", icon: "search", tone: "yellow", to: "/knowledge", accessibleLabel: "资料" },
  { title: "风险预警", subtitle: "识别潜在风险", icon: "alert", tone: "red", to: "/reports/history" },
  { title: "智能问答", subtitle: "7×24小时", icon: "bot", tone: "violet", to: "/agent" },
  { title: "税务画像", subtitle: "企业税务全景", icon: "building", tone: "green", to: "/enterprises" },
  { title: "体检报告", subtitle: "生成专业报告", icon: "report", tone: "purple", to: "/reports/history" },
  { title: "文件解析", subtitle: "支持图片/文档", icon: "file", tone: "cyan", to: "/files" },
  { title: "更多服务", subtitle: "企业全场景", icon: "more", tone: "silver", to: "/me" }
];

const newsAppearance: Record<KnowledgeListItem["document"]["kind"], { label: string; tone: string; icon: AppIconName }> = {
  policy: { label: "政策", tone: "coins", icon: "tax" },
  news: { label: "时讯", tone: "desk", icon: "building" },
  case: { label: "案例", tone: "shield", icon: "shield" },
  other: { label: "资料", tone: "chart", icon: "report" },
};

function presentNews(item: KnowledgeListItem) {
  const { document } = item;
  const appearance = newsAppearance[document.kind];
  const status = document.effectiveStatus === "effective" ? "现行有效" : document.effectiveStatus === "expired" ? "已失效" : "效力待核验";
  return {
    id: document.id,
    title: document.title,
    summary: document.summary ?? "原文正在解析，可先查看来源与基本信息。",
    tags: [appearance.label, status, document.issuer[0] ?? "来源待核验"],
    date: document.publishedAt ?? document.createdAt.slice(0, 10),
    tone: appearance.tone,
    icon: appearance.icon,
  };
}

function HeroScene() {
  return <div className="ref-hero-scene" aria-hidden="true"><span className="ref-cap cap-one">政策精准匹配</span><span className="ref-cap cap-two">风险智能预警</span><span className="ref-cap cap-three">AI专业解答</span><svg viewBox="0 0 235 180"><defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#90c8ff"/></linearGradient><linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#43a9ff"/><stop offset="1" stopColor="#0647c8"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="141" cy="155" rx="88" ry="21" fill="#0e6eea" opacity=".6" filter="url(#glow)"/><ellipse cx="141" cy="148" rx="72" ry="17" fill="url(#stage)" stroke="#6bc8ff" strokeWidth="2"/><rect x="104" y="25" width="76" height="112" rx="8" fill="url(#paper)" transform="rotate(8 142 81)" opacity=".96"/><path d="M119 43h42M119 55h32M119 112h46" stroke="#7cb8fb" strokeWidth="4" strokeLinecap="round"/><text x="141" y="91" textAnchor="middle" fill="#1269ed" fontSize="42" fontWeight="900">税</text><rect x="68" y="112" width="16" height="26" rx="3" fill="#38aaff"/><rect x="88" y="101" width="16" height="37" rx="3" fill="#67c5ff"/><rect x="184" y="100" width="14" height="38" rx="3" fill="#45a5ff"/><rect x="201" y="85" width="14" height="53" rx="3" fill="#79caff"/><path d="M65 116c46 3 77-8 113-36l27-23" fill="none" stroke="#e7fbff" strokeWidth="5" strokeLinecap="round" filter="url(#glow)"/><path d="m195 56 17-5-6 17" fill="#e7fbff"/><rect x="184" y="34" width="36" height="26" rx="4" fill="#3b9aff" opacity=".65"/><path d="M191 43h18M191 49h12" stroke="#9cdbff" strokeWidth="2"/></svg></div>;
}

export function HomePage() {
  const { activeEnterpriseId, dependencies, session, state } = useAppContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [newsItems, setNewsItems] = useState<KnowledgeListItem[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const enterprise = activeEnterpriseId ? state.envelope.enterprisesById[activeEnterpriseId] : null;
  const taxpayer = activeEnterpriseId ? state.envelope.profileDraftsByEnterpriseId[activeEnterpriseId]?.fields.taxpayerType : null;
  const taxpayerLabel = taxpayer?.status === "known" ? taxpayer.value : "纳税人类型待确认";

  useEffect(() => {
    let cancelled = false;
    if (!session) return () => { cancelled = true; };
    void dependencies.knowledge.list(session.accountId, { enterpriseId: activeEnterpriseId ?? undefined }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setNewsItems(result.data.items.slice(0, 4));
        setNewsError(null);
      }
      else {
        setNewsItems([]);
        setNewsError(result.error.message);
      }
    });
    return () => { cancelled = true; };
  }, [activeEnterpriseId, dependencies, reloadKey, session]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate("/search", { state: { query: query.trim() } });
  }

  return <div className="ref-home-page">
    <section className="ref-home-top">
      <StatusBar light />
      <div className="ref-home-header"><div className="ref-brand-copy"><h1>税策通<sup>®</sup></h1><div className="ref-brand-sub">智&nbsp;&nbsp;能&nbsp;&nbsp;税&nbsp;&nbsp;务&nbsp;&nbsp;助&nbsp;&nbsp;手</div><div className="ref-brand-line"/><p>让税务更简单 · 让企业更强大</p></div><HeroScene /></div>
      <div className="ref-company-context"><span className="ref-company-icon"><AppIcon name="building" size={20}/></span><span className="ref-company-copy"><small>当前企业</small><h2>{enterprise?.name ?? "未选择企业"}</h2><em>{enterprise?.regionProvince}{enterprise?.regionCity} · {taxpayerLabel}</em></span><Link to="/enterprises">切换 <AppIcon name="chevron" size={15}/></Link></div>
      <p className="sr-only">企业资料用于政策筛选和金额估算；风险等级只由 10 道题决定。</p>
      <form className="ref-search" onSubmit={submitSearch}><label><AppIcon name="search" size={24}/><input aria-label="搜索政策、案例或税务问题" placeholder="搜索税收政策、案例、税务问题" value={query} onChange={(event) => setQuery(event.target.value)}/></label></form>
      <div className="ref-hot-row"><b>🔥 热门搜索：</b><div>{["研发加计扣除", "小微企业", "高新技术企业", "税务风险"].map((term) => <button key={term} type="button" onClick={() => navigate("/search", { state: { query: term } })}>{term}</button>)}</div></div>
      <div className="ref-service-panel">{services.map((item) => <Link className="ref-service" aria-label={item.accessibleLabel} key={item.title} to={item.to}><span className={`ref-service-icon ${item.tone}`}><AppIcon name={item.icon} size={26}/></span><strong>{item.title}</strong><small>{item.subtitle}</small></Link>)}</div>
    </section>
    <section className="ref-news-section"><div className="ref-news-head"><h2><i/>税务快讯</h2><Link to="/knowledge">查看更多 <AppIcon name="chevron" size={15}/></Link></div>{newsItems === null ? <LoadingState label="正在加载政策与时讯…" /> : newsError ? <ErrorState message={newsError} onRetry={() => setReloadKey((value) => value + 1)} /> : newsItems.length ? <div className="ref-news-list">{newsItems.map(presentNews).map((item) => <Link className="ref-news-item" key={item.id} to={`/knowledge/${item.id}`}><div className="ref-news-copy"><h3>{item.title}</h3><p>{item.summary}</p><div className="ref-news-meta"><div>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><time>{item.date}</time></div></div><div className={`ref-news-thumb ${item.tone}`}><span><AppIcon name={item.icon} size={32}/></span><i><AppIcon name="chevron" size={14}/></i></div></Link>)}</div> : <EmptyNews />}</section>
  </div>;
}

function EmptyNews() {
  return <div className="feedback-state"><strong>暂无政策与时讯</strong><p>资料入库后会在这里展示。</p></div>;
}
