import { useState, type FormEvent } from "react";

import { Button } from "../../components/forms/Button";
import type { EnterpriseInput } from "../../domain/enterprise";

const industries = ["软件和信息技术服务业", "制造业", "科学研究和技术服务业", "文化创意与传媒", "批发和零售业", "其他"];

export function EnterpriseForm({ initial, submitLabel, onSubmit }: { initial?: EnterpriseInput; submitLabel: string; onSubmit: (input: EnterpriseInput) => Promise<string | null> }) {
  const [form, setForm] = useState<EnterpriseInput>(initial ?? { name: "", regionProvince: "", regionCity: "", industry: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (field: keyof EnterpriseInput, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const nextError = await onSubmit(form);
    setBusy(false);
    setError(nextError ?? "");
  }

  return (
    <form className="form-stack enterprise-form" onSubmit={submit}>
      <label className="field"><span>企业名称 *</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="请输入营业执照上的企业全称" required /></label>
      <div className="field-grid">
        <label className="field"><span>省份 *</span><input value={form.regionProvince} onChange={(event) => update("regionProvince", event.target.value)} placeholder="如：浙江省" required /></label>
        <label className="field"><span>城市 *</span><input value={form.regionCity} onChange={(event) => update("regionCity", event.target.value)} placeholder="如：杭州市" required /></label>
      </div>
      <label className="field"><span>所属行业 *</span><select value={form.industry} onChange={(event) => update("industry", event.target.value)} required><option value="">请选择行业</option>{industries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <p className="form-hint">这些主档信息用于建立企业和筛选政策；经营金额等 13 项资料将在税务体检中单独填写。</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy}>{busy ? "保存中…" : submitLabel}</Button>
    </form>
  );
}
