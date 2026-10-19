import { Button } from "../forms/Button";

export function LoadingState({ label = "正在加载…" }: { label?: string }) {
  return <div className="feedback-state" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="feedback-state"><strong>{title}</strong><p>{description}</p></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="feedback-state" role="alert"><strong>暂时无法完成</strong><p>{message}</p>{onRetry ? <Button onClick={onRetry}>重试</Button> : null}</div>;
}
