import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { LoadingState } from "../../components/feedback/AsyncState";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import type { RiskQuestionnaireDraft } from "../../domain/assessment";
import type { CompanyProfileDraft } from "../../domain/enterprise";
import { evaluateRisk } from "../../domain/rules/evaluate-risk";
import { riskQuestions } from "../../fixtures/risk-questions";

export function AssessmentConfirmPage() {
  const { activeEnterpriseId, dependencies } = useAppContext();
  const navigate = useNavigate();
  const [data, setData] = useState<{ profile: CompanyProfileDraft; risk: RiskQuestionnaireDraft } | null>(null);

  useEffect(() => {
    if (!activeEnterpriseId) return;
    void Promise.all([dependencies.assessment.getProfileDraft(activeEnterpriseId), dependencies.assessment.getRiskDraft(activeEnterpriseId)]).then(([profile, risk]) => {
      if (profile.ok && risk.ok) setData({ profile: profile.data, risk: risk.data });
    });
  }, [activeEnterpriseId, dependencies]);

  if (!data) return <LoadingState />;
  const result = evaluateRisk(riskQuestions, data.risk.answersByQuestionId);
  const firstMissing = result.unansweredQuestionIds[0];
  const firstMissingIndex = firstMissing ? riskQuestions.findIndex((item) => item.id === firstMissing) + 1 : null;
  return (
    <div className="page-stack confirm-page">
      <PageHeader title="确认体检资料" backTo="/assessment/questions/10" />
      <section className="confirm-summary card"><div><b>{data.profile.completionPercent}%</b><span>资料完整度</span></div><div><b>{result.answeredCount}/10</b><span>风险题</span></div><div><b>{result.pendingVerificationCount}</b><span>待核验</span></div></section>
      <section className="card confirm-explain"><h2>本次计算口径</h2><p>已确认异常答案：{result.confirmedRiskCount} 个；当前健康度预览：{result.healthPercent}%（{result.level === "low" ? "低" : result.level === "medium" ? "中" : "高"}风险）。</p><p>企业资料不会改变风险等级，只用于下一步政策筛选和节税金额估算。</p></section>
      {firstMissingIndex ? <div className="form-error">还有 {result.unansweredQuestionIds.length} 道题未完成。<Link to={`/assessment/questions/${firstMissingIndex}`}>前往补充</Link></div> : null}
      <Button disabled={Boolean(firstMissingIndex)} onClick={() => navigate("/assessment/analyzing")}>确认并开始分析</Button>
    </div>
  );
}
