import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog";
import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { AppIcon } from "../../components/icons/AppIcon";
import { PageHeader } from "../../components/layout/PageHeader";
import type { Enterprise } from "../../domain/enterprise";

export function EnterpriseListPage() {
  const { session, activeEnterpriseId, state, dependencies, refresh } = useAppContext();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Enterprise | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const items = Object.values(state.envelope.enterprisesById).filter((item) => item.accountId === session?.accountId);

  async function switchTo(enterprise: Enterprise) {
    if (!session) return;
    const result = await dependencies.enterprises.switchActive(session.accountId, enterprise.id);
    if (result.ok) { refresh(); navigate("/"); }
  }

  async function deleteEnterprise() {
    if (!session || !deleteTarget) return;
    setBusy(true);
    setDeleteError("");
    setDeleteNotice("");
    const result = await dependencies.enterprises.delete(session.accountId, deleteTarget.id);
    setBusy(false);
    if (!result.ok) return setDeleteError(result.error.message);
    setDeleteTarget(null);
    setDeleteNotice(`企业已删除：${result.data.deletedReports} 份报告、${result.data.deletedConversations} 个会话、${result.data.deletedFileRecords} 条文件记录已清理；保留 ${result.data.preservedFavorites} 条账号收藏。`);
    await refresh();
    if (!result.data.activeEnterpriseId) navigate("/enterprises/new", { replace: true });
  }

  return (
    <div className="page-stack page-bg-blue enterprise-management-page">
      <PageHeader
        title="企业管理"
        subtitle="一个账号可管理多家企业"
        backTo="/"
        action={<Link className="icon-btn soft" to="/enterprises/new" aria-label="新增企业"><AppIcon name="plus" size={21} /></Link>}
      />
      {!session ? <LoadingState /> : items.length === 0 ? <EmptyState title="还没有企业" description="创建企业后才能开始体检。" /> : (
        <section className="enterprise-page-section">
          <div className="stack enterprise-list">
            {items.map((enterprise) => {
              const active = enterprise.id === activeEnterpriseId;
              const taxpayer = state.envelope.profileDraftsByEnterpriseId[enterprise.id]?.fields.taxpayerType;
              const taxpayerLabel = taxpayer?.status === "known" ? taxpayer.value : "纳税人类型待确认";

              return (
                <article className="company-card card enterprise-company-card" key={enterprise.id}>
                  <div className="company-card-top">
                    <span className="mini-icon"><AppIcon name="building" size={23} /></span>
                    <div className="copy"><h3>{enterprise.name}</h3><p>{enterprise.regionProvince}{enterprise.regionCity} · {taxpayerLabel}</p></div>
                    {active ? <span className="tag green">当前企业</span> : null}
                    <details className="enterprise-more-menu">
                      <summary aria-label={`管理${enterprise.name}`}><AppIcon name="more" size={19} /></summary>
                      <div className="enterprise-more-popover">
                        <Link to={`/enterprises/${enterprise.id}/edit`}>编辑企业资料</Link>
                        <button type="button" onClick={() => setDeleteTarget(enterprise)}>删除企业</button>
                      </div>
                    </details>
                  </div>
                  <div className="company-card-actions">
                    {active ? (
                      <Link className="btn ghost" to="/assessment/profile">查看画像</Link>
                    ) : (
                      <button className="btn ghost" type="button" onClick={() => void switchTo(enterprise)}>切换为当前企业</button>
                    )}
                    <Link className="btn secondary" to="/assessment"><AppIcon name="scan" size={15} /> 发起体检</Link>
                  </div>
                </article>
              );
            })}
            <Link className="method-card card tap-card enterprise-create-card" to="/enterprises/new">
              <span className="mini-icon"><AppIcon name="plus" size={23} /></span>
              <span><h3>新建企业档案</h3><p>录入基础信息并开始首次画像</p></span>
              <AppIcon className="chev" name="chevron" size={19} />
            </Link>
          </div>
        </section>
      )}
      {deleteNotice ? <p className="subtle-note" role="status">{deleteNotice}</p> : null}
      {deleteError ? <p className="form-error" role="alert">{deleteError}</p> : null}
      <section className="enterprise-note-section"><div className="subtle-note"><AppIcon name="shield" size={18} /><span>正式产品需按企业隔离文件、报告与会话，并补充成员授权和操作日志。</span></div></section>
      <ConfirmDialog open={Boolean(deleteTarget)} title="永久删除企业？" description={`将删除“${deleteTarget?.name ?? ""}”的资料、体检、报告、AI 会话和文件记录；账号收藏会保留。此操作不可撤销。`} confirmLabel="永久删除" danger busy={busy} onConfirm={() => void deleteEnterprise()} onClose={() => { setDeleteTarget(null); setDeleteError(""); }} />
    </div>
  );
}
