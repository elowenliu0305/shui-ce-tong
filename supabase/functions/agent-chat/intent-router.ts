export type AgentRouteIntent = "general" | "tax_policy_case" | "enterprise_report" | "sme_finance_operations";

const enterprisePattern = /我的企业|本企业|体检报告|这份报告|报告里|待核验|先处理哪个风险/;
const taxPattern = /税|发票|政策|申报|税收优惠|加计扣除|所得税|增值税|印花税|社保|稽查|纳税|征管|退税/;
const financePattern = /现金流|融资|贷款|成本|预算|应收账款|应付账款|经营分析|毛利|账期|周转|资金/;

export function routeAgentIntent(input: {
  message: string;
  reportId?: string | null;
  knowledgeDocumentId?: string | null;
}): AgentRouteIntent {
  const message = input.message.trim();
  if (input.reportId || enterprisePattern.test(message)) return "enterprise_report";
  if (input.knowledgeDocumentId || taxPattern.test(message)) return "tax_policy_case";
  if (financePattern.test(message)) return "sme_finance_operations";
  return "general";
}

export function requiresReliableRetrieval(intent: AgentRouteIntent): boolean {
  return intent === "tax_policy_case";
}

export function defaultFollowUps(intent: AgentRouteIntent): string[] {
  switch (intent) {
    case "tax_policy_case": return ["补充政策文号", "说明企业所在地区", "描述具体业务场景"];
    case "enterprise_report": return ["先处理哪个风险？", "有哪些待补资料？"];
    case "sme_finance_operations": return ["生成 13 周现金流清单", "如何缩短应收账款周期？"];
    case "general": return ["从小微企业现金流角度分析", "我需要准备哪些企业资料？"];
  }
}
