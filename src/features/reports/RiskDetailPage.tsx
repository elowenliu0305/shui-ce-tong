import { useParams } from "react-router-dom";

import { EmptyState, LoadingState } from "../../components/feedback/AsyncState";
import { StatusBadge } from "../../components/data-display/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { ReportAgentAction } from "./ReportAgentAction";
import { useReport } from "./useReport";

export function RiskDetailPage() {
  const { reportId, riskId } = useParams();
  const report = useReport(reportId);
  if (report === undefined) return <LoadingState />;
  const risk = report?.result.riskSummary.items.find((item) => item.questionId === riskId);
  const pending = report?.result.riskSummary.pendingItems.find((item) => item.questionId === riskId);
  const item = risk ?? pending;
  if (!report || !item) return <EmptyState title="风险项不存在" description="该风险项未进入当前报告。" />;
  return <div className="page-stack risk-detail"><PageHeader title="风险详情" backTo={`/reports/${report.id}/risks`} /><section className="card risk-detail__hero"><StatusBadge tone={risk ? "danger" : "warning"}>{risk ? "已确认风险 +1" : "待核验 0 分"}</StatusBadge><h1>{item.questionTitle}</h1><p>你的回答：{item.answerLabel}</p></section><section className="card advice-card"><h2>建议处理方式</h2><ol><li>核验与该题相关的业务、合同、发票和处理记录。</li><li>记录核验结论；如有异常，留存整改过程与支持材料。</li><li>必要时咨询具备资质的税务专业人员。</li></ol><p>当前前端没有读取真实文件，因此不能断言已经发生具体违规。</p></section><ReportAgentAction reportId={report.id} label="就这个风险问 AI" /></div>;
}
