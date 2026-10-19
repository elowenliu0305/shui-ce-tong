import { Link, useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { useReport } from "./useReport";

export function RiskListPage() {
  const { reportId } = useParams();
  const report = useReport(reportId);
  if (report === undefined) return <LoadingState />;
  if (!report) return <EmptyState title="报告不存在" description="无法读取风险快照。" />;
  const { items, pendingItems } = report.result.riskSummary;
  return <div className="page-stack"><PageHeader title="风险清单" backTo={`/reports/${report.id}`} /><section className="risk-overview card"><b>{items.length}</b><span>个已确认风险答案</span><p>{pendingItems.length} 个“不清楚”答案按 0 分计算，并单独列为待核验。</p></section><div className="risk-list">{items.map((item) => <Link className="risk-list__item card" key={item.questionId} to={`/reports/${report.id}/risks/${item.questionId}`}><StatusBadge tone="danger">风险 +1</StatusBadge><h2>{item.questionTitle}</h2><p>{item.answerLabel}</p></Link>)}{pendingItems.map((item) => <Link className="risk-list__item card" key={item.questionId} to={`/reports/${report.id}/risks/${item.questionId}`}><StatusBadge tone="warning">待核验 0 分</StatusBadge><h2>{item.questionTitle}</h2><p>{item.answerLabel}</p></Link>)}{items.length + pendingItems.length === 0 ? <EmptyState title="没有风险或待核验项" description="本次 10 道题均选择安全答案。" /> : null}</div></div>;
}
