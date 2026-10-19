import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { useAppContext } from "../../app/app-context";
import { getDataBackend } from "../../services/supabase/config";
import { AuthLayout, AuthLink } from "./AuthLayout";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dependencies } = useAppContext();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isMock = getDataBackend() === "mock";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await dependencies.auth.resetPassword(email, code, password);
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    navigate("/login", { replace: true });
  }

  return (
    <AuthLayout title="设置新密码" description={isMock ? "演示环境输入任意 6 位数字，设置不少于 8 位的新密码。" : "输入邮件中的 6 位验证码，并设置不少于 8 位的新密码。"} footer={<AuthLink to="/login">返回登录</AuthLink>}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>6 位验证码</span><input inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} required /></label>
        <label className="field"><span>新密码</span><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "保存中…" : "保存新密码"}</Button>
      </form>
    </AuthLayout>
  );
}
