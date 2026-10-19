import { Link, useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { policyRules } from "../../fixtures/policies";
import { useReport } from "./useReport";

export function PolicyListPage() {
  const { reportId } = useParams();
  const report = useReport(reportId);
  if (report === undefined) return <LoadingState />;
  if (!report) return <EmptyState title="报告不存在" description="无法读取该报告的政策快照。" />;
  return <div className="page-stack"><PageHeader title="政策机会" backTo={`/reports/${report.id}`} /><div className="policy-list">{report.result.policyMatches.map((match) => { const rule = policyRules.find((item) => item.policyVersionId === match.policyVersionId); const estimate = report.result.savingsEstimates.find((item) => item.policyVersionId === match.policyVersionId); return <Link className="policy-card card" key={match.policyVersionId} to={`/reports/${report.id}/policies/${encodeURIComponent(match.policyVersionId)}`}><div><StatusBadge tone={match.status === "eligible" ? "success" : "warning"}>{match.status === "eligible" ? "符合" : "待补资料"}</StatusBadge><h2>{rule?.title ?? match.policyVersionId}</h2><p>{match.satisfied.length} 项已满足 · {match.missing.length} 项待补</p></div><b>{estimate?.amountYuan === null || estimate?.amountYuan === undefined ? "待估算" : `¥${estimate.amountYuan.toLocaleString("zh-CN")}`}</b></Link>; })}</div></div>;
}
