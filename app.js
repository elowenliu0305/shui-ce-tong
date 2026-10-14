(() => {
  "use strict";

  const APP_DATE = "2026.10.11";
  const STORAGE_KEY = "shuicetong-demo-v1";
  const root = document.getElementById("app");

  const iconPaths = {
    home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 12h8M12 8v8"/>',
    bot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M9 12h.01M15 12h.01M9 16h6M12 7V4M10 4h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    building: '<path d="M3 21h18M6 21V5l9-2v18M15 9h4v12M9 8h2M9 12h2M9 16h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    report: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-5"/>',
    alert: '<path d="M10.3 2.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M7.5 8C5 8 4 6.5 4 5s1-2 2.5-2C9 3 12 8 12 8s3-5 5.5-5C19 3 20 4 20 5s-1 3-3.5 3"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    attach: '<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.7 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
    heartFill: '<path fill="currentColor" stroke="none" d="M12 21 4.2 13.5l-1.1-1.1a5.5 5.5 0 0 1 7.8-7.8L12 5.7l1-1.1a5.5 5.5 0 1 1 7.8 7.8l-1.1 1.1z"/>',
    file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
    folder: '<path d="M3 5h6l2 2h10v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
    camera: '<path d="M14.5 4 16 6h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l1.5-2z"/><circle cx="12" cy="13" r="4"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
    refresh: '<path d="M20 6v5h-5M4 18v-5h5M5.5 9a7 7 0 0 1 11.8-2.5L20 11M4 13l2.7 4.5A7 7 0 0 0 18.5 15"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 5.5v14"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/>',
    sparkle: '<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
    zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
    coins: '<ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    sort: '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    tax: '<path d="M6 2h12v20H6zM9 6h6M9 10h6M9 14h2M14 14h1M9 18h2M14 18h1"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    more: '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>'
  };

  function icon(name, size = 20, extra = "") {
    return `<svg ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function taxDocSvg(prefix) {
    return `<svg viewBox="0 0 110 100" fill="none" aria-hidden="true">
      <defs><linearGradient id="${prefix}DocG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f9ff"/><stop offset="1" stop-color="#cfe2fc"/></linearGradient></defs>
      <g transform="rotate(-8 55 45)">
        <rect x="22" y="6" width="56" height="76" rx="9" fill="url(#${prefix}DocG)" stroke="#fff" stroke-opacity=".75"/>
        <rect x="32" y="18" width="26" height="5" rx="2.5" fill="#9cc4f5"/>
        <rect x="32" y="28" width="36" height="5" rx="2.5" fill="#b8d6f8"/>
        <text x="30" y="64" font-size="22" font-weight="700" fill="#1266d8" font-family="-apple-system,'PingFang SC',sans-serif">税</text>
      </g>
      <circle cx="82" cy="72" r="17" fill="#2f86ff" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
      <path d="m75 72 5 5 9-10" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function saveChartSvg(shadowId) {
    return `<svg viewBox="0 0 150 132" aria-hidden="true">
      <defs>
        <filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1e4680" flood-opacity="0.18"/></filter>
      </defs>
      <rect x="12" y="102" width="16" height="26" rx="4" fill="#cfe3fb"/>
      <rect x="38" y="88" width="16" height="40" rx="4" fill="#b7d4f9"/>
      <rect x="64" y="72" width="16" height="56" rx="4" fill="#96bef6"/>
      <rect x="90" y="56" width="16" height="72" rx="4" fill="#6ba5f0"/>
      <rect x="114" y="48" width="16" height="80" rx="4" fill="#4a8fe8"/>
      <path d="M20 96 L46 82 L72 66 L98 50 L122 44" fill="none" stroke="#9cc4f5" stroke-width="2" stroke-linecap="round"/>
      <circle cx="20" cy="96" r="2.5" fill="#8fbcf2"/>
      <circle cx="46" cy="82" r="2.5" fill="#8fbcf2"/>
      <circle cx="72" cy="66" r="2.5" fill="#8fbcf2"/>
      <circle cx="98" cy="50" r="2.5" fill="#8fbcf2"/>
      <g filter="url(#${shadowId})">
        <rect x="88" y="2" width="62" height="32" rx="9" fill="#fff"/>
        <polygon points="114,33.5 126,33.5 122,44" fill="#fff"/>
      </g>
      <text x="119" y="15" text-anchor="middle" font-size="8" fill="#8296b0" font-family="-apple-system,'PingFang SC',sans-serif">最高可节税</text>
      <text x="119" y="29" text-anchor="middle" font-size="12.5" font-weight="700" fill="#0b57c9" font-family="-apple-system,'PingFang SC',sans-serif">14.2 万元</text>
      <circle cx="122" cy="44" r="5.5" fill="#fff" stroke="#2f86ff" stroke-width="3"/>
    </svg>`;
  }

  const companiesSeed = [
    {
      id: "nebula",
      name: "杭州星云智创科技有限公司",
      short: "星云智创",
      region: "浙江省杭州市",
      industry: "软件和信息技术服务业",
      taxpayer: "一般纳税人",
      status: "画像完整度 88%"
    },
    {
      id: "muyi",
      name: "杭州木一文化创意有限公司",
      short: "木一文创",
      region: "浙江省杭州市",
      industry: "文化创意与传媒",
      taxpayer: "小规模纳税人",
      status: "待完成首次体检"
    }
  ];

  function freshState() {
    return {
      companies: companiesSeed,
      currentCompany: "nebula",
      assessmentCompleted: false,
      assessmentAnswers: {},
      questionIndex: 0,
      analysisStep: 0,
      favorites: ["software-list"],
      searchQuery: "研发费用",
      searchTab: "policy",
      resultFilter: "all",
      recalculated: false,
      aiContext: null,
      aiBusy: false,
      chatMessages: [
        {
          role: "assistant",
          html: "你好，我是税策通 AI 助手。我会结合<strong>权威政策依据</strong>和你选择的企业上下文，帮你解释适用条件、准备材料与潜在风险。"
        }
      ],
      files: [
        { name: "研发费用辅助账_2025.xlsx", type: "财务资料", date: "2026.10.02", status: "已完成归集检查" },
        { name: "增值税申报表_9月.pdf", type: "申报表", date: "2026.10.01", status: "已完成异常检查" }
      ],
      auth: { isLoggedIn: false, phone: "", name: "" },
      authSkipped: false,
      authTab: "login",
      smsCountdown: 0
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return saved ? { ...freshState(), ...saved, aiBusy: false } : freshState();
    } catch {
      return freshState();
    }
  }

  let state = loadState();
  let currentRoute = (state.auth?.isLoggedIn || state.authSkipped) ? "home" : "auth";
  let routeParams = {};
  let modal = null;
  let toastTimer = null;
  let analysisTimer = null;
let smsTimer = null;

  const questions = [
    {
      key: "penalty",
      title: "近 3 年，贵公司是否有过税务处罚或纳税信用等级变更？",
      help: "分析维度：税务处罚记录、纳税信用等级变动",
      options: ["没有，信用等级一直稳定", "有过税务行政处罚（罚款/警告）", "纳税信用等级发生过降级", "不清楚/未查询过"]
    },
    {
      key: "invoice-match",
      title: "近 3 年，贵公司进项发票中，是否存在“税号或企业名称”与供应商实际信息不一致的情况？",
      help: "分析维度：发票税号名称不匹配风险",
      options: ["从未出现，全部一致", "偶尔有，已要求对方重开", "经常出现，需要频繁手工调整", "不清楚"]
    },
    {
      key: "cross-region",
      title: "近 3 年，贵公司的采购和销售业务，是否主要集中在注册地以外的地区？",
      help: "分析维度：购销两头在外风险",
      options: ["不存在，业务主要在本地", "部分业务在外地，但正常经营", "大部分购销都在外地，本地无实际经营场所", "不清楚"]
    },
    {
      key: "red-flush",
      title: "近 3 年，贵公司发票的“红冲”和“作废”情况如何？",
      help: "分析维度：红冲作废分析",
      options: ["非常少，属于正常范围", "偶尔有，都能合理解释", "频繁红冲/作废，占比明显偏高", "不清楚"]
    },
    {
      key: "customer-risk",
      title: "近 3 年，贵公司前十大客户中，是否有被行政处罚的记录？",
      help: "分析维度：前十大客户行政处罚信息",
      options: ["没有，客户均为正常经营企业", "有一两个客户有过处罚记录", "有多个客户存在处罚记录", "不清楚"]
    },
    {
      key: "scale-match",
      title: "近 3 年，贵公司开票规模与公司实际经营规模（员工人数、办公场地、营业收入）是否匹配？",
      help: "分析维度：公司规模与开票额匹配分析",
      options: ["完全匹配，开票额与经营规模一致", "部分月份开票额偏高，但能合理解释", "开票额远高于实际规模（如人员很少但开票量巨大）", "不清楚"]
    },
    {
      key: "sensitive-invoice",
      title: "近 3 年，贵公司进项发票中，咨询费、服务费、会议费等“敏感业务”发票占比是否偏高？",
      help: "分析维度：敏感进项发票分析",
      options: ["没有，进项结构正常", "有一些，但比例正常", "敏感业务发票占比明显过高", "不清楚"]
    },
    {
      key: "mutual-invoice",
      title: "近 3 年，贵公司是否与同一企业存在频繁的互开发票（对开/环开）情况？",
      help: "分析维度：互开发票风险",
      options: ["没有，上下游清晰", "有少量，属于正常业务往来", "存在明显的互开发票现象", "不清楚"]
    },
    {
      key: "risk-notice",
      title: "近 3 年，贵公司是否收到过税务机关的“风险提示”或“自查通知”？",
      help: "分析维度：税务风险提示/自查通知记录",
      options: ["从未收到过", "收到过，已按要求自查并整改", "收到过，但尚未处理完毕", "不清楚"]
    },
    {
      key: "tax-mgmt",
      title: "贵公司目前的税务管理方式是？",
      help: "分析维度：税务管理能力评估",
      options: ["有专职财务/税务人员，且定期参加税务培训", "有专职财务，但税务知识更新不及时", "委托代账公司处理，自己不审核", "老板自己处理，没有专业财务"]
    }
  ];

  const policies = {
    "software-list": {
      id: "software-list",
      title: "享受税收优惠政策的软件企业清单（2026）",
      match: "高匹配",
      matchClass: "green",
      source: "国家发展改革委、工业和信息化部、财政部、海关总署、税务总局",
      doc: "发改高技〔2026〕487 号《关于做好 2026 年享受税收优惠政策的集成电路企业或项目、软件企业清单制定工作的通知》",
      docNo: "发改高技〔2026〕487 号",
      docTitle: "关于做好 2026 年享受税收优惠政策的集成电路企业或项目、软件企业清单制定工作的通知",
      pubDate: "2026-04-07",
      savingShort: "2.8 – 4.6 万元/年",
      valid: "现行有效 · 成文 2026.04.07",
      saving: "入清单后享受企业所得税等优惠（估算 2.8–4.6 万元/年）",
      summary: "列入国家鼓励的重点软件企业清单的，可享受企业所得税等优惠政策。2025 年已入清单的企业，2026 年需重新申报（申请窗口 4 月 7 日至 4 月 19 日）；符合条件可在所得税预缴时先行享受，年度汇算清缴时如未列入清单，按规定补缴税款、不加收滞纳金。",
      satisfied: ["行业为软件和信息技术服务业", "有自行开发的软件产品并持续研发投入", "按规定建账并能提供经审计的会计报告"],
      pending: ["是否达到重点鼓励类软件企业评价条件", "软件产品收入占比是否满足口径"],
      tags: ["软件企业", "企业所得税", "清单管理"]
    },
    "vat-newlaw": {
      id: "vat-newlaw",
      title: "增值税法施行后优惠政策衔接（2026 年第 10 号公告）",
      match: "高匹配",
      matchClass: "green",
      source: "财政部、国家税务总局",
      doc: "财政部 税务总局公告 2026 年第 10 号《关于增值税法施行后增值税优惠政策衔接事项的公告》",
      docNo: "财政部 税务总局公告 2026 年第 10 号",
      docTitle: "关于增值税法施行后增值税优惠政策衔接事项的公告",
      pubDate: "2026-10-08",
      savingShort: "0.6 – 1.2 万元/年",
      valid: "现行有效 · 2026.01.01 起施行",
      saving: "0.6–1.2 万元/年（进项与优惠口径复核）",
      summary: "《中华人民共和国增值税法》及实施条例于 2026 年 1 月 1 日正式施行，第 10 号公告明确起征点（月销售额 10 万元、季度 30 万元）和免征增值税项目等衔接安排。企业需按新法口径复核纳税人身份、适用税率与已享优惠是否延续。",
      satisfied: ["增值税一般纳税人，按月正常申报", "经营范围不涉及新增免税项目"],
      pending: ["2026 年度新增/调整优惠事项的衔接口径确认", "开票与台账在新口径下的一致性核对"],
      tags: ["增值税", "新法施行", "政策衔接"]
    },
    "cross-region": {
      id: "cross-region",
      title: "跨区域涉税事项报验管理",
      match: "待补信息",
      matchClass: "orange",
      source: "国家税务总局",
      doc: "《关于明确跨区域涉税事项报验管理相关问题的公告》及官方解读",
      docNo: "国家税务总局公告",
      docTitle: "关于明确跨区域涉税事项报验管理相关问题的公告",
      pubDate: "2018-07-04",
      savingShort: "待测算",
      valid: "现行有效 · 地方办理口径需确认",
      saving: "避免逾期申报与监管风险（不直接节税）",
      summary: "企业在注册地以外开展生产经营（建筑作业、跨区域提供服务等）的，需按规定向经营地税务机关进行涉税事项报验，并在经营结束后办理税款申报与结清。公司若购销或服务集中在外地，建议先确认是否属于报验管理范围。",
      satisfied: ["电子税务局账户可用，具备跨区域业务办理条件"],
      pending: ["实际经营地与跨区业务持续时间", "是否存在需报验的具体项目"],
      tags: ["跨区经营", "报验管理", "资料待补"]
    }
  };

  const risks = {
    "rd-evidence": {
      id: "rd-evidence",
      title: "研发费用归集凭证不完整",
      level: "中风险",
      levelClass: "orange",
      sourceType: "基于已上传的《研发费用辅助账_2025.xlsx》样例核验",
      reason: "材料领用记录中有 3 笔费用缺少研发项目编号，部分工时记录仅按部门归集。",
      impact: "可能影响研发费用加计扣除的可归集金额，后续核查时需要补充证明。",
      advice: "先补齐项目编号与领料单，再按研发项目重新核对人员工时和材料消耗。",
      evidence: ["3 笔材料费用未关联研发项目", "2 名研发人员 9 月工时记录缺失", "辅助账与总账差异 8,420 元"]
    },
    "invoice-gap": {
      id: "invoice-gap",
      title: "开票与收入确认存在时间差",
      level: "低风险",
      levelClass: "blue",
      sourceType: "基于企业画像与 9 月增值税申报表的规则提醒",
      reason: "9 月部分已开票项目尚未在同期间的收入台账中确认，存在跨期情形。",
      impact: "可能造成增值税与企业所得税口径暂时不一致，需要留存合理说明。",
      advice: "核对履约进度与收入确认政策，为跨期项目保留合同、验收单和对账记录。",
      evidence: ["开票金额与收入台账差异 26,000 元", "涉及 1 个跨月实施项目"]
    }
  };

  const cases = [
    {
      id: "case-anchor",
      title: "网络主播私户收款隐匿收入偷税案",
      source: "国家税务总局杭州市税务局第三稽查局 · 2026.07.10 公布",
      summary: "主播 2021–2023 年通过私人账户收款隐匿收入、转换收入性质等方式，少缴个人所得税、增值税等税费 313.45 万元，被追缴税费、加收滞纳金并处罚款共计 631.96 万元，款项已全部入库。",
      tags: ["网络直播", "私户收款", "隐匿收入"],
      result: "涉案税费款、滞纳金及罚款全部追缴入库；经营收入须通过对公账户结算，按期如实申报全部收入。",
      background: "当事人在网络平台从事直播带货经营活动，注册为个体工商户（小规模纳税人），实际经营规模已接近甚至超过一般纳税人标准。",
      problems: ["直播经营收入通过私人银行账户收取，长期不入账", "人为转换收入性质，少缴增值税与个人所得税", "疑似违规保留小规模纳税人身份适用低征收率"],
      handling: ["税务机关依托税收大数据分析线索立案，逐笔核对私户流水", "2025 年 12 月作出处理决定：少缴税费 313.45 万元，追缴及罚款合计 631.96 万元", "全部款项追缴入库，并对当事人提示规范资金收款渠道"],
      related: { policyId: "vat-newlaw", note: "增值税法 2026 年施行后，违规维持小规模身份的追溯补税成本显著提高" }
    },
    {
      id: "case-dereg",
      title: "涉税中介违规帮助企业注销被罚案",
      source: "国家税务总局焦作市税务局稽查局 · 2026.06.18 公布",
      summary: "代账公司在客户企业注销时违规确认资产损失、虚假填报清算报表（净资产单日由 666.63 万元变为 -2,675 元），造成投资人少缴个税 133.32 万元；中介被没收违法所得 2 万元并处罚款 66.66 万元，列为涉税服务失信主体。",
      tags: ["注销清算", "代账风险", "个人所得税"],
      result: "投资人少缴个税依法追征；中介及其实际控制人被列为涉税服务失信主体，全部款项追缴入库。",
      background: "某贸易公司 2022–2024 年持续盈利，2024 年 10 月委托一家会计服务公司办理税务注销手续。",
      problems: ["同一日提交的三、四季度报表，净资产由正转负、数据反差巨大", "中介违规确认货币资产损失，虚假填报清算附表与纳税申报", "清算环节未代扣代缴投资人分得剩余资产应缴的个人所得税"],
      handling: ["税务机关通过大数据发现注销疑点，调取流水与申报资料核查", "向投资人追征少缴个人所得税 133.32 万元", "依据征管法实施细则第九十三条，对中介没收违法所得并处少缴税款 0.5 倍罚款"],
      related: { doc: "《中华人民共和国税收征收管理法实施细则》第九十三条、财税〔2009〕60 号" }
    }
  ];

  const answerLabels = {
    "penalty": "处罚与信用等级",
    "invoice-match": "发票信息一致性",
    "cross-region": "购销地域分布",
    "red-flush": "红冲作废情况",
    "customer-risk": "客户处罚记录",
    "scale-match": "规模匹配度",
    "sensitive-invoice": "敏感进项占比",
    "mutual-invoice": "互开发票",
    "risk-notice": "风险提示记录",
    "tax-mgmt": "税务管理方式"
  };

  function saveState() {
    const persistable = { ...state, aiBusy: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }

  function currentCompany() {
    return state.companies.find((company) => company.id === state.currentCompany) || state.companies[0];
  }

  function statusBar(light = false) {
    return `<div class="status-bar" ${light ? 'style="color:#fff"' : ""}>
      <span>9:41</span>
      <span class="status-icons"><span class="signal"><i></i><i></i><i></i><i></i></span><span>⌁</span><span class="battery"></span></span>
    </div>`;
  }

  function pageHead(title, subtitle = "", actions = "") {
    return `<header class="page-head">
      <button class="icon-btn" data-action="back" aria-label="返回">${icon("back", 23)}</button>
      <div class="head-copy"><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>
      ${actions || '<span style="width:42px"></span>'}
    </header>`;
  }

  function bottomNav(active) {
    const items = [
      ["home", "home", "首页"],
      ["checkup", "scan", "体检"],
      ["ai", "bot", "问答"],
      ["profile", "user", "我的"]
    ];
    return `<nav class="bottom-nav" aria-label="主导航">${items.map(([route, name, label]) => `
      <button class="nav-item ${active === route ? "active" : ""}" data-nav="${route}" aria-label="${label}">
        ${icon(name, 21)}<span>${label}</span>
      </button>`).join("")}</nav>`;
  }

  function trustNote() {
    return `<div class="trust-note">演示数据仅用于产品体验 · 结果为辅助决策建议，不替代专业税务意见</div>`;
  }

  function layout(content, active = null, options = {}) {
    const noNav = options.noNav || !active;
    return `<div class="phone-frame"><div class="phone-screen"><div class="app-shell"><main class="page ${noNav ? "no-nav" : ""} ${options.className || ""}">${content}</main>${active ? bottomNav(active) : ""}${renderModal()}${renderToast()}</div></div></div>`;
  }

  const ROOT_ROUTES = ["home", "checkup", "ai", "profile", "auth"];
  const navStack = [];

  // record=false 时不压栈（用于"返回"）；analyzing 为过渡页，不作为返回目标
  function navigate(route, params = {}, record = true) {
    if (record && currentRoute !== route && currentRoute !== "analyzing") {
      if (ROOT_ROUTES.includes(route)) navStack.length = 0;
      else navStack.push({ route: currentRoute, params: { ...routeParams } });
    }
    currentRoute = route;
    routeParams = params;
    modal = null;
    render();
    requestAnimationFrame(() => {
      const page = document.querySelector(".page");
      if (page) page.scrollTop = 0;
    });
  }

  function go(route, params) { navigate(route, params, true); }

  function showToast(message, kind = "") {
    state.toast = { message, kind };
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      state.toast = null;
      render();
    }, 2300);
  }

  function renderToast() {
    if (!state.toast) return "";
    return `<div class="toast ${state.toast.kind || ""}" role="status">${icon(state.toast.kind === "success" ? "check" : "info", 18)}<span>${escapeHtml(state.toast.message)}</span></div>`;
  }

  function homePage() {
    const services = [
      { title: "AI税务体检", sub: "全面诊断风险", icon: "shield", tone: "blue", attrs: 'data-route="checkup"' },
      { title: "政策匹配", sub: "精准解读适用", icon: "search", tone: "yellow", attrs: 'data-route="opportunities"' },
      { title: "风险预警", sub: "识别潜在风险", icon: "alert", tone: "red", attrs: 'data-route="risks"' },
      { title: "智能问答", sub: "7×24小时", icon: "bot", tone: "violet", attrs: 'data-nav="ai"' },
      { title: "税务画像", sub: "企业税务全景", icon: "building", tone: "green", attrs: 'data-route="companies"' },
      { title: "体检报告", sub: "生成专业报告", icon: "report", tone: "purple", attrs: 'data-route="report"' },
      { title: "文件解析", sub: "支持图片/文档", icon: "file", tone: "cyan", attrs: 'data-action="choose-file"' },
      { title: "更多服务", sub: "企业全场景", icon: "more", tone: "silver", attrs: '' }
    ];
    const homeNews = [
      { title: "增值税法 1 月 1 日起施行，10 号公告明确优惠衔接", summary: "财政部、税务总局明确起征点（月 10 万/季 30 万）与免征增值税项目衔接安排，企业应复核纳税人身份与已享优惠口径…", tags: ["增值税新法", "政策衔接", "快讯"], date: "2026-10-10", tone: "coins", icon: "tax", route: "policy", id: "vat-newlaw" },
      { title: "7 起网红网店偷税案件集中曝光，平台经营者应诚信纳税", summary: "私户收款隐匿收入、转换收入性质，追缴税费、滞纳金并处罚款全部入库。网络并非法外之地，经营收入须对公结算…", tags: ["稽查曝光", "平台经济", "合规提醒"], date: "2026-07-10", tone: "shield", icon: "shield", route: "case", id: "case-anchor" },
      { title: "专家解读：“逃逸式”注销不能逃避税收责任", summary: "注销不消除存续期间纳税义务，欺诈注销可被撤销登记并追征税款，偷税追征不受期限限制，个体户实控人承担连带责任…", tags: ["注销风险", "专家解读", "征管法"], date: "2026-07-10", tone: "desk", icon: "building", route: "case", id: "case-dereg" },
      { title: "2026 年软件企业税收优惠清单申报启动，已入清单需重新申报", summary: "发改高技〔2026〕487 号明确 2025 年已列入清单的企业 2026 年需重新申报，申请窗口 4 月 7 日至 19 日，预缴可先行享受…", tags: ["软件企业", "清单管理", "所得税优惠"], date: "2026-04-07", tone: "chart", icon: "report", route: "policy", id: "software-list" }
    ];
    return layout(`
      <section class="ref-home-top">
        ${statusBar(true)}
        <div class="ref-home-header">
          <div class="ref-brand-copy">
            <h1>税策通<sup>®</sup></h1>
            <div class="ref-brand-sub">智&nbsp;&nbsp;能&nbsp;&nbsp;税&nbsp;&nbsp;务&nbsp;&nbsp;助&nbsp;&nbsp;手</div>
            <div class="ref-brand-line"></div>
            <p>让税务更简单 · 让企业更强大</p>
          </div>
          <div class="ref-hero-scene" aria-hidden="true">
            <span class="ref-cap cap-one">政策精准匹配</span>
            <span class="ref-cap cap-two">风险智能预警</span>
            <span class="ref-cap cap-three">AI专业解答</span>
            <svg viewBox="0 0 235 180" role="img" aria-label="税务增长分析示意">
              <defs>
                <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#90c8ff"/></linearGradient>
                <linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#43a9ff"/><stop offset="1" stop-color="#0647c8"/></linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <ellipse cx="141" cy="155" rx="88" ry="21" fill="#0e6eea" opacity=".6" filter="url(#glow)"/>
              <ellipse cx="141" cy="148" rx="72" ry="17" fill="url(#stage)" stroke="#6bc8ff" stroke-width="2"/>
              <rect x="104" y="25" width="76" height="112" rx="8" fill="url(#paper)" transform="rotate(8 142 81)" opacity=".96"/>
              <path d="M119 43h42M119 55h32M119 112h46" stroke="#7cb8fb" stroke-width="4" stroke-linecap="round"/>
              <text x="141" y="91" text-anchor="middle" fill="#1269ed" font-size="42" font-weight="900">税</text>
              <rect x="68" y="112" width="16" height="26" rx="3" fill="#38aaff"/><rect x="88" y="101" width="16" height="37" rx="3" fill="#67c5ff"/><rect x="184" y="100" width="14" height="38" rx="3" fill="#45a5ff"/><rect x="201" y="85" width="14" height="53" rx="3" fill="#79caff"/>
              <path d="M65 116c46 3 77-8 113-36l27-23" fill="none" stroke="#e7fbff" stroke-width="5" stroke-linecap="round" filter="url(#glow)"/>
              <path d="m195 56 17-5-6 17" fill="#e7fbff"/>
              <rect x="184" y="34" width="36" height="26" rx="4" fill="#3b9aff" opacity=".65"/><path d="M191 43h18M191 49h12" stroke="#9cdbff" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <form class="ref-search" id="home-search-form">
          <label>
            ${icon("search", 24)}
            <input id="home-search-input" aria-label="搜索政策、案例或税务问题" placeholder="搜索税收政策、案例、税务问题" value="" />
          </label>
        </form>
        <div class="ref-hot-row"><b>🔥 热门搜索：</b><div>${["研发加计扣除", "小微企业", "高新技术企业", "税务风险"].map((term) => `<button data-action="hot-search" data-value="${term}">${term}</button>`).join("")}</div></div>
        <div class="ref-service-panel">
          ${services.map((item) => `<button class="ref-service" ${item.attrs}><span class="ref-service-icon ${item.tone}">${icon(item.icon, 26)}</span><strong>${item.title}</strong><small>${item.sub}</small></button>`).join("")}
        </div>
      </section>
      <section class="ref-news-section">
        <div class="ref-news-head"><h2><i></i>税务快讯</h2><button data-route="search">查看更多 ${icon("chevron", 15)}</button></div>
        <div class="ref-news-list">
          ${homeNews.map((item) => `<article class="ref-news-item" tabindex="0" data-route="${item.route}" data-id="${item.id}">
            <div class="ref-news-copy"><h3>${item.title}</h3><p>${item.summary}</p><div class="ref-news-meta"><div>${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div><time>${item.date}</time></div></div>
            <div class="ref-news-thumb ${item.tone}"><span>${icon(item.icon, 32)}</span><i>${icon("chevron", 14)}</i></div>
          </article>`).join("")}
        </div>
      </section>
    `, "home", { className: "ref-home-page" });
  }

  function checkupPage() {
    const company = currentCompany();
    if (state.assessmentCompleted) {
      return layout(`
        <section class="checkup-full-hero">
          ${statusBar(true)}
          <div class="checkup-hero-top">
            <div style="min-width:0"><h1>AI 税务体检</h1><p>${escapeHtml(company.name)}</p></div>
            <button class="icon-btn light" data-action="company-switch" aria-label="切换企业">${icon("building", 21)}</button>
          </div>
          <div class="checkup-hero-content">
            <div class="checkup-status">${icon("check", 14)} 本次体检已完成</div>
            <h2>机会看得见，风险早一步</h2>
            <p>已基于 10 项企业画像、3 类政策规则与 2 份演示材料进行分析。</p>
          </div>
          <div class="checkup-hero-actions">
            <button class="btn checkup-btn-primary" data-route="report">查看完整报告 ${icon("arrow", 17)}</button>
            <button class="btn checkup-btn-ghost" data-route="assessment-intro">${icon("refresh", 17)} 重新体检</button>
          </div>
        </section>
        <section class="checkup-results-card">
          <div class="section-title"><h2>本次结果</h2><span class="tag green">${APP_DATE}</span></div>
          <div class="metric-row" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
            <div class="metric green"><b>3</b><span>政策机会</span><small>预计节税 8.6–14.2 万元/年</small></div>
            <div class="metric orange"><b>2</b><span>风险提醒</span><small>1 项建议优先处理</small></div>
            <div class="metric blue"><b>86%</b><span>画像完整度</span><small>已完善 8 / 9 项信息</small></div>
          </div>
          <div class="stack" style="margin-top:16px">
            <button class="result-card card tap-card green" data-route="opportunities"><span class="mini-icon" style="color:var(--green);background:var(--green-soft)">${icon("gift", 24)}</span><span class="copy"><h3>查看政策红利</h3><p>3 项机会，预计节税 8.6–14.2 万元/年</p></span>${icon("chevron", 20, 'class="chev"')}</button>
            <button class="result-card card tap-card orange" data-route="risks"><span class="mini-icon" style="color:var(--orange);background:var(--orange-soft)">${icon("alert", 24)}</span><span class="copy"><h3>查看风险提醒</h3><p>1 项建议优先处理，1 项持续观察</p></span>${icon("chevron", 20, 'class="chev"')}</button>
          </div>
          <div class="subtle-note" style="margin-top:16px">${icon("info", 18)}<span>企业画像或政策发生变化时，建议重新体检。历史报告会保留为时间快照。</span></div>
        </section>
      `, "checkup", { className: "page-bg-blue" });
    }

    return layout(`
      <section class="checkup-first-hero">
        ${statusBar(true)}
        <div class="checkup-hero-top">
          <button class="icon-btn light" data-action="back" aria-label="返回">${icon("back", 22)}</button>
          <div style="min-width:0"><h1>AI 税务体检</h1><p>${escapeHtml(company.name)}</p></div>
          <button class="icon-btn light" data-action="company-switch" aria-label="切换企业">${icon("report", 20)}</button>
        </div>
        <div class="checkup-pill-row"><span class="checkup-pill">${icon("clock", 13)} 3 分钟完成 · 基于企业画像精准分析</span></div>
        <div class="checkup-first-body">
          <div class="checkup-first-copy">
            <h2>先了解企业<br>再给专属答案</h2>
            <p>通过企业信息和政策规则，全面识别税务机会、潜在风险与优化建议。</p>
            <button class="btn checkup-btn-primary" data-route="assessment-intro" style="flex:none;width:auto;margin-top:18px;padding:0 22px">开始首次体检 ${icon("arrow", 17)}</button>
          </div>
          <div class="checkup-3d" aria-hidden="true">
            <svg viewBox="0 0 200 190" fill="none">
              <defs>
                <linearGradient id="cfDocG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f8ff"/><stop offset="1" stop-color="#c9defc"/></linearGradient>
                <linearGradient id="cfPodG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6db2ff"/><stop offset="1" stop-color="#1d5fd6"/></linearGradient>
              </defs>
              <ellipse cx="108" cy="168" rx="84" ry="13" fill="#0a2f7f" opacity=".45"/>
              <ellipse cx="108" cy="162" rx="84" ry="15" fill="url(#cfPodG)"/>
              <ellipse cx="108" cy="159" rx="64" ry="9" fill="#8ec6ff" opacity=".5"/>
              <g transform="rotate(-7 96 92)">
                <rect x="46" y="16" width="102" height="134" rx="14" fill="url(#cfDocG)" stroke="#fff" stroke-opacity=".7"/>
                <rect x="62" y="34" width="52" height="7" rx="3.5" fill="#9cc4f5"/>
                <rect x="62" y="48" width="70" height="7" rx="3.5" fill="#b8d6f8"/>
                <rect x="62" y="62" width="40" height="7" rx="3.5" fill="#b8d6f8"/>
                <text x="66" y="110" font-size="32" font-weight="700" fill="#1266d8" font-family="-apple-system,'PingFang SC',sans-serif">税</text>
                <rect x="62" y="124" width="10" height="14" rx="2" fill="#5ea0ef"/>
                <rect x="76" y="118" width="10" height="20" rx="2" fill="#3f8ce8"/>
                <rect x="90" y="112" width="10" height="26" rx="2" fill="#1266d8"/>
                <rect x="104" y="106" width="10" height="32" rx="2" fill="#0b4fb0"/>
              </g>
              <circle cx="152" cy="104" r="27" fill="rgba(140,200,255,.3)" stroke="#2f86ff" stroke-width="9"/>
              <path d="M172 126 190 146" stroke="#2f86ff" stroke-width="12" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <div class="checkup-trio">
          <div class="trio-item"><span class="trio-ico">${icon("zap", 17)}</span><div><b>3 分钟完成</b><small>快速生成报告</small></div></div>
          <div class="trio-item"><span class="trio-ico">${icon("scan", 17)}</span><div><b>基于政策规则</b><small>多维度智能分析</small></div></div>
          <div class="trio-item"><span class="trio-ico">${icon("shield", 17)}</span><div><b>专业可靠</b><small>数据加密安全</small></div></div>
        </div>
      </section>
      <div class="checkup-sheet">
        <section class="checkup-sheet-sec">
          <div class="sheet-title"><h2>你将获得</h2><button class="text-link" data-route="report">查看示例报告 ${icon("chevron", 15)}</button></div>
          <div class="get-tiles">
            <div class="get-tile green"><span class="tile-ico">${icon("gift", 20)}</span><b>专属政策机会</b><p>自动匹配你可享受的税收优惠政策</p></div>
            <div class="get-tile orange"><span class="tile-ico">${icon("alert", 20)}</span><b>分级风险提醒</b><p>识别潜在税务风险，提供应对建议</p></div>
            <div class="get-tile blue"><span class="tile-ico">${icon("report", 20)}</span><b>优先行动清单</b><p>明确该做什么、准备哪些材料</p></div>
          </div>
        </section>
        <section class="checkup-sheet-sec">
          <div class="sheet-title"><h2>示例报告预览</h2><button class="text-link" data-route="report">查看完整示例 ${icon("chevron", 15)}</button></div>
          <div class="preview-body">
            <div class="preview-docs">
              <div class="pdoc back-doc"></div>
              <div class="pdoc front-doc"><b>企业税务体检报告</b><i></i><i style="width:80%"></i><i style="width:55%"></i><div class="pchart"><span style="height:35%"></span><span style="height:55%"></span><span style="height:75%"></span><span style="height:100%"></span></div></div>
            </div>
            <div class="preview-side">
              <div class="metric-row bare">
                <div class="metric green"><b>3<small>项</small></b><span>政策机会</span></div>
                <div class="metric orange"><b>2<small>项</small></b><span>风险提醒</span></div>
                <div class="metric blue"><b>A-</b><span>综合建议</span></div>
              </div>
              <div class="preview-list">
                <div class="prow"><span class="p-ico green">${icon("check", 11)}</span>匹配可享受的税收优惠政策</div>
                <div class="prow"><span class="p-ico orange">${icon("alert", 10)}</span>发现需关注的潜在风险</div>
                <div class="prow"><span class="p-ico blue">${icon("report", 10)}</span>提供针对性的优化建议与行动清单</div>
              </div>
            </div>
          </div>
        </section>
        <div class="checkup-note">${icon("info", 15)}<span>本次体检基于企业画像、政策规则与行业数据进行智能分析，结果仅供参考，不替代专业税务意见。</span></div>
      </div>
    `, "checkup");
  }

  function assessmentIntroPage() {
    return layout(`
      ${statusBar()}
      ${pageHead("AI 税务体检", "约 3 分钟完成最小企业画像")}
      <div class="intro-visual"><div class="doc"><i></i><i></i><i style="width:65%"></i></div><div class="lens"></div></div>
      <div class="center-copy"><h1>先了解企业，再精准判断</h1><p>回答 10 个简单问题，系统会结合政策依据与演示规则，生成企业专属的机会、风险和行动建议。</p></div>
      <div class="feature-points">
        <div class="feature-point"><span class="mini-icon intro-img"><img src="./intro-clock.png" alt="" width="42" height="42"></span><div><strong>渐进式采集</strong><span>不清楚的信息可以跳过，不会阻断体检</span></div></div>
        <div class="feature-point"><span class="mini-icon intro-img"><img src="./intro-shield.png" alt="" width="42" height="42"></span><div><strong>隐私边界清晰</strong><span>当前为本地 Demo，不会上传你的真实文件</span></div></div>
        <div class="feature-point"><span class="mini-icon intro-img"><img src="./intro-doc.png" alt="" width="42" height="42"></span><div><strong>结论可解释</strong><span>每条结果提供政策依据、条件和更新时间</span></div></div>
      </div>
      <div class="sticky-cta cta-flush"><button class="btn primary block" data-route="assessment-method">开始体检 ${icon("arrow", 18)}</button></div>
    `, null, { className: "page-bg-blue" });
  }

  function assessmentMethodPage() {
    return layout(`
      ${statusBar()}
      ${pageHead("建立企业画像", "选择一种更方便的录入方式")}
      <div class="center-copy" style="padding-top:28px;text-align:left"><div class="eyebrow">${icon("building", 15)} 第 1 步</div><h1 style="font-size:25px">从企业基础信息开始</h1><p style="margin-left:0">营业执照可帮助识别企业名称、统一社会信用代码、成立日期等基础信息，经营数据仍需后续补充。</p></div>
      <div class="method-list">
        <button class="method-card card tap-card" data-action="license-demo">
          <span class="mini-icon">${icon("camera", 25)}</span><span style="flex:1"><h3>识别营业执照</h3><p>使用示例执照体验 OCR 自动录入</p></span>${icon("chevron", 20, 'class="chev"')}
        </button>
        <button class="method-card card tap-card" data-action="start-questionnaire">
          <span class="mini-icon" style="color:var(--green);background:var(--green-soft)">${icon("edit", 25)}</span><span style="flex:1"><h3>直接补充企业信息</h3><p>基于当前企业档案完成 10 项关键画像</p></span>${icon("chevron", 20, 'class="chev"')}
        </button>
      </div>
      <div class="section">
        <div class="subtle-note">${icon("info", 18)}<span>Demo 只读取你主动选择的文件名，不会上传或解析真实内容。比赛演示建议使用“识别营业执照”。</span></div>
      </div>
    `, null, { className: "page-bg-blue" });
  }

  function questionnairePage() {
    const q = questions[state.questionIndex];
    const selected = state.assessmentAnswers[q.key];
    const pct = ((state.questionIndex + 1) / questions.length) * 100;
    return layout(`
      ${statusBar()}
      ${pageHead("完善企业画像", `${state.questionIndex + 1} / ${questions.length}`)}
      <div class="progress-wrap"><div class="progress-meta"><span>关键画像采集</span><span>${Math.round(pct)}%</span></div><div class="progress-track"><i style="width:${pct}%"></i></div></div>
      <div class="save-band compact">
        <span class="s-ico">${icon("coins", 18)}</span>
        <div class="s-copy"><small>预计可节税区间 ${icon("info", 12)}</small><strong>8.6 – 14.2 <span>万元/年</span></strong></div>
        <div class="save-chart">${saveChartSvg("sbShadowQ")}</div>
      </div>
      <section class="question-wrap">
        <div class="eyebrow">问题 ${state.questionIndex + 1}</div>
        <h1>${q.title}</h1>
        <p class="question-help">${q.help}</p>
        <div class="choices">
          ${q.options.map((option) => `<button class="choice ${selected === option ? "selected" : ""}" data-action="select-answer" data-value="${escapeHtml(option)}"><span>${option}</span><i class="radio"></i></button>`).join("")}
        </div>
      </section>
      <div class="sticky-cta cta-flush">
        <button class="btn ghost" data-action="prev-question" ${state.questionIndex === 0 ? "disabled" : ""}>上一步</button>
        <button class="btn primary" data-action="next-question">${state.questionIndex === questions.length - 1 ? "确认画像" : "下一步"} ${icon("arrow", 17)}</button>
      </div>
    `, null, { className: "page-bg-blue page-flex" });
  }

  function profileConfirmPage() {
    const company = currentCompany();
    const answers = questions.map((q) => [answerLabels[q.key], state.assessmentAnswers[q.key] || "待补充"]);
    const missing = answers.filter(([, value]) => value === "待补充" || value === "暂不清楚").length;
    return layout(`
      ${statusBar()}
      ${pageHead("确认企业画像", "确认后开始匹配政策与风险")}
      <section class="detail-hero">
        <span class="tag green">画像完整度 ${Math.max(70, 100 - missing * 6)}%</span>
        <h1>${escapeHtml(company.name)}</h1>
        <p>${escapeHtml(company.region)} · 本次画像仅用于演示分析</p>
      </section>
      <section class="profile-summary card">
        ${answers.map(([label, value]) => `<div class="summary-row"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join("")}
      </section>
      <section class="section">
        <div class="subtle-note">${icon(missing ? "alert" : "check", 18)}<span>${missing ? `仍有 ${missing} 项信息待补，系统会降低相关结论置信度，但不影响继续体检。` : "关键画像已完整，可开始生成专属分析。"}</span></div>
        <button class="text-link" data-action="edit-answers" style="margin:8px auto 0">${icon("edit", 15)} 返回修改</button>
      </section>
      <div class="sticky-cta"><button class="btn primary block" data-action="start-analysis">开始 AI 分析 ${icon("sparkle", 18)}</button></div>
    `, null, { className: "page-bg-blue" });
  }

  function analyzingPage() {
    const steps = ["梳理企业税务画像", "匹配现行政策条件", "识别潜在税务风险", "生成行动优先级"];
    return layout(`
      <section class="analysis-page">
        <div class="analysis-orb">${icon("tax", 28)}</div>
        <h1>AI 正在分析中</h1>
        <p>正在结合企业画像、演示政策库和规则进行综合判断</p>
        <div class="analysis-steps">
          ${steps.map((step, index) => `<div class="analysis-step ${index < state.analysisStep ? "done" : index === state.analysisStep ? "active" : ""}"><i>${index < state.analysisStep ? "✓" : index + 1}</i><span>${step}</span></div>`).join("")}
        </div>
        <div class="trust-note" style="margin-top:auto">分析结果为 Demo 演示，不构成申报或税务专业意见</div>
      </section>
    `, null, { noNav: true });
  }

  function reportPage() {
    const company = currentCompany();
    return layout(`
      <div class="report-scroll-area">
      <section class="report-hero">
        ${statusBar(true)}
        <div class="report-hero-top">
          <button class="icon-btn light" data-action="back" aria-label="返回">${icon("back", 22)}</button>
          <div style="min-width:0;flex:1"><h1>企业税务体检报告</h1><p>生成于 ${APP_DATE} · 政策库更新至 2026.10.10</p></div>
          <button class="icon-btn light" data-action="company-switch" aria-label="切换企业">${icon("report", 20)}</button>
        </div>
        <div class="company-report">
          <span class="mini-icon">${icon("building", 22)}</span>
          <div style="min-width:0"><strong>${escapeHtml(company.name)}</strong><small>${escapeHtml(company.industry)} · ${escapeHtml(company.taxpayer)}</small></div>
          <div class="report-3d">${taxDocSvg("rp")}</div>
        </div>
      </section>
      <div class="report-sheet">
        <section class="health-card">
          <div class="sheet-title"><h2>企业税务健康度 ${icon("info", 15)}</h2></div>
          <div class="health-body">
            <div class="ring-wrap">
              <svg viewBox="0 0 120 120" class="ring" aria-hidden="true">
                <circle cx="60" cy="60" r="52" stroke="#dbe9fb" stroke-width="11" fill="none"/>
                <circle cx="60" cy="60" r="52" stroke="#2f86ff" stroke-width="11" fill="none" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="45.7" transform="rotate(-90 60 60)"/>
              </svg>
              <div class="ring-center"><b>86%</b><span>整体健康度</span><em>良好</em></div>
            </div>
            <div class="health-rows">
              <button class="hrow" data-route="opportunities"><span class="h-ico green">${icon("shield", 18)}</span><div class="h-copy"><b>3<small>项</small></b><span>政策机会</span></div>${icon("chevron", 16, 'class="h-chev"')}</button>
              <button class="hrow" data-route="risks"><span class="h-ico orange">${icon("alert", 18)}</span><div class="h-copy"><b>2<small>项</small></b><span>风险提醒</span></div>${icon("chevron", 16, 'class="h-chev"')}</button>
              <button class="hrow" data-route="profile-confirm"><span class="h-ico blue">${icon("report", 18)}</span><div class="h-copy"><b>1<small>项</small></b><span>待优化</span></div>${icon("chevron", 16, 'class="h-chev"')}</button>
            </div>
          </div>
          <div class="save-band">
            <span class="s-ico">${icon("coins", 22)}</span>
            <div class="s-copy">
              <small>预计可节税区间 ${icon("info", 12)}</small>
              <strong>8.6 – 14.2 <span>万元/年</span></strong>
              <p>基于所选营收、所得额与研发情况估算</p>
            </div>
            <div class="save-chart">${saveChartSvg("sbShadow")}</div>
          </div>
        </section>
        <div class="sheet-sec">
          <div class="sheet-sec-head"><h3>重点发现</h3><button class="text-link">查看完整报告 ${icon("chevron", 15)}</button></div>
          <div class="find-grid">
            <button class="find-card green" data-route="opportunities">
              <div class="f-head"><span class="f-ico">${icon("gift", 19)}</span><b>政策红利匹配</b></div>
              <div class="f-count"><strong>3</strong><small>项</small></div>
              <p>存在可享受的税收优惠政策，建议尽快申报</p>
              ${icon("chevron", 16, 'class="f-chev"')}
            </button>
            <button class="find-card orange" data-route="risks">
              <div class="f-head"><span class="f-ico">${icon("alert", 19)}</span><b>税务风险提醒</b></div>
              <div class="f-count"><strong>2</strong><small>项</small></div>
              <p>发现潜在税务风险，建议重点关注</p>
              ${icon("chevron", 16, 'class="f-chev"')}
            </button>
          </div>
        </div>
        <div class="sheet-sec">
          <div class="sheet-sec-head"><h3>建议优先处理</h3><span class="sort-note">按影响程度排序 ${icon("sort", 13)}</span></div>
          <div class="prio-list">
            <div class="prio-item"><span class="p-no">1</span><div class="p-copy"><b>补齐研发项目材料归集</b><p>完善 3 笔研发费用归集资料，降低加计扣除风险</p></div>${icon("chevron", 18, 'class="p-chev"')}</div>
            <div class="prio-item"><span class="p-no">2</span><div class="p-copy"><b>检查进项发票合规性</b><p>存在 1 项进项发票需进一步核验</p></div>${icon("chevron", 18, 'class="p-chev"')}</div>
            <div class="prio-item"><span class="p-no ghost">3</span><div class="p-copy"><b>准备软件企业清单重新申报</b><p>整理自研产品与收入占比材料，在申报窗口期内提交</p></div>${icon("chevron", 18, 'class="p-chev"')}</div>
          </div>
        </div>
      </div>
      </div>
      <div class="sticky-cta report-cta"><button class="btn secondary" data-action="export-report">${icon("download", 17)} 导出 PDF 报告</button><button class="btn primary" data-action="ask-ai" data-context="整份税务体检报告">${icon("bot", 17)} 问 AI 解读</button></div>
    `, null, { className: "report-page-bg report-scroll" });
  }

  function oppCard(policy) {
    const fav = state.favorites.includes(policy.id);
    return `<article class="opp-card card">
      <div class="opp-card-head">
        <span class="opp-ico ${policy.matchClass}">${icon("gift", 22)}</span>
        <div class="opp-title"><h3>${policy.title}</h3></div>
        <span class="tag ${policy.matchClass}">${state.recalculated && policy.id === "software-list" ? "中匹配" : policy.match}</span>
      </div>
      <div class="opp-meta">${icon("report", 13)} ${policy.docNo} <span class="sep">|</span> 发布：${policy.pubDate}</div>
      <p class="opp-doctitle">${policy.docTitle}。</p>
      <div class="match-panel">
        <div class="match-panel-label">${icon("compass", 16)} 匹配结果</div>
        <div class="match-panel-rows">
          <div class="mp-row green"><div class="mp-body"><div class="mp-head">${icon("check", 13)} 已满足主要条件</div><p>${policy.satisfied.join("，")}。</p></div>${icon("chevron", 15, 'class="mp-chev"')}</div>
          ${policy.pending.length ? `<div class="mp-row orange"><div class="mp-body"><div class="mp-head">${icon("alert", 13)} 待确认条件</div><p>${state.recalculated && policy.id === "software-list" ? policy.pending.slice(1).join("，") + "。" : policy.pending.join("，") + "。"}</p></div>${icon("chevron", 15, 'class="mp-chev"')}</div>` : ""}
        </div>
      </div>
      <div class="opp-foot">
        <div class="opp-save ${policy.matchClass}"><small>预计可节税 ${icon("info", 12)}</small><strong>${policy.savingShort}</strong><span>基于历史数据估算，仅供参考</span></div>
        <button class="opp-fav ${fav ? "active" : ""}" data-action="toggle-favorite" data-id="${policy.id}" aria-label="收藏">${icon(fav ? "heartFill" : "heart", 18)}</button>
        <button class="btn primary opp-view" data-route="policy" data-id="${policy.id}">查看详情 ${icon("chevron", 15)}</button>
      </div>
    </article>`;
  }

  function opportunitiesPage() {
    const all = Object.values(policies);
    const list = all.filter((p) => state.resultFilter === "all" || (state.resultFilter === "high" ? p.match === "高匹配" : p.match === "待补信息"));
    const counts = { all: all.length, high: all.filter((p) => p.match === "高匹配").length, pending: all.filter((p) => p.match === "待补信息").length };
    return layout(`
      <section class="opp-hero">
        ${statusBar(true)}
        <div class="opp-hero-top">
          <button class="icon-btn light" data-action="back" aria-label="返回">${icon("back", 22)}</button>
          <div class="opp-head-copy"><h1>政策红利匹配</h1><p>为企业智能匹配可享受的税收优惠政策</p></div>
        </div>
        <div class="opp-3d">${taxDocSvg("op")}</div>
      </section>
      <div class="opp-sheet">
        <div class="filter-tabs">
          <button class="filter-tab ${state.resultFilter === "all" ? "active" : ""}" data-action="result-filter" data-value="all">全部 ${counts.all}</button>
          <button class="filter-tab ${state.resultFilter === "high" ? "active" : ""}" data-action="result-filter" data-value="high">高匹配 ${counts.high}</button>
          <button class="filter-tab ${state.resultFilter === "pending" ? "active" : ""}" data-action="result-filter" data-value="pending">待补充 ${counts.pending}</button>
        </div>
        <div class="opp-list">
          ${list.map((policy) => oppCard(policy)).join("")}
        </div>
        ${trustNote()}
      </div>
    `, null, { className: "opp-page-bg" });
  }

  function policyCard(policy, compact = false) {
    const favorite = state.favorites.includes(policy.id);
    return `<article class="policy-card card tap-card">
      <div class="policy-head">
        <span class="mini-icon" style="color:${policy.matchClass === "green" ? "var(--green)" : "var(--orange)"};background:${policy.matchClass === "green" ? "var(--green-soft)" : "var(--orange-soft)"}">${icon(policy.matchClass === "green" ? "gift" : "info", 22)}</span>
        <div class="copy"><h3>${policy.title}</h3><p>${policy.doc}</p></div><span class="tag ${policy.matchClass}">${state.recalculated && policy.id === "software-list" ? "中匹配" : policy.match}</span>
      </div>
      ${compact ? "" : `<div class="match-row"><div class="match-box ok"><b>${icon("check", 14)} 已满足</b><p>${policy.satisfied.slice(0,2).join("、")}</p></div><div class="match-box wait"><b>${icon("alert", 14)} 待确认</b><p>${state.recalculated && policy.id === "software-list" ? "已补 1 项，仍需收入占比确认" : policy.pending.slice(0,2).join("、")}</p></div></div>`}
      <div class="policy-foot"><div><small style="color:var(--muted)">测算可节税</small><div class="saving">${policy.saving}</div></div><div style="display:flex;gap:5px"><button class="icon-btn soft" data-action="toggle-favorite" data-id="${policy.id}" aria-label="${favorite ? "取消收藏" : "收藏"}">${icon(favorite ? "heartFill" : "heart", 19)}</button><button class="btn primary" style="min-height:40px;padding:9px 13px;font-size:11px" data-route="policy" data-id="${policy.id}">查看详情</button></div></div>
    </article>`;
  }

  function risksPage() {
    return layout(`
      ${statusBar()}
      ${pageHead("风险提醒", "区分规则提示与材料核验结果")}
      <section class="detail-hero">
        <span class="tag orange">综合风险：中</span>
        <h1>2 项提醒需要你关注</h1>
        <p>其中 1 项来自已上传演示材料的字段核验，1 项来自企业画像规则。</p>
      </section>
      <section class="section" style="margin-top:8px"><div class="stack">
        ${Object.values(risks).map((risk) => `<article class="risk-card card tap-card" data-route="risk" data-id="${risk.id}">
          <div class="risk-head"><span class="mini-icon" style="color:${risk.levelClass === "orange" ? "var(--orange)" : "var(--blue)"};background:${risk.levelClass === "orange" ? "var(--orange-soft)" : "var(--blue-soft)"}">${icon("alert", 22)}</span><div class="copy"><h3>${risk.title}</h3><p>${risk.sourceType}</p></div><span class="tag ${risk.levelClass}">${risk.level}</span></div>
          <div class="risk-matrix" style="margin-top:14px"><div class="risk-line"><span>为什么</span><b>${risk.reason}</b></div><div class="risk-line"><span>下一步</span><b>${risk.advice}</b></div></div>
          <div class="risk-foot"><span style="color:var(--muted);font-size:10px">点击查看证据与处理建议</span>${icon("chevron", 19)}</div>
        </article>`).join("")}
      </div></section>
      ${trustNote()}
    `, null, { className: "page-bg-blue" });
  }

  function policyDetailPage() {
    const policy = policies[routeParams.id] || policies["software-list"];
    const favorite = state.favorites.includes(policy.id);
    const recalced = state.recalculated && policy.id === "software-list";
    return layout(`
      <div class="detail-scroll-area">
      ${statusBar()}
      ${pageHead("政策详情", policy.valid, `<button class="icon-btn soft" data-action="toggle-favorite" data-id="${policy.id}" aria-label="收藏">${icon(favorite ? "heartFill" : "heart", 20)}</button>`)}
      <section class="detail-hero">
        <div class="tags"><span class="tag ${policy.matchClass}">${recalced ? "中匹配" : policy.match}</span>${policy.tags.map((tag) => `<span class="tag gray">${tag}</span>`).join("")}</div>
        <h1>${policy.title}</h1>
        <p>${policy.summary}</p>
      </section>
      <section class="detail-section card">
        <h2>${icon("gift", 19)} 对当前企业的价值</h2>
        <div class="estimate-card" style="margin:0"><small>初步测算可节税区间</small><strong>${policy.saving}</strong><span>为区间估算，最终以实际业务数据与申报口径为准</span></div>
      </section>
      <section class="detail-section card">
        <h2>${icon("check", 19)} 适用条件判断</h2>
        <div class="risk-matrix">
          ${policy.satisfied.map((item) => `<div class="risk-line"><span style="color:var(--green)">已满足</span><b>${item}</b></div>`).join("")}
          ${policy.pending.map((item, index) => `<div class="risk-line"><span style="color:var(--orange)">${recalced && index === 0 ? "已补充" : "待确认"}</span><b>${item}</b></div>`).join("")}
        </div>
        ${policy.pending.length ? `<button class="btn ${recalced ? "ghost" : "secondary"} block" style="margin-top:15px" data-action="recalculate" data-id="${policy.id}">${recalced ? `${icon("check", 17)} 已补充，匹配结果已更新` : `${icon("edit", 17)} 补充信息后重算`}</button>` : ""}
      </section>
      <section class="detail-section card">
        <h2>${icon("book", 19)} 政策依据</h2>
        <div class="source-box"><b>${policy.doc}</b><br />发布机关：${policy.source}<br />状态：${policy.valid}<br />本 Demo 引用为演示摘要，正式使用请核对官方原文和属地口径。</div>
        <button class="text-link" data-action="official-source" style="margin-top:8px">查看官方来源说明 ${icon("external", 14)}</button>
      </section>
      <section class="detail-section card"><h2>${icon("layers", 19)} 建议准备材料</h2><ul><li>企业所得税申报表及相关明细</li><li>企业画像中待确认字段的证明资料</li><li>与政策条件相关的业务台账和凭证</li></ul></section>
      ${trustNote()}
      </div>
      <div class="sticky-cta detail-cta"><button class="btn secondary" data-action="toggle-favorite" data-id="${policy.id}">${icon(favorite ? "heartFill" : "heart", 17)} ${favorite ? "已收藏" : "收藏"}</button><button class="btn primary" data-action="ask-ai" data-context="政策：${policy.title}">${icon("bot", 17)} 问 AI</button></div>
    `, null, { className: "page-bg-blue detail-scroll" });
  }

  function riskDetailPage() {
    const risk = risks[routeParams.id] || risks["rd-evidence"];
    return layout(`
      ${statusBar()}
      ${pageHead("风险详情", risk.sourceType)}
      <section class="detail-hero">
        <span class="tag ${risk.levelClass}">${risk.level}</span>
        <h1>${risk.title}</h1>
        <p>${risk.reason}</p>
      </section>
      <section class="detail-section card"><h2>${icon("layers", 19)} 判断说明</h2><div class="risk-matrix"><div class="risk-line"><span>风险来源</span><b>${risk.sourceType}</b></div><div class="risk-line"><span>产生原因</span><b>${risk.reason}</b></div><div class="risk-line"><span>可能影响</span><b>${risk.impact}</b></div><div class="risk-line"><span>建议措施</span><b>${risk.advice}</b></div></div></section>
      <section class="detail-section card"><h2>${icon("file", 19)} 发现的证据</h2><ul>${risk.evidence.map((item) => `<li>${item}</li>`).join("")}</ul><div class="subtle-note" style="margin-top:13px">${icon("info", 16)}<span>当前证据来自演示材料，不代表对真实申报数据的核验结果。</span></div></section>
      <section class="detail-section card"><h2>${icon("check", 19)} 处理清单</h2><ol><li>确认差异或缺口是否真实存在</li><li>补充合同、台账、凭证或口径说明</li><li>由财务负责人复核后留存处理记录</li></ol></section>
      ${trustNote()}
      <div class="sticky-cta"><button class="btn secondary" data-action="mark-handled">标记已处理</button><button class="btn primary" data-action="ask-ai" data-context="风险：${risk.title}">${icon("bot", 17)} 问 AI</button></div>
    `, null, { className: "page-bg-blue" });
  }

  function searchPage() {
    const query = state.searchQuery || "研发费用";
    return layout(`
      ${statusBar()}
      ${pageHead("政策与案例", "检索权威政策和实务参考")}
      <form class="search-page-box" id="search-page-form"><label class="search-box">${icon("search", 20)}<input id="search-page-input" value="${escapeHtml(query)}" aria-label="搜索" /><button class="search-go" type="submit">${icon("arrow", 19)}</button></label></form>
      <div class="filter-tabs"><button class="filter-tab ${state.searchTab === "policy" ? "active" : ""}" data-action="search-tab" data-value="policy">政策文件</button><button class="filter-tab ${state.searchTab === "case" ? "active" : ""}" data-action="search-tab" data-value="case">实务案例</button></div>
      <div class="result-count">找到与“${escapeHtml(query)}”相关的演示结果</div>
      <section class="section" style="margin-top:12px"><div class="stack">
        ${state.searchTab === "policy" ? Object.values(policies).map((policy) => `<article class="search-result card tap-card" data-route="policy" data-id="${policy.id}"><div class="result-head"><span class="mini-icon">${icon("report", 21)}</span><div class="copy"><h3>${policy.title}</h3><p>${policy.summary}</p></div>${icon("chevron", 18)}</div><div class="result-meta"><span>${policy.source}</span><span>${policy.valid.split(" · ")[0]}</span><span class="tag ${policy.matchClass}">${policy.match}</span></div></article>`).join("") : cases.map((item) => `<article class="search-result card tap-card" data-route="case" data-id="${item.id}"><div class="result-head"><span class="mini-icon" style="color:var(--green);background:var(--green-soft)">${icon("book", 21)}</span><div class="copy"><h3>${item.title}</h3><p>${item.summary}</p></div>${icon("chevron", 18)}</div><div class="tags" style="margin-top:12px">${item.tags.map((tag) => `<span class="tag gray">${tag}</span>`).join("")}</div></article>`).join("")}
      </div></section>
      ${trustNote()}
    `, "home", { className: "page-bg-blue" });
  }

  function casePage() {
    const item = cases.find((c) => c.id === routeParams.id) || cases[0];
    const related = item.related || {};
    const relatedPolicy = related.policyId ? policies[related.policyId] : null;
    return layout(`
      ${statusBar()}
      ${pageHead("案例参考", "公开案例摘编，仅作方法参考")}
      <section class="detail-hero"><div class="tags">${item.tags.map((tag) => `<span class="tag green">${tag}</span>`).join("")}</div><h1>${item.title}</h1><p>${item.source}</p></section>
      <section class="detail-section card"><h2>${icon("building", 19)} 主体背景</h2><p>${item.background}</p></section>
      <section class="detail-section card"><h2>${icon("alert", 19)} 风险问题</h2><ul>${item.problems.map((p) => `<li>${p}</li>`).join("")}</ul></section>
      <section class="detail-section card"><h2>${icon("check", 19)} 处理与结果</h2><ol>${item.handling.map((p) => `<li>${p}</li>`).join("")}</ol><div class="source-box" style="margin-top:14px"><b>案例结果</b><br />${item.result}</div></section>
      <section class="detail-section card"><h2>${icon("book", 19)} 关联政策</h2>
        ${relatedPolicy
          ? `<button class="result-card tap-card" style="width:100%;background:var(--surface-2)" data-route="policy" data-id="${relatedPolicy.id}"><span class="mini-icon">${icon("report", 21)}</span><span class="copy"><h3>${relatedPolicy.title}</h3><p>${related.note || "查看适用条件与政策依据"}</p></span>${icon("chevron", 18)}</button>`
          : `<div class="source-box"><b>${related.doc}</b></div>`}
      </section>
      ${trustNote()}
      <div class="sticky-cta"><button class="btn secondary" data-action="save-case">${icon("heart", 17)} 收藏案例</button><button class="btn primary" data-action="ask-ai" data-context="案例：${item.title}">${icon("bot", 17)} 问 AI</button></div>
    `, null, { className: "page-bg-blue" });
  }

  function aiPage() {
    const company = currentCompany();
    return layout(`
      <section class="ai-hero">
        ${statusBar(true)}
        <div class="home-top"><div><h1>AI 税务助手</h1><p>只聚焦税务及相关涉税问题</p></div><button class="icon-btn light" data-action="chat-history" aria-label="历史会话">${icon("history", 21)}</button></div>
        <div class="ai-context">${icon("layers", 17)}<span>${state.aiContext ? `已携带：${escapeHtml(state.aiContext)}` : `当前企业：${escapeHtml(company.name)}`}</span><button data-action="clear-context" style="color:#fff;background:none;font-size:10px">${state.aiContext ? "清除" : "切换"}</button></div>
      </section>
      <section class="chat-feed" id="chat-feed">
        ${state.chatMessages.map((message) => `<div class="message ${message.role}"><span class="avatar">${icon(message.role === "user" ? "user" : "bot", 18)}</span><div class="bubble">${message.html}</div></div>`).join("")}
        ${state.aiBusy ? `<div class="message"><span class="avatar">${icon("bot", 18)}</span><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>` : ""}
      </section>
      <div class="suggestions">
        ${["需要准备哪些材料？", "这项政策适用到什么时候？", "先处理哪个风险？"].map((text) => `<button class="suggestion" data-action="quick-question" data-value="${text}">${text}</button>`).join("")}
      </div>
      <form class="chat-compose" id="chat-form">
        <input type="file" id="file-input" class="sr-only" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" />
        <button type="button" class="icon-btn" data-action="choose-file" aria-label="添加文件">${icon("attach", 20)}</button>
        <input id="chat-input" autocomplete="off" aria-label="输入税务问题" placeholder="输入税务问题，或上传文件…" />
        <button class="icon-btn send" aria-label="发送" type="submit">${icon("send", 19)}</button>
      </form>
    `, "ai", { className: "ai-page" });
  }

  function profilePage() {
    return layout(`
      <section class="profile-full-hero">
        ${statusBar(true)}
        <div class="profile-full-top">
          <div style="flex:1"></div>
          <button class="icon-btn light profile-settings-btn" data-action="settings">${icon("settings", 21)}</button>
        </div>
        <div class="profile-full-illustration" aria-hidden="true">
          <svg viewBox="0 0 200 160">
            <defs>
              <linearGradient id="pfCard" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8f4ff"/><stop offset="1" stop-color="#b0d8ff"/></linearGradient>
              <linearGradient id="pfBar" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#4090ff"/><stop offset="1" stop-color="#80d0ff"/></linearGradient>
            </defs>
            <ellipse cx="110" cy="145" rx="70" ry="12" fill="rgba(60,140,255,.2)"/>
            <rect x="50" y="20" width="100" height="120" rx="12" fill="url(#pfCard)" transform="rotate(5 100 80)" opacity=".9"/>
            <circle cx="85" cy="55" r="14" fill="rgba(100,170,255,.3)"/>
            <path d="M85 48a7 7 0 0 1 7 7c0 4-3 7-7 7s-7-3-7-7a7 7 0 0 1 7-7zm0 16c-6 0-18 3-18 10v4h36v-4c0-7-12-10-18-10z" fill="rgba(100,170,255,.35)"/>
            <rect x="105" y="50" width="30" height="4" rx="2" fill="rgba(100,170,255,.3)"/>
            <rect x="105" y="60" width="22" height="4" rx="2" fill="rgba(100,170,255,.25)"/>
            <rect x="65" y="80" width="35" height="4" rx="2" fill="rgba(100,170,255,.2)"/>
            <rect x="65" y="90" width="28" height="4" rx="2" fill="rgba(100,170,255,.2)"/>
            <rect x="130" y="30" width="24" height="28" rx="6" fill="#0b66f2" opacity=".85"/>
            <text x="142" y="50" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">税</text>
            <rect x="45" y="105" width="12" height="25" rx="3" fill="url(#pfBar)" opacity=".7"/>
            <rect x="62" y="112" width="12" height="18" rx="3" fill="url(#pfBar)" opacity=".5"/>
            <rect x="155" y="95" width="30" height="22" rx="5" fill="rgba(100,200,255,.25)"/>
            <path d="M160 107h20M160 111h14" stroke="rgba(180,230,255,.5)" stroke-width="2" stroke-linecap="round"/>
            <rect x="160" y="120" width="25" height="18" rx="4" fill="rgba(80,200,160,.3)"/>
          </svg>
        </div>
        <div class="profile-full-person">
          ${state.auth.isLoggedIn ? `
          <span class="person-avatar">${icon("user", 28)}</span>
          <div class="profile-full-name">
            <h1>${escapeHtml(state.auth.name)}</h1>
            <p>已登录 · 演示账号</p>
          </div>
          ` : `
          <span class="person-avatar" style="border-color:transparent;color:#8f9bb3;background:#e8ecf2;box-shadow:none"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="10" r="5" fill="#8f9bb3"/><path d="M4 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#8f9bb3"/></svg></span>
          <button class="profile-auth-entry" data-route="auth" style="display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 20px;border:1px solid rgba(255,255,255,.28);border-radius:14px;color:#fff;background:rgba(255,255,255,.08);font-size:14px;font-weight:680">${icon("user", 17)} 登录 / 注册</button>
          `}
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><b>${state.companies.length}</b><span>管理企业</span></div>
          <div class="profile-stat"><b>3</b><span>历史报告</span></div>
          <div class="profile-stat"><b>${state.favorites.length}</b><span>我的收藏</span></div>
          <div class="profile-stat"><b>${state.files.length}</b><span>文件记录</span></div>
        </div>
      </section>
      <section class="profile-asset-list">
        <button class="asset-row card tap-card" data-route="companies"><span class="asset-icon asset-img"><img src="./profile-building.png" alt="" width="42" height="42"></span><span class="copy"><strong>企业管理</strong><span>创建、查看和切换多家企业档案</span></span>${icon("chevron", 19, 'class="chev"')}</button>
        <button class="asset-row card tap-card" data-route="histories"><span class="asset-icon asset-img"><img src="./profile-report.png" alt="" width="42" height="42"></span><span class="copy"><strong>历史体检报告</strong><span>查看不同时期节点的机会与风险变化</span></span>${icon("chevron", 19, 'class="chev"')}</button>
        <button class="asset-row card tap-card" data-route="favorites"><span class="asset-icon asset-img"><img src="./profile-star.png" alt="" width="42" height="42"></span><span class="copy"><strong>收藏内容</strong><span>已收藏 ${state.favorites.length} 项政策与案例</span></span>${icon("chevron", 19, 'class="chev"')}</button>
        <button class="asset-row card tap-card" data-route="chats"><span class="asset-icon asset-img"><img src="./profile-chat.png" alt="" width="42" height="42"></span><span class="copy"><strong>AI 历史会话</strong><span>继续此时与企业上下文的咨询</span></span>${icon("chevron", 19, 'class="chev"')}</button>
        <button class="asset-row card tap-card" data-route="files"><span class="asset-icon asset-img"><img src="./profile-folder.png" alt="" width="42" height="42"></span><span class="copy"><strong>文件记录</strong><span>管理历史上传资料与解析结果</span></span>${icon("chevron", 19, 'class="chev"')}</button>
        <button class="btn reset-demo-btn" data-action="reset-demo">${icon("layers", 18)} 重置 Demo 数据</button>
	        ${state.auth.isLoggedIn ? `<button class="profile-logout-btn" data-action="logout">${icon("back", 14)} 退出登录</button>` : ""}
      </section>
      <div class="trust-note">演示数据仅用于产品体验 · 结果为辅助决策建议，不替代专业税务意见</div>
    `, "profile");
  }

  function companiesPage() {
    return layout(`
      ${statusBar()}
      ${pageHead("企业管理", "一个账号可管理多家企业", `<button class="icon-btn soft" data-action="add-company" aria-label="新建企业">${icon("plus", 21)}</button>`)}
      <section class="section" style="margin-top:16px"><div class="stack">
        ${state.companies.map((company) => `<article class="company-card card">
          <div class="company-card-top"><span class="mini-icon">${icon("building", 23)}</span><div class="copy"><h3>${escapeHtml(company.name)}</h3><p>${escapeHtml(company.region)} · ${escapeHtml(company.taxpayer)}</p></div>${state.currentCompany === company.id ? '<span class="tag green">当前企业</span>' : ""}</div>
          <div class="company-card-actions"><button class="btn ghost" data-action="switch-company" data-id="${company.id}">${state.currentCompany === company.id ? "查看画像" : "切换为当前企业"}</button><button class="btn secondary" data-route="assessment-intro">${icon("scan", 15)} 发起体检</button></div>
        </article>`).join("")}
        <button class="method-card card tap-card" data-action="add-company"><span class="mini-icon">${icon("plus", 23)}</span><span style="flex:1"><h3>新建企业档案</h3><p>录入基础信息并开始首次画像</p></span>${icon("chevron", 19)}</button>
      </div></section>
      <section class="section"><div class="subtle-note">${icon("shield", 18)}<span>正式产品需按企业隔离文件、报告与会话，并补充成员授权和操作日志。</span></div></section>
    `, null, { className: "page-bg-blue" });
  }

  function historiesPage() {
    const reports = [
      { date: APP_DATE, opp: 3, risk: 2, score: "A-", current: true },
      { date: "2026.06.15", opp: 4, risk: 3, score: "B+" },
      { date: "2026.03.10", opp: 2, risk: 4, score: "B" }
    ];
    return layout(`
      ${statusBar()}
      ${pageHead("历史体检报告", currentCompany().name)}
      <section class="section" style="margin-top:16px"><div class="stack">
        ${reports.map((report) => `<article class="company-card card tap-card" data-route="report"><div class="history-preview-head"><div><h3>${report.date}</h3><span>${report.current ? "最新报告" : "历史时间快照"}</span></div><span class="tag ${report.current ? "green" : "gray"}">${report.score}</span></div><div class="metric-row"><div class="metric green"><b>${report.opp}</b><span>政策机会</span></div><div class="metric orange"><b>${report.risk}</b><span>风险提醒</span></div><div class="metric blue"><b>${report.score}</b><span>综合建议</span></div></div></article>`).join("")}
      </div></section>
      <section class="section"><button class="btn primary block" data-route="assessment-intro">${icon("refresh", 17)} 基于最新画像重新体检</button></section>
    `, null, { className: "page-bg-blue" });
  }

  function favoritesPage() {
    const saved = state.favorites.map((id) => policies[id]).filter(Boolean);
    return layout(`
      ${statusBar()}
      ${pageHead("收藏内容", "政策、案例与后续咨询统一沉淀")}
      ${saved.length ? `<section class="section" style="margin-top:16px"><div class="stack">${saved.map((policy) => policyCard(policy, true)).join("")}</div></section>` : `<div class="empty-state"><span class="mini-icon">${icon("heart", 25)}</span><h3>还没有收藏内容</h3><p>在政策详情中收藏，便于后续复核和继续问 AI。</p><button class="btn primary" style="margin-top:18px" data-route="search">去找政策</button></div>`}
    `, null, { className: "page-bg-blue" });
  }

  function chatsPage() {
    const sessions = [
      { title: "研发费用需要准备哪些材料？", context: "杭州星云智创科技有限公司", date: "今天 10:32" },
      { title: "小型微利企业人数如何计算？", context: "小型微利企业所得税优惠", date: "10 月 8 日" },
      { title: "解读增值税申报表异常", context: "增值税申报表_9月.pdf", date: "10 月 2 日" }
    ];
    return layout(`
      ${statusBar()}
      ${pageHead("AI 历史会话", "带着原上下文继续咨询")}
      <section class="section" style="margin-top:16px"><div class="stack">${sessions.map((session) => `<button class="asset-row card tap-card" data-action="resume-chat" data-context="${escapeHtml(session.context)}"><span class="asset-icon" style="background:none"><img src="./chat-history-icon.png" alt="" style="width:40px;height:40px;object-fit:contain"></span><span class="copy"><strong>${session.title}</strong><span>${session.context} · ${session.date}</span></span>${icon("chevron", 19)}</button>`).join("")}</div></section>
    `, null, { className: "page-bg-blue" });
  }

  function filesPage() {
    return layout(`
      ${statusBar()}
      ${pageHead("文件记录", "查看资料与对应 AI 解析任务", `<button class="icon-btn soft" data-action="files-upload">${icon("plus", 21)}</button>`)}
      <section class="section" style="margin-top:16px"><div class="stack">${state.files.map((file) => `<article class="asset-row card"><span class="asset-icon">${icon("file", 21)}</span><span class="copy"><strong>${escapeHtml(file.name)}</strong><span>${file.type} · ${file.date}</span><span style="color:var(--green);margin-top:5px">${file.status}</span></span><button class="icon-btn soft" data-action="file-result" data-file="${escapeHtml(file.name)}">${icon("chevron", 18)}</button></article>`).join("")}</div></section>
      <section class="section"><div class="subtle-note">${icon("info", 18)}<span>Demo 文件仅保留名称和模拟任务记录，不上传或存储真实内容。</span></div></section>
    `, null, { className: "page-bg-blue" });
  }

  function authPage() {
    const isLogin = state.authTab !== "register";
    return layout(`
      <section class="auth-page">
        <div class="auth-brand">
          <span class="auth-brand-mark">税</span>
          <h1>税策通</h1>
          <p>智能税务决策助手</p>
        </div>
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="auth-tab ${isLogin ? "active" : ""}" data-action="auth-tab" data-value="login">登录</button>
            <button class="auth-tab ${!isLogin ? "active" : ""}" data-action="auth-tab" data-value="register">注册</button>
          </div>
          <form class="auth-form" id="auth-form">
            <input class="auth-input" id="auth-phone" type="tel" maxlength="11" placeholder="请输入手机号" autocomplete="tel" />
            ${isLogin ? `
              <input class="auth-input" id="auth-password" type="password" placeholder="请输入密码" autocomplete="current-password" />
            ` : `
              <div class="sms-row">
                <input class="auth-input" id="auth-sms-code" type="text" maxlength="6" placeholder="验证码" autocomplete="off" />
                <button type="button" class="sms-btn ${state.smsCountdown > 0 ? "counting" : ""}" data-action="send-sms" ${state.smsCountdown > 0 ? "disabled" : ""}>${state.smsCountdown > 0 ? state.smsCountdown + "s 后重发" : "发送验证码"}</button>
              </div>
              <input class="auth-input" id="auth-password" type="password" placeholder="设置密码（6-16位）" autocomplete="new-password" />
            `}
            <button type="submit" class="auth-submit">${isLogin ? "登录" : "注册"}</button>
          </form>
          <p class="auth-footer">登录即表示同意《用户协议》和《隐私政策》<br />演示 Demo · 不收集真实信息</p>
        </div>
        <button class="auth-skip" data-action="auth-skip">跳过，先体验 Demo</button>
      </section>
    `, null, { noNav: true, className: "auth-page-wrap" });
  }

  function renderModal() {
    if (!modal) return "";
    if (modal.type === "company-switch") {
      return `<div class="overlay" data-action="close-modal"><section class="sheet" data-stop><div class="sheet-handle"></div><div class="sheet-head"><h2>切换当前企业</h2><button class="icon-btn soft" data-action="close-modal">${icon("close", 20)}</button></div><p>体检、AI 问答与历史数据都会基于当前企业展开。</p><div class="stack">${state.companies.map((company) => `<button class="company-card card tap-card" data-action="switch-company" data-id="${company.id}"><div class="company-card-top"><span class="mini-icon">${icon("building", 22)}</span><div class="copy"><h3>${escapeHtml(company.name)}</h3><p>${escapeHtml(company.status)}</p></div>${state.currentCompany === company.id ? '<span class="tag green">当前</span>' : icon("chevron", 18)}</div></button>`).join("")}</div><button class="btn secondary block" style="margin-top:12px" data-action="add-company">${icon("plus", 17)} 新建企业档案</button></section></div>`;
    }
    if (modal.type === "add-company") {
      return `<div class="overlay" data-action="close-modal"><form class="sheet" id="add-company-form" data-stop><div class="sheet-handle"></div><div class="sheet-head"><h2>新建企业档案</h2><button type="button" class="icon-btn soft" data-action="close-modal">${icon("close", 20)}</button></div><p>先创建最小档案，其他经营信息可以在体检中补充。</p><div class="form-group"><label for="company-name">企业名称</label><input id="company-name" name="companyName" placeholder="例如：杭州新悦科技有限公司" required /></div><div class="form-group"><label for="company-region">经营所在地</label><input id="company-region" name="companyRegion" value="浙江省杭州市" required /></div><button class="btn primary block" style="margin-top:20px" type="submit">创建并开始画像</button></form></div>`;
    }
    if (modal.type === "file-task") {
      return `<div class="overlay" data-action="close-modal"><section class="sheet" data-stop><div class="sheet-handle"></div><div class="sheet-head"><h2>选择分析目标</h2><button class="icon-btn soft" data-action="close-modal">${icon("close", 20)}</button></div><div class="subtle-note">${icon("file", 18)}<span>已识别为演示资料：<b>${escapeHtml(modal.fileName)}</b><br />请先选择你希望 AI 完成的任务。</span></div><div class="task-options">${[
        ["政策解释", "book", "识别政策条款与适用条件"],
        ["申报异常检查", "alert", "检查口径、勾稽与异常项"],
        ["税务通知解读", "message", "提炼要求、时限和动作"],
        ["财务情况分析", "report", "识别结构变化与涉税提示"]
      ].map(([name, ico, desc]) => `<button class="task-option" data-action="file-task" data-value="${name}" data-file="${escapeHtml(modal.fileName)}">${icon(ico, 22)}<strong>${name}</strong><span>${desc}</span></button>`).join("")}</div><p style="text-align:center">Demo 仅使用文件名生成模拟结果，不会读取或上传真实内容。</p></section></div>`;
    }
    if (modal.type === "notifications") {
      return `<div class="overlay" data-action="close-modal"><section class="sheet" data-stop><div class="sheet-handle"></div><div class="sheet-head"><h2>通知</h2><button class="icon-btn soft" data-action="close-modal">${icon("close", 20)}</button></div><div class="stack"><div class="asset-row card"><span class="asset-icon">${icon("bell", 21)}</span><span class="copy"><strong>研发费用政策依据已更新</strong><span>政策库已于 2026.10.10 完成来源复核</span></span></div><div class="asset-row card"><span class="asset-icon">${icon("alert", 21)}</span><span class="copy"><strong>建议补充 1 项企业画像</strong><span>补充软件产品收入占比可提高匹配准确度</span></span></div></div></section></div>`;
    }
    if (modal.type === "reset") {
      return `<div class="overlay"><section class="modal-alert" data-stop><span class="mini-icon" style="color:var(--red);background:var(--red-soft)">${icon("refresh", 25)}</span><h2>重置 Demo 数据？</h2><p>这会清空本地保存的问卷、收藏、企业切换与 AI 会话，恢复到首次打开状态。</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">取消</button><button class="btn primary" data-action="confirm-reset">确认重置</button></div></section></div>`;
    }
    if (modal.type === "info") {
      return `<div class="overlay" data-action="close-modal"><section class="modal-alert" data-stop><span class="mini-icon">${icon(modal.icon || "info", 25)}</span><h2>${escapeHtml(modal.title)}</h2><p>${escapeHtml(modal.text)}</p><button class="btn primary block" data-action="close-modal">知道了</button></section></div>`;
    }
    return "";
  }

  const pages = {
    home: homePage,
    checkup: checkupPage,
    "assessment-intro": assessmentIntroPage,
    "assessment-method": assessmentMethodPage,
    questionnaire: questionnairePage,
    "profile-confirm": profileConfirmPage,
    analyzing: analyzingPage,
    report: reportPage,
    opportunities: opportunitiesPage,
    risks: risksPage,
    policy: policyDetailPage,
    risk: riskDetailPage,
    search: searchPage,
    case: casePage,
    ai: aiPage,
    profile: profilePage,
    companies: companiesPage,
    histories: historiesPage,
    favorites: favoritesPage,
    chats: chatsPage,
    files: filesPage,
    auth: authPage
  };

  function render() {
    const page = pages[currentRoute] || homePage;
    root.innerHTML = page();
    if (currentRoute === "ai") {
      requestAnimationFrame(() => {
        const feed = document.getElementById("chat-feed");
        if (feed) feed.scrollTop = feed.scrollHeight;
        const pageEl = document.querySelector(".page");
        if (pageEl) pageEl.scrollTop = pageEl.scrollHeight;
      });
    }
  }

  function startQuestionnaire(useOcr = false) {
    state.questionIndex = 0;
    if (useOcr) {
      state.assessmentAnswers = {
        ...state.assessmentAnswers,
        industry: "软件和信息技术服务业",
        region: "浙江省杭州市",
        taxpayer: "一般纳税人"
      };
      saveState();
      showToast("已识别示例营业执照，3 项基础信息已预填", "success");
      setTimeout(() => go("questionnaire"), 380);
      return;
    }
    saveState();
    go("questionnaire");
  }

  function runAnalysis() {
    clearInterval(analysisTimer);
    state.analysisStep = 0;
    go("analyzing");
    analysisTimer = setInterval(() => {
      state.analysisStep += 1;
      if (state.analysisStep >= 4) {
        clearInterval(analysisTimer);
        state.assessmentCompleted = true;
        saveState();
        setTimeout(() => go("report"), 350);
      } else {
        render();
      }
    }, 650);
  }

  function sendChat(text) {
    const clean = String(text || "").trim();
    if (!clean || state.aiBusy) return;
    state.chatMessages.push({ role: "user", html: escapeHtml(clean) });
    state.aiBusy = true;
    saveState();
    render();
    setTimeout(() => {
      let response = `<strong>先给你一个可执行的结论：</strong><br />建议先核对当前企业画像和政策适用条件，再准备对应材料。`;
      if (clean.includes("材料")) {
        response = `<strong>建议按 3 组准备材料：</strong><ul><li>主体与申报资料：营业执照、企业所得税申报表</li><li>业务证明：研发项目立项、工时、领料与合同</li><li>归集底稿：辅助账、总账及差异说明</li></ul><div class="cite">依据：研发费用加计扣除相关政策口径 · 更新于 2026.10.10</div>`;
      } else if (clean.includes("风险") || clean.includes("先处理")) {
        response = `<strong>建议先处理“研发费用归集凭证不完整”。</strong><br />它直接影响可扣除金额，且现有演示材料已发现项目编号与工时记录缺口。开票与收入确认时间差可并行核对并保留跨期说明。<div class="cite">判断类型：材料样例核验 + 企业画像规则提示</div>`;
      } else if (clean.includes("什么时候") || clean.includes("有效")) {
        response = `<strong>页面显示的是当前演示政策库状态。</strong><br />正式使用时应以政策原文、最新公告及主管税务机关口径为准。我会同时提示发布日期、有效期和最近复核时间。`;
      }
      state.chatMessages.push({ role: "assistant", html: response });
      state.aiBusy = false;
      saveState();
      render();
    }, 720);
  }

  function handleAction(action, target) {
    switch (action) {
      case "back": {
        if (["home", "checkup", "ai", "profile"].includes(currentRoute)) { navStack.length = 0; go("home"); break; }
        if (currentRoute === "questionnaire" && state.questionIndex > 0) { state.questionIndex -= 1; render(); break; }
        const prev = navStack.pop();
        navigate(prev ? prev.route : "home", prev ? prev.params : {}, false);
        break;
      }
      case "company-switch":
        modal = { type: "company-switch" };
        render();
        break;
      case "switch-company":
        state.currentCompany = target.dataset.id;
        saveState();
        modal = null;
        render();
        showToast(`已切换至${currentCompany().short}`, "success");
        break;
      case "add-company":
        modal = { type: "add-company" };
        render();
        break;
      case "close-modal":
        modal = null;
        render();
        break;
      case "notifications":
        modal = { type: "notifications" };
        render();
        break;
      case "settings":
        modal = { type: "info", icon: "settings", title: "设置（演示）", text: "正式产品可在这里管理账号、隐私、企业成员权限与通知偏好。" };
        render();
        break;
      case "start-questionnaire":
        startQuestionnaire(false);
        break;
      case "license-demo":
        startQuestionnaire(true);
        break;
      case "select-answer": {
        const q = questions[state.questionIndex];
        state.assessmentAnswers[q.key] = target.dataset.value;
        saveState();
        render();
        break;
      }
      case "next-question": {
        const q = questions[state.questionIndex];
        if (!state.assessmentAnswers[q.key]) {
          showToast("请先选择一个选项");
          return;
        }
        if (state.questionIndex < questions.length - 1) {
          state.questionIndex += 1;
          saveState();
          render();
          const pageEl = document.querySelector(".page");
          if (pageEl) pageEl.scrollTop = 0;
        } else go("profile-confirm");
        break;
      }
      case "prev-question":
        if (state.questionIndex > 0) { state.questionIndex -= 1; render(); }
        break;
      case "edit-answers":
        state.questionIndex = Math.min(state.questionIndex, questions.length - 1);
        go("questionnaire");
        break;
      case "start-analysis":
        runAnalysis();
        break;
      case "result-filter":
        state.resultFilter = target.dataset.value;
        render();
        break;
      case "search-tab":
        state.searchTab = target.dataset.value;
        saveState();
        render();
        break;
      case "hot-search":
        state.searchQuery = target.dataset.value;
        state.searchTab = target.dataset.value.includes("风险") ? "case" : "policy";
        saveState();
        go("search", { returnTo: currentRoute });
        break;
      case "scan-search":
        modal = { type: "info", icon: "scan", title: "拍照识别（演示）", text: "正式版可拍摄政策文件、税务通知或二维码进行识别；当前 Demo 可从“文件解析”入口体验任务选择流程。" };
        render();
        break;
      case "toggle-favorite": {
        const id = target.dataset.id;
        state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
        saveState();
        render();
        showToast(state.favorites.includes(id) ? "已收藏，稍后可在“我的”查看" : "已取消收藏", "success");
        break;
      }
      case "recalculate":
        if (state.recalculated) return;
        state.recalculated = true;
        saveState();
        render();
        showToast("已补充清单申报材料，匹配度更新为“中匹配”", "success");
        break;
      case "official-source":
        modal = { type: "info", icon: "book", title: "官方来源说明", text: "正式版将跳转财政部、国家税务总局或属地税务机关原文，并保留文号、发布日期、有效期与抓取时间。当前 Demo 不访问外部网站。" };
        render();
        break;
      case "mark-handled":
        showToast("已加入处理记录（演示）", "success");
        break;
      case "save-case":
        showToast("案例已收藏（演示）", "success");
        break;
      case "ask-ai":
        state.aiContext = target.dataset.context || "当前页面";
        state.chatMessages.push({ role: "assistant", html: `已带入<strong>${escapeHtml(state.aiContext)}</strong>。你可以继续问适用条件、准备材料或下一步处理建议。` });
        saveState();
        go("ai");
        break;
      case "clear-context":
        if (state.aiContext) {
          state.aiContext = null;
          saveState();
          render();
          showToast("已清除单项上下文");
        } else {
          modal = { type: "company-switch" };
          render();
        }
        break;
      case "quick-question":
        sendChat(target.dataset.value);
        break;
      case "choose-file":
      case "files-upload": {
        if (currentRoute !== "ai") go("ai");
        setTimeout(() => document.getElementById("file-input")?.click(), 60);
        break;
      }
      case "file-task": {
        const task = target.dataset.value;
        const fileName = target.dataset.file;
        modal = null;
        state.files.unshift({ name: fileName, type: "本地演示文件", date: APP_DATE, status: `已完成${task}` });
        state.aiContext = `文件：${fileName}`;
        state.chatMessages.push({ role: "user", html: `请对 <strong>${escapeHtml(fileName)}</strong> 进行${task}。` });
        state.chatMessages.push({ role: "assistant", html: `<strong>${task}演示结果：</strong><ul><li>已识别 2 项需要复核的信息</li><li>建议先确认数据口径与证明材料</li><li>未发现需要立即中止申报的高风险项</li></ul><div class="cite">Demo 仅根据文件名生成模拟结果，未读取真实文件内容</div>` });
        saveState();
        go("ai");
        break;
      }
      case "chat-history":
        go("chats", { returnTo: "ai" });
        break;
      case "resume-chat":
        state.aiContext = target.dataset.context;
        saveState();
        go("ai");
        break;
      case "file-result":
        state.aiContext = `文件：${target.dataset.file}`;
        saveState();
        go("ai");
        break;
      case "export-report":
        showToast("即将打开打印，可选择“存储为 PDF”", "success");
        setTimeout(() => window.print(), 420);
        break;
      case "reset-demo":
        modal = { type: "reset" };
        render();
        break;
      case "confirm-reset":
        localStorage.removeItem(STORAGE_KEY);
        state = freshState();
        modal = null;
        currentRoute = "auth";
        navStack.length = 0;
        render();
        showToast("Demo 数据已重置", "success");
        break;
      case "auth-tab":
        state.authTab = target.dataset.value;
        state.smsCountdown = 0;
        clearInterval(smsTimer);
        render();
        break;
      case "auth-skip":
        state.authSkipped = true;
        saveState();
        go("home");
        break;
      case "send-sms": {
        const phoneEl = document.getElementById("auth-phone");
        const phone = (phoneEl?.value || "").trim();
        if (!/^1\d{10}$/.test(phone)) { showToast("请输入正确的手机号"); break; }
        state.smsCountdown = 60;
        render();
        showToast("验证码已发送（演示模式）", "success");
        clearInterval(smsTimer);
        smsTimer = setInterval(() => {
          state.smsCountdown -= 1;
          if (state.smsCountdown <= 0) { clearInterval(smsTimer); state.smsCountdown = 0; }
          render();
        }, 1000);
        break;
      }
      case "logout":
        state.auth = { isLoggedIn: false, phone: "", name: "" };
        state.authTab = "login";
        saveState();
        go("auth");
        showToast("已退出登录");
        break;
      /* eslint-disable-next-line no-fallthrough */
      default:
        break;
    }
  }

  root.addEventListener("click", (event) => {
    const stop = event.target.closest("[data-stop]");
    if (stop) event.stopPropagation();

    const nav = event.target.closest("[data-nav]");
    if (nav) {
      go(nav.dataset.nav);
      return;
    }

    const routeEl = event.target.closest("[data-route]");
    if (routeEl) {
      go(routeEl.dataset.route, { id: routeEl.dataset.id, returnTo: currentRoute });
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    if (actionEl) handleAction(actionEl.dataset.action, actionEl);
  });

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "home-search-form" || form.id === "search-page-form") {
      const input = form.querySelector("input");
      state.searchQuery = input.value.trim() || "研发费用";
      saveState();
      go("search", { returnTo: currentRoute });
    } else if (form.id === "chat-form") {
      const input = form.querySelector("#chat-input");
      const value = input.value;
      input.value = "";
      sendChat(value);
    } else if (form.id === "auth-form") {
      const phone = (form.querySelector("#auth-phone")?.value || "").trim();
      const password = (form.querySelector("#auth-password")?.value || "").trim();
      if (state.authTab === "register") {
        const smsCode = (form.querySelector("#auth-sms-code")?.value || "").trim();
        if (!phone || !smsCode || !password) { showToast("请填写完整信息"); return; }
        if (!/^1\d{10}$/.test(phone)) { showToast("请输入正确的手机号"); return; }
        if (smsCode.length < 4) { showToast("请输入正确的验证码"); return; }
        if (password.length < 6) { showToast("密码至少 6 位"); return; }
        clearInterval(smsTimer);
        state.smsCountdown = 0;
        state.auth = { isLoggedIn: true, phone, name: phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") };
        state.authTab = "login";
        saveState();
        showToast("注册成功", "success");
        go("home");
      } else {
        if (!phone || !password) { showToast("请填写手机号和密码"); return; }
        if (!/^1\d{10}$/.test(phone)) { showToast("请输入正确的手机号"); return; }
        state.auth = { isLoggedIn: true, phone, name: phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") };
        saveState();
        showToast("登录成功", "success");
        go("home");
      }
    } else if (form.id === "add-company-form") {
      const data = new FormData(form);
      const name = String(data.get("companyName") || "").trim();
      const region = String(data.get("companyRegion") || "").trim();
      if (!name) return;
      const id = `company-${Date.now()}`;
      state.companies.push({ id, name, short: name.replace(/有限公司$/, ""), region, industry: "待补充", taxpayer: "待补充", status: "待完成首次体检" });
      state.currentCompany = id;
      state.assessmentCompleted = false;
      state.assessmentAnswers = {};
      saveState();
      modal = null;
      go("assessment-intro");
      showToast("企业档案已创建", "success");
    }
  });

  root.addEventListener("change", (event) => {
    if (event.target.id === "file-input") {
      const file = event.target.files?.[0];
      if (!file) return;
      modal = { type: "file-task", fileName: file.name };
      render();
    }
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest('[data-route][tabindex="0"]');
    if (!target) return;
    event.preventDefault();
    go(target.dataset.route, { id: target.dataset.id, returnTo: currentRoute });
  });

  render();
})();
