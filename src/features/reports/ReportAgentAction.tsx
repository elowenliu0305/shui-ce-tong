import { Link } from "react-router-dom";
import { createAgentHref } from "../agent/agent-navigation";

export function ReportAgentAction({ reportId, label = "问 AI" }: { reportId: string; label?: string }) {
  return <Link className="button button--secondary" to={createAgentHref({ reportId })}>✦ {label}</Link>;
}
