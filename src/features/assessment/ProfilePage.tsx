import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppContext } from "../../app/app-context";
import { LoadingState } from "../../components/feedback/AsyncState";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import type { CompanyProfileDraft, CompanyProfileFieldName, CompanyProfileFields } from "../../domain/enterprise";
import type { FieldValue, MoneyValue } from "../../domain/shared";
import { known, unknown, unset } from "../../domain/shared";
import { validateProfile } from "../../domain/rules/profile-completeness";
import { useDraftAutosave } from "./assessment-flow";

type OptionalName = Exclude<CompanyProfileFieldName, "companyName" | "region" | "industry">;
type ValueKind = "text" | "number" | "money" | "list";

const fieldDefinitions: { name: OptionalName; label: string; kind: ValueKind; placeholder: string }[] = [
  { name: "unifiedSocialCreditCode", label: "统一社会信用代码", kind: "text", placeholder: "18 位代码" },
  { name: "establishedDate", label: "成立日期", kind: "text", placeholder: "YYYY-MM-DD" },
  { name: "taxpayerType", label: "纳税人类型", kind: "text", placeholder: "一般纳税人 / 小规模纳税人" },
  { name: "dataYear", label: "数据年度", kind: "number", placeholder: "如 2025" },
  { name: "annualRevenue", label: "年度营业收入（元）", kind: "money", placeholder: "人民币整数元" },
  { name: "totalAssets", label: "资产总额（元）", kind: "money", placeholder: "人民币整数元" },
  { name: "employeeCount", label: "从业人数", kind: "number", placeholder: "人数" },
  { name: "taxableIncome", label: "应纳税所得额（元）", kind: "money", placeholder: "人民币整数元" },
  { name: "researchInvestment", label: "研发投入（元）", kind: "money", placeholder: "人民币整数元" },
  { name: "enjoyedTaxIncentives", label: "已享受税收优惠", kind: "list", placeholder: "多项用逗号分隔" }
];

function defaultKnown(kind: ValueKind, dataYear: number): FieldValue<unknown> {
  if (kind === "money") return known({ amountYuan: 0, currency: "CNY", dataYear } satisfies MoneyValue);
  if (kind === "number") return known(0);
  if (kind === "list") return known([]);
  return known("");
}

export function ProfilePage() {
  const { activeEnterpriseId, dependencies, refresh } = useAppContext();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CompanyProfileDraft | null>(null);
  const [saved, setSaved] = useState("已载入草稿");

  useEffect(() => {
    if (!activeEnterpriseId) return;
    void dependencies.assessment.getProfileDraft(activeEnterpriseId).then((result) => { if (result.ok) setDraft(result.data); });
  }, [activeEnterpriseId, dependencies]);

  const save = useCallback(async (next: CompanyProfileDraft) => {
    setSaved("保存中…");
    const result = await dependencies.assessment.saveProfileDraft(next);
    setSaved(result.ok ? "已自动保存" : "保存失败");
    if (result.ok) refresh();
    return result;
  }, [dependencies, refresh]);
  useDraftAutosave(draft, save);

  if (!draft) return <LoadingState label="正在读取企业资料…" />;
  const validation = validateProfile(draft.fields);
  const dataYear = draft.fields.dataYear.status === "known" ? draft.fields.dataYear.value : new Date().getFullYear() - 1;

  function updateField(name: OptionalName, value: FieldValue<unknown>) {
    setDraft((current) => current ? ({ ...current, fields: { ...current.fields, [name]: value } as CompanyProfileFields, updatedAt: new Date().toISOString() }) : current);
  }

  function setStatus(name: OptionalName, kind: ValueKind, status: string) {
    updateField(name, status === "known" ? defaultKnown(kind, dataYear) : status === "unknown" ? unknown() : unset());
  }

  function setKnownValue(name: OptionalName, kind: ValueKind, raw: string) {
    const value = kind === "money" ? { amountYuan: Math.max(0, Number.parseInt(raw || "0", 10)), currency: "CNY" as const, dataYear }
      : kind === "number" ? Math.max(0, Number.parseInt(raw || "0", 10))
        : kind === "list" ? raw.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
          : raw;
    updateField(name, known(value));
  }

  return (
    <div className="page-stack profile-page">
      <PageHeader title="企业经营资料" backTo="/assessment/method" action={<span className="save-state">{saved}</span>} />
      <section className="profile-progress"><div><b>{validation.completionPercent}%</b><span>资料完整度</span></div><div className="progress-track"><i style={{ width: `${validation.completionPercent}%` }} /></div><p>“不清楚”和“暂不填写”会保留不同状态，后续政策匹配会据此给出待补信息。</p></section>
      <section className="required-profile card"><h2>企业主档</h2><dl><div><dt>企业名称</dt><dd>{draft.fields.companyName.status === "known" ? draft.fields.companyName.value : "—"}</dd></div><div><dt>地区</dt><dd>{draft.fields.region.status === "known" ? `${draft.fields.region.value.province}${draft.fields.region.value.city}` : "—"}</dd></div><div><dt>行业</dt><dd>{draft.fields.industry.status === "known" ? draft.fields.industry.value : "—"}</dd></div></dl></section>
      <section className="optional-fields">
        {fieldDefinitions.map((definition) => {
          const field = draft.fields[definition.name] as FieldValue<unknown>;
          const rawValue = field.status !== "known" ? "" : definition.kind === "money" ? String((field.value as MoneyValue).amountYuan) : definition.kind === "list" ? (field.value as string[]).join("，") : String(field.value);
          return <article className="profile-field card" key={definition.name}><div className="profile-field__head"><label htmlFor={definition.name}>{definition.label}</label><select aria-label={`${definition.label}状态`} value={field.status} onChange={(event) => setStatus(definition.name, definition.kind, event.target.value)}><option value="known">明确填写</option><option value="unknown">不清楚</option><option value="unset">暂不填写</option></select></div>{field.status === "known" ? <input id={definition.name} type={definition.kind === "number" || definition.kind === "money" ? "number" : "text"} min={definition.kind === "number" || definition.kind === "money" ? 0 : undefined} value={rawValue} placeholder={definition.placeholder} onChange={(event) => setKnownValue(definition.name, definition.kind, event.target.value)} /> : <p className="profile-field__state">{field.status === "unknown" ? "将作为待补资料参与政策判断" : "尚未录入，不计入完整度"}</p>}</article>;
        })}
      </section>
      <Button onClick={async () => { await save(draft); navigate("/assessment/questions/1"); }}>保存并进入风险自测</Button>
    </div>
  );
}
