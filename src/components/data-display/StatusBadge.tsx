import type { ReactNode } from "react";

export function StatusBadge({ tone = "neutral", children }: { tone?: "brand" | "success" | "warning" | "danger" | "neutral"; children: ReactNode }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
