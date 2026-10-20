import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { useAppContext } from "../../app/app-context";
import { AuthLayout, AuthLink } from "./AuthLayout";

export function LoginPage() {
  const { dependencies, refresh } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await dependencies.auth.signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      if (result.error.code === "EMAIL_NOT_VERIFIED") navigate("/verify-email", { state: { email } });
      return;
    }
    await refresh();
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from || "/", { replace: true });
  }

  return (
    <AuthLayout title="邮箱登录" description="登录后继续管理你的企业体检、报告与资料收藏。" footer={<>还没有账号？ <AuthLink to="/register">立即注册</AuthLink></>}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>邮箱</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
        <label className="field"><span>密码</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" required /></label>
        <div className="form-meta"><AuthLink to="/forgot-password">忘记密码？</AuthLink></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "登录中…" : "登录"}</Button>
        {dependencies.auth.startDemoSession ? <button className="demo-fill" type="button" onClick={async () => {
          if (!dependencies.auth.startDemoSession) return setError("当前环境未开放演示账号");
          setBusy(true);
          const result = await dependencies.auth.startDemoSession();
          setBusy(false);
          if (!result.ok) return setError(result.error.message);
          await refresh();
          navigate("/", { replace: true });
        }}>直接进入演示账号</button> : null}
      </form>
    </AuthLayout>
  );
}
