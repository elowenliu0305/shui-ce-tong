import { Link, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { AppIcon } from "../../components/icons/AppIcon";
import { StatusBar } from "../../components/layout/StatusBar";

const asset = (name: string) => `/prototype-assets/${name}`;

const links = [
  { to: "/enterprises", label: "企业管理", description: "创建、查看和切换多家企业档案", asset: "profile-building.png" },
  { to: "/reports/history", label: "历史体检报告", description: "查看不同时期节点的机会与风险变化", asset: "profile-report.png" },
  { to: "/favorites", label: "收藏内容", description: "集中查看已收藏的政策与案例", asset: "profile-star.png" },
  { to: "/agent/history", label: "AI 历史会话", description: "继续当前企业上下文的咨询", asset: "profile-chat.png" },
  { to: "/files/history", label: "文件记录", description: "管理历史文件元数据与演示结果", asset: "profile-folder.png" }
];

function ProfileIllustration() {
  return <div className="profile-full-illustration" aria-hidden="true"><svg viewBox="0 0 200 160"><defs><linearGradient id="pfCard" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8f4ff"/><stop offset="1" stopColor="#b0d8ff"/></linearGradient><linearGradient id="pfBar" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#4090ff"/><stop offset="1" stopColor="#80d0ff"/></linearGradient></defs><ellipse cx="110" cy="145" rx="70" ry="12" fill="rgba(60,140,255,.2)"/><rect x="50" y="20" width="100" height="120" rx="12" fill="url(#pfCard)" transform="rotate(5 100 80)" opacity=".9"/><circle cx="85" cy="55" r="14" fill="rgba(100,170,255,.3)"/><path d="M85 48a7 7 0 0 1 7 7c0 4-3 7-7 7s-7-3-7-7a7 7 0 0 1 7-7zm0 16c-6 0-18 3-18 10v4h36v-4c0-7-12-10-18-10z" fill="rgba(100,170,255,.35)"/><rect x="105" y="50" width="30" height="4" rx="2" fill="rgba(100,170,255,.3)"/><rect x="105" y="60" width="22" height="4" rx="2" fill="rgba(100,170,255,.25)"/><rect x="130" y="30" width="24" height="28" rx="6" fill="#0b66f2" opacity=".85"/><text x="142" y="50" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900">税</text><rect x="45" y="105" width="12" height="25" rx="3" fill="url(#pfBar)" opacity=".7"/><rect x="62" y="112" width="12" height="18" rx="3" fill="url(#pfBar)" opacity=".5"/></svg></div>;
}

export function ProfilePage() {
  const { session, activeEnterpriseId, state, dependencies, refresh } = useAppContext();
  const navigate = useNavigate();
  const enterprise = activeEnterpriseId ? state.envelope.enterprisesById[activeEnterpriseId] : null;
  const enterpriseCount = Object.values(state.envelope.enterprisesById).filter((item) => item.accountId === session?.accountId).length;
  const reportCount = Object.values(state.envelope.reportSnapshotsById).filter((item) => item.enterpriseId === activeEnterpriseId).length;
  const favoriteCount = Object.values(state.envelope.favoritesById).filter((item) => item.accountId === session?.accountId).length;
  const fileCount = Object.values(state.envelope.fileAnalysisRecordsById).filter((item) => item.enterpriseId === activeEnterpriseId).length;

  return <div className="legacy-profile-page"><section className="profile-full-hero"><StatusBar light/><div className="profile-full-top"><span/><Link className="icon-btn light profile-settings-btn" to="/settings" aria-label="设置"><AppIcon name="settings" size={21}/></Link></div><ProfileIllustration/><div className="profile-full-person"><span className="person-avatar"><AppIcon name="user" size={28}/></span><div className="profile-full-name"><h1>{enterprise?.name ?? "税策通用户"}</h1><p>{session?.emailMasked} · 已登录</p></div></div><div className="profile-stats"><div className="profile-stat"><b>{enterpriseCount}</b><span>管理企业</span></div><div className="profile-stat"><b>{reportCount}</b><span>历史报告</span></div><div className="profile-stat"><b>{favoriteCount}</b><span>我的收藏</span></div><div className="profile-stat"><b>{fileCount}</b><span>文件记录</span></div></div></section><section className="profile-asset-list">{links.map((item) => <Link className="asset-row card tap-card" to={item.to} key={item.to}><span className="asset-icon asset-img"><img src={asset(item.asset)} alt="" width="42" height="42"/></span><span className="copy"><strong>{item.label}</strong><span>{item.description}</span></span><AppIcon className="chev" name="chevron" size={19}/></Link>)}<button className="profile-logout-btn" onClick={async () => { await dependencies.auth.signOut(); refresh(); navigate("/login", { replace: true }); }}><AppIcon name="back" size={14}/> 退出登录</button></section><div className="trust-note">演示数据仅用于产品体验 · 结果为辅助决策建议，不替代专业税务意见</div></div>;
}
