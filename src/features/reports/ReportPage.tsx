import { Link, useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { ReportAgentAction } from "./ReportAgentAction";
import { useReport } from "./useReport";

const levelName = { low: "低风险", medium: "中风险", high: "高风险" } as const;

export function ReportPage() {
  const { reportId } = useParams();
  const report = useReport(reportId);
  if (report === undefined) return <LoadingState label="正在读取报告快照…" />;
  if (!report) return <EmptyState title="报告不存在" description="该报告可能已随企业永久删除。" />;
  const { result } = report;
  const eligible = result.policyMatches.filter((item) => item.status === "eligible").length;
  const pending = result.policyMatches.filter((item) => item.status === "pending").length;
  return (
    <div className="page-stack report-page">
      <PageHeader title="税务体检报告" backTo="/" action={<Link className="history-link" to="/reports/history">历史</Link>} />
      <section className="report-hero"><div className="report-score"><b>{result.riskSummary.healthPercent}</b><span>健康度</span></div><div><StatusBadge tone={result.riskSummary.level === "low" ? "success" : result.riskSummary.level === "medium" ? "warning" : "danger"}>{levelName[result.riskSummary.level]}</StatusBadge><h2>{report.enterpriseDisplay.name}</h2><p>{new Date(report.createdAt).toLocaleString("zh-CN")} · 不可变快照</p></div></section>
      <section className="report-metrics card"><Link to={`/reports/${report.id}/policies`}><b>{eligible + pending}</b><span>政策机会</span><small>{eligible} 符合 · {pending} 待补</small></Link><Link to={`/reports/${report.id}/risks`}><b>{result.riskSummary.confirmedRiskCount}</b><span>风险答案</span><small>{result.riskSummary.pendingVerificationCount} 项待核验</small></Link><div><b>{result.estimatedTotalSavingYuan === null ? "—" : `¥${result.estimatedTotalSavingYuan.toLocaleString("zh-CN")}`}</b><span>节税估算</span><small>{result.estimatedTotalSavingYuan === null ? "待补完整数据" : "演示计算口径"}</small></div></section>
      <section className="report-actions card"><h2>优先行动</h2>{result.priorityActions.map((item, index) => <article key={item}><span>{index + 1}</span><p>{item}</p></article>)}</section>
      <section className="report-basis"><b>报告版本</b><p>规则 {report.versions.ruleSet} · 引擎 {report.versions.engine} · 资料目录 {report.versions.catalog}</p><p>金额仅在资格、输入和公式完整时计算；本演示不构成正式税务意见。</p></section>
      <ReportAgentAction reportId={report.id} label="基于本报告问 AI" />
    </div>
  );
}
