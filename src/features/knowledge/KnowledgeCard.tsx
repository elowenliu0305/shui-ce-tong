import { Link } from "react-router-dom";

import { StatusBadge } from "../../components/data-display/StatusBadge";
import type { KnowledgeListItem } from "../../domain/knowledge";

const kindName = { policy: "政策", news: "时讯", case: "案例", other: "其他" } as const;

export function KnowledgeCard({ item }: { item: KnowledgeListItem }) {
  const { document } = item;
  return <Link className="knowledge-card card" to={`/knowledge/${document.id}`}><div className="knowledge-card__meta"><StatusBadge tone={document.kind === "policy" ? "brand" : "neutral"}>{kindName[document.kind]}</StatusBadge><span>{document.effectiveStatus === "effective" ? "现行有效" : document.effectiveStatus === "expired" ? "已失效" : "效力待核验"}</span>{item.favorite ? <em>♥</em> : null}</div><h2>{document.title}</h2><p>{document.summary ?? "原文件尚未解析，仍可查看元数据并下载。"}</p><footer><span>{document.issuer.join("、") || "发布机构未知"}</span><b>{item.applicability === "eligible" ? "当前企业符合" : item.applicability === "pending" ? "当前企业待补" : item.applicability === "ineligible" ? "不进入新报告" : "查看详情"}</b></footer></Link>;
}
