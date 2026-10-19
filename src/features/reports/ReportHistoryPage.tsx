import { Link } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { EmptyState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";

export function ReportHistoryPage() {
  const { activeEnterpriseId, state } = useAppContext();
  const reports = Object.values(state.envelope.reportSnapshotsById).filter((item) => item.enterpriseId === activeEnterpriseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="page-stack"><PageHeader title="历史报告" backTo="/" />{reports.length ? <div className="history-list">{reports.map((report, index) => <Link className="history-card card" to={`/reports/${report.id}`} key={report.id}><div><b>{new Date(report.createdAt).toLocaleString("zh-CN")}</b><span>{index === 0 ? "最新报告" : "历史时间快照"}</span></div><StatusBadge tone={report.result.riskSummary.level === "low" ? "success" : report.result.riskSummary.level === "medium" ? "warning" : "danger"}>{report.result.riskSummary.healthPercent}%</StatusBadge><p>{report.result.policyMatches.length} 项政策机会 · {report.result.riskSummary.confirmedRiskCount} 个风险答案</p></Link>)}</div> : <EmptyState title="还没有历史报告" description="完成一次 10 道题的体检后，会在这里生成不可变快照。" />}</div>;
}
