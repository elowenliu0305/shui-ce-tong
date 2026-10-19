import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { useAppContext } from "../../app/app-context";
import { AuthLayout, AuthLink } from "./AuthLayout";

export function RegisterPage() {
  const { dependencies } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) return setError("两次输入的密码不一致");
    setBusy(true);
    const result = await dependencies.auth.register(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    navigate("/verify-email", { state: { email, emailMasked: result.data.emailMasked } });
  }

  return (
    <AuthLayout title="创建账号" description="第一版使用邮箱和密码登录；密码不会以明文保存。" footer={<>已有账号？ <AuthLink to="/login">返回登录</AuthLink></>}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>邮箱</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>设置密码</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
        <label className="field"><span>确认密码</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "创建中…" : "创建账号"}</Button>
      </form>
    </AuthLayout>
  );
}
