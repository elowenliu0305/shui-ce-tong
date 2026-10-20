import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { MobileCanvas } from "../../components/layout/MobileCanvas";
import { getDataBackend } from "../../services/supabase/config";

export function AuthLayout({ title, description, footer, children }: { title: string; description: string; footer?: ReactNode; children: ReactNode }) {
  const isMock = getDataBackend() === "mock";
  return (
    <MobileCanvas className="auth-react-shell">
      <main className="page auth-page-wrap"><div className="auth-page">
        <div className="auth-brand"><span className="auth-brand-mark">税</span><h1>税策通</h1><p>小微企业智能税务助手</p></div>
        <section className="auth-card"><p className="eyebrow">欢迎使用</p><h2>{title}</h2><p className="auth-description">{description}</p>{children}{footer ? <div className="auth-footer">{footer}</div> : null}</section>
        <p className="auth-skip auth-legal">{isMock ? "当前为演示环境，数据只保存在当前浏览器" : "你的数据与文件仅存储在你的专属账户中，用于提供体检与咨询"}</p>
      </div></main>
    </MobileCanvas>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="text-link" to={to}>{children}</Link>;
}
