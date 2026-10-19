import type { ReactNode } from "react";

export function MobileCanvas({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`phone-frame mobile-canvas ${className}`.trim()}><div className="phone-screen"><div className="app-shell">{children}</div></div></div>;
}
