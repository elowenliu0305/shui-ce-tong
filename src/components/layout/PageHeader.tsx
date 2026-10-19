import { Link } from "react-router-dom";

import { AppIcon } from "../icons/AppIcon";
import { StatusBar } from "./StatusBar";

export function PageHeader({ title, subtitle, backTo, action }: { title: string; subtitle?: string; backTo?: string; action?: React.ReactNode }) {
  return (
    <div className="legacy-page-chrome">
      <StatusBar />
      <header className="page-head">
        {backTo ? <Link className="icon-btn" to={backTo} aria-label="返回"><AppIcon name="back" size={23} /></Link> : <span className="icon-btn" />}
        <div className="head-copy"><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
        <div className="page-header-action">{action ?? <span style={{ width: 42 }} />}</div>
      </header>
    </div>
  );
}
