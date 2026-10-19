import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { useAppContext } from "../../app/app-context";
import { getDataBackend } from "../../services/supabase/config";
import { AuthLayout, AuthLink } from "./AuthLayout";

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dependencies, refresh } = useAppContext();
  const routeEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(routeEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const isMock = getDataBackend() === "mock";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await dependencies.auth.verifyEmail(email, code);
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    refresh();
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout title="验证邮箱" description={isMock ? "演示环境不会真实发送邮件：输入任意 6 位数字即可完成验证。" : "验证码已发送到你的邮箱，请输入邮件中的 6 位数字完成验证。"} footer={<AuthLink to="/login">返回登录</AuthLink>}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>6 位验证码</span><input inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="000000" required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {notice ? <p className="form-hint" role="status">{notice}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "验证中…" : "完成验证"}</Button>
        {dependencies.auth.resendVerification ? <button className="demo-fill" type="button" disabled={busy} onClick={async () => {
          setBusy(true);
          setError("");
          const result = await dependencies.auth.resendVerification?.(email);
          setBusy(false);
          if (!result?.ok) return setError(result?.error.message ?? "发送失败，请稍后重试");
          setNotice("验证邮件已重新发送，请检查收件箱和垃圾邮件。");
        }}>重新发送验证码</button> : null}
      </form>
    </AuthLayout>
  );
}
