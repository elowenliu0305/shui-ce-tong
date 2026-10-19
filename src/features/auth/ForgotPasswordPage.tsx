import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { useAppContext } from "../../app/app-context";
import { AuthLayout, AuthLink } from "./AuthLayout";

export function ForgotPasswordPage() {
  const { dependencies } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await dependencies.auth.requestPasswordReset(email);
    setBusy(false);
    navigate("/reset-password", { state: { email } });
  }

  return (
    <AuthLayout title="找回密码" description="无论邮箱是否存在，系统都会显示相同结果，避免泄露账号状态。" footer={<AuthLink to="/login">返回登录</AuthLink>}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>注册邮箱</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <Button type="submit" disabled={busy}>{busy ? "提交中…" : "发送重置说明"}</Button>
      </form>
    </AuthLayout>
  );
}
