import type { RiskQuestion } from "../domain/assessment";

const option = (questionId: string, index: number, label: string, effect: "safe" | "risk" | "unknown") => ({
  id: `${questionId}-${index + 1}`,
  label,
  effect,
  riskPoints: effect === "risk" ? (1 as const) : (0 as const)
});

function createQuestion(
  id: string,
  order: number,
  title: string,
  help: string,
  labels: string[],
  hasUnknown = true
): RiskQuestion {
  return {
    id,
    order,
    title,
    help,
    options: labels.map((label, index) => option(id, index, label, index === 0 ? "safe" : hasUnknown && index === labels.length - 1 ? "unknown" : "risk"))
  };
}

export const riskQuestions: RiskQuestion[] = [
  createQuestion("penalty", 1, "近 3 年，贵公司是否有过税务处罚或纳税信用等级变更？", "分析维度：税务处罚记录、纳税信用等级变动", ["没有，信用等级一直稳定", "有过税务行政处罚（罚款/警告）", "纳税信用等级发生过降级", "不清楚/未查询过"]),
  createQuestion("invoice-match", 2, "近 3 年，贵公司进项发票中，是否存在“税号或企业名称”与供应商实际信息不一致的情况？", "分析维度：发票税号名称不匹配风险", ["从未出现，全部一致", "偶尔有，已要求对方重开", "经常出现，需要频繁手工调整", "不清楚"]),
  createQuestion("cross-region", 3, "近 3 年，贵公司的采购和销售业务，是否主要集中在注册地以外的地区？", "分析维度：购销两头在外风险", ["不存在，业务主要在本地", "部分业务在外地，但正常经营", "大部分购销都在外地，本地无实际经营场所", "不清楚"]),
  createQuestion("red-flush", 4, "近 3 年，贵公司发票的“红冲”和“作废”情况如何？", "分析维度：红冲作废分析", ["非常少，属于正常范围", "偶尔有，都能合理解释", "频繁红冲/作废，占比明显偏高", "不清楚"]),
  createQuestion("customer-risk", 5, "近 3 年，贵公司前十大客户中，是否有被行政处罚的记录？", "分析维度：前十大客户行政处罚信息", ["没有，客户均为正常经营企业", "有一两个客户有过处罚记录", "有多个客户存在处罚记录", "不清楚"]),
  createQuestion("scale-match", 6, "近 3 年，贵公司开票规模与公司实际经营规模（员工人数、办公场地、营业收入）是否匹配？", "分析维度：公司规模与开票额匹配分析", ["完全匹配，开票额与经营规模一致", "部分月份开票额偏高，但能合理解释", "开票额远高于实际规模（如人员很少但开票量巨大）", "不清楚"]),
  createQuestion("sensitive-invoice", 7, "近 3 年，贵公司进项发票中，咨询费、服务费、会议费等“敏感业务”发票占比是否偏高？", "分析维度：敏感进项发票分析", ["没有，进项结构正常", "有一些，但比例正常", "敏感业务发票占比明显过高", "不清楚"]),
  createQuestion("mutual-invoice", 8, "近 3 年，贵公司是否与同一企业存在频繁的互开发票（对开/环开）情况？", "分析维度：互开发票风险", ["没有，上下游清晰", "有少量，属于正常业务往来", "存在明显的互开发票现象", "不清楚"]),
  createQuestion("risk-notice", 9, "近 3 年，贵公司是否收到过税务机关的“风险提示”或“自查通知”？", "分析维度：税务风险提示/自查通知记录", ["从未收到过", "收到过，已按要求自查并整改", "收到过，但尚未处理完毕", "不清楚"]),
  createQuestion("tax-mgmt", 10, "贵公司目前的税务管理方式是？", "分析维度：税务管理能力评估", ["有专职财务/税务人员，且定期参加税务培训", "有专职财务，但税务知识更新不及时", "委托代账公司处理，自己不审核", "老板自己处理，没有专业财务"], false)
];
