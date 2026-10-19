import type { KnowledgeDocument, KnowledgeSource } from "../domain/knowledge";

export const knowledgeSources: KnowledgeSource[] = [
  {
    id: "source-rd-policy",
    originalFileName: "研发费用税前加计扣除政策指引.pdf",
    relativePath: "政策/研发费用税前加计扣除政策指引.pdf",
    mimeType: "application/pdf",
    byteSize: 486_120,
    sha256: "demo-rd-policy-sha256",
    normalizedTextSha256: "demo-rd-policy-text-sha256",
    extractionStatus: "parsed",
    exactDuplicateOf: null,
    suspectedDuplicateGroup: null,
    downloadRef: "mock://source-rd-policy"
  },
  {
    id: "source-small-profit",
    originalFileName: "小型微利企业所得税优惠政策.pdf",
    relativePath: "政策/小型微利企业所得税优惠政策.pdf",
    mimeType: "application/pdf",
    byteSize: 294_880,
    sha256: "demo-small-profit-sha256",
    normalizedTextSha256: "demo-small-profit-text-sha256",
    extractionStatus: "partial",
    exactDuplicateOf: null,
    suspectedDuplicateGroup: null,
    downloadRef: "mock://source-small-profit"
  },
  {
    id: "source-failed-case",
    originalFileName: "制造业数字化转型案例扫描件.pdf",
    relativePath: "案例/制造业数字化转型案例扫描件.pdf",
    mimeType: "application/pdf",
    byteSize: 840_200,
    sha256: "demo-failed-case-sha256",
    normalizedTextSha256: null,
    extractionStatus: "failed",
    exactDuplicateOf: null,
    suspectedDuplicateGroup: "case-scan-demo",
    downloadRef: "mock://source-failed-case"
  }
];

export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "doc-rd-deduction",
    kind: "policy",
    sourceIds: ["source-rd-policy"],
    title: "研发费用税前加计扣除政策指引",
    docNo: null,
    issuer: ["国家税务总局"],
    publishedAt: "2023-07-01",
    effectiveStatus: "effective",
    parseStatus: "parsed",
    fullText: "企业开展研发活动中实际发生的研发费用，应依据适用政策、归集范围和留存备查要求判断。",
    summary: "介绍研发费用归集、加计扣除和留存备查的演示资料。",
    downloadRefs: ["mock://source-rd-policy"],
    matchEligibility: "structured-verified",
    supersedes: [],
    supersededBy: [],
    createdAt: "2026-10-15T00:00:00.000Z"
  },
  {
    id: "doc-small-profit",
    kind: "policy",
    sourceIds: ["source-small-profit"],
    title: "小型微利企业所得税优惠政策摘要",
    docNo: "财税演示〔2026〕01号",
    issuer: ["演示资料"],
    publishedAt: "2026-01-01",
    effectiveStatus: "effective",
    parseStatus: "partial",
    fullText: "需结合企业从业人数、资产总额、应纳税所得额等资料综合判断。",
    summary: "用于演示小型微利企业条件匹配；正式结论需以后端核验政策版本为准。",
    downloadRefs: ["mock://source-small-profit"],
    matchEligibility: "structured-verified",
    supersedes: [],
    supersededBy: [],
    createdAt: "2026-10-15T00:00:00.000Z"
  },
  {
    id: "doc-digital-case",
    kind: "case",
    sourceIds: ["source-failed-case"],
    title: "制造业数字化转型案例（原文件保留）",
    docNo: null,
    issuer: [],
    publishedAt: null,
    effectiveStatus: "unknown",
    parseStatus: "failed",
    fullText: null,
    summary: "该扫描件尚未成功解析，仍可查看元数据并下载原文件。",
    downloadRefs: ["mock://source-failed-case"],
    matchEligibility: "searchable-only",
    supersedes: [],
    supersededBy: [],
    createdAt: "2026-10-15T00:00:00.000Z"
  },
  {
    id: "doc-expired-news",
    kind: "news",
    sourceIds: ["source-small-profit"],
    title: "阶段性税费政策到期提醒",
    docNo: null,
    issuer: ["演示资讯中心"],
    publishedAt: "2025-12-31",
    effectiveStatus: "expired",
    parseStatus: "parsed",
    fullText: "部分阶段性政策已到期，新报告不应继续匹配。",
    summary: "用于演示失效状态和资料检索。",
    downloadRefs: ["mock://source-small-profit"],
    matchEligibility: "searchable-only",
    supersedes: [],
    supersededBy: [],
    createdAt: "2026-10-15T00:00:00.000Z"
  }
];
