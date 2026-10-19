import { useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { policyRules } from "../../fixtures/policies";
import { ReportAgentAction } from "./ReportAgentAction";
import { useReport } from "./useReport";

export function PolicyDetailPage() {
  const { reportId, policyId } = useParams();
  const report = useReport(reportId);
  if (report === undefined) return <LoadingState />;
  const match = report?.result.policyMatches.find((item) => item.policyVersionId === policyId);
  if (!report || !match) return <EmptyState title="政策机会不存在" description="该政策未进入当前报告快照。" />;
  const rule = policyRules.find((item) => item.policyVersionId === match.policyVersionId);
  const estimate = report.result.savingsEstimates.find((item) => item.policyVersionId === match.policyVersionId);
  return <div className="page-stack policy-detail"><PageHeader title="政策详情" backTo={`/reports/${report.id}/policies`} /><section className="card policy-detail__hero"><StatusBadge tone={match.status === "eligible" ? "success" : "warning"}>{match.status === "eligible" ? "符合演示条件" : "待补资料"}</StatusBadge><h1>{rule?.title ?? match.policyVersionId}</h1><p>规则版本 {match.ruleVersion}</p></section><section className="card condition-list"><h2>条件判断</h2>{[...match.satisfied, ...match.missing, ...match.failed].map((item) => <article key={item.id}><span className={item.outcome}>{item.outcome === "pass" ? "已满足" : item.outcome === "unknown" ? "待补" : "不满足"}</span><div><b>{item.fieldPath}</b><p>当前值：{item.actual === undefined ? "未知或未填写" : JSON.stringify(item.actual)}</p></div></article>)}</section><section className="card savings-detail"><h2>金额估算</h2><b>{estimate?.amountYuan === null || estimate?.amountYuan === undefined ? "暂不能计算" : `¥${estimate.amountYuan.toLocaleString("zh-CN")}`}</b><p>{estimate?.missingFieldPaths.length ? `待补：${estimate.missingFieldPaths.join("、")}` : "输入完整，已按演示公式计算。"}</p></section><section className="report-basis"><b>依据</b><p>{rule?.citation.title} · {rule?.citation.locator}</p><p>{rule?.citation.excerpt}</p></section><ReportAgentAction reportId={report.id} label="就这项政策问 AI" /></div>;
}
