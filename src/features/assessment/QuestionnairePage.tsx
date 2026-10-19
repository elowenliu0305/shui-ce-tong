import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { LoadingState } from "../../components/feedback/AsyncState";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import type { RiskQuestionnaireDraft } from "../../domain/assessment";
import { riskQuestions } from "../../fixtures/risk-questions";

export function QuestionnairePage() {
  const { index = "1" } = useParams();
  const navigate = useNavigate();
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const [draft, setDraft] = useState<RiskQuestionnaireDraft | null>(null);
  const [error, setError] = useState("");
  const currentIndex = Math.min(riskQuestions.length - 1, Math.max(0, Number.parseInt(index, 10) - 1 || 0));
  const question = riskQuestions[currentIndex];
  const selected = draft?.answersByQuestionId[question.id];
  const answeredCount = useMemo(() => draft ? Object.keys(draft.answersByQuestionId).length : 0, [draft]);

  useEffect(() => {
    if (!activeEnterpriseId) return;
    void dependencies.assessment.getRiskDraft(activeEnterpriseId).then((result) => { if (result.ok) setDraft(result.data); });
  }, [activeEnterpriseId, dependencies]);

  async function select(optionId: string) {
    if (!draft) return;
    const next = { ...draft, answersByQuestionId: { ...draft.answersByQuestionId, [question.id]: optionId } };
    setDraft(next);
    setError("");
    const result = await dependencies.assessment.saveRiskDraft(next);
    if (result.ok) refresh();
  }

  if (!draft) return <LoadingState label="正在恢复答题进度…" />;
  return (
    <div className="page-stack questionnaire-page">
      <PageHeader title="风险自测" backTo={currentIndex === 0 ? "/assessment/profile" : `/assessment/questions/${currentIndex}`} action={<span className="question-count">{currentIndex + 1}/10</span>} />
      <div className="question-progress"><i style={{ width: `${((currentIndex + 1) / 10) * 100}%` }} /></div>
      <section className="question-copy"><p className="eyebrow">风险题 {currentIndex + 1}</p><h2>{question.title}</h2><p>{question.help}</p></section>
      <div className="option-list" role="radiogroup" aria-label={question.title}>
        {question.options.map((option) => <button key={option.id} role="radio" aria-checked={selected === option.id} className={selected === option.id ? "selected" : ""} onClick={() => void select(option.id)}><span>{selected === option.id ? "✓" : String.fromCharCode(65 + question.options.indexOf(option))}</span><b>{option.label}</b>{option.effect === "unknown" ? <em>待核验</em> : null}</button>)}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="question-actions"><Button variant="secondary" disabled={currentIndex === 0} onClick={() => navigate(`/assessment/questions/${currentIndex}`)}>上一步</Button><Button onClick={() => { if (!selected) return setError("请先选择一个答案"); navigate(currentIndex === 9 ? "/assessment/confirm" : `/assessment/questions/${currentIndex + 2}`); }}>{currentIndex === 9 ? "查看摘要" : "下一题"}</Button></div>
      <p className="answered-caption">已完成 {answeredCount}/10 · 答案已自动保存</p>
    </div>
  );
}
