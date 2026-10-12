# 税策通 Demo 优化进度

> 项目路径：`/Users/jyokann/Documents/ChatGPT/新悦杯/dist/`（index.html / styles.css / app.js + PNG 素材）
> 最后更新：2026-10-12（问卷 10 题、首次体检页 & AI 报告页 1:1 重做、节税区间图 SVG 化）

## 当前架构
- 纯 vanilla JS SPA，IIFE + 事件委托，无框架
- 桌面端显示 iPhone 外壳：`.phone-frame`（450x960，钛金渐变，Dynamic Island）> `.phone-screen`（45px 圆角，overflow hidden）> `.app-shell`（flex column，overflow hidden）
- `.page`：flex:1 + min-height:0 + overflow-y:auto（内部滚动，隐藏滚动条）
- `.bottom-nav`：flex 子项 flex-shrink:0（非 fixed/sticky）
- 弹窗/Toast：position:absolute（相对 phone-screen）
- AI 问答页：`.ai-page` flex column → hero(固定) + `.chat-feed`(flex:1, min-height:0, 唯一滚动区) + suggestions + compose(均 flex-shrink:0)
- 路由返回：`go()` 支持 `returnTo` 参数记录来源页（data-route 点击自动带 `returnTo: currentRoute`）；profile-confirm 返回：来源 report → report，否则 → questionnaire
- 滚动统一用 `.page` scrollTop，无 window.scrollTo
- 全局 `svg { display: block }`，无 `margin: auto`（会破坏 flex 按钮居中）

## 已完成
1. 首页：去通知/扫码按钮；热门搜索横滑（min-width:0）；「更多服务」无跳转；「AI税务体检」入口 → `checkup` 路由
2. 体检页：按意向图 1:1 复刻，KV 用 `checkup-kv.png` + `::before` 黑色蒙版，结果卡片 margin-top:-18px 圆角衔接
3. 体检介绍页：3 个 3D 风格 PNG icon（intro-clock / intro-shield / intro-doc）
4. AI 问答页：底部导航正常显示；输入框贴近导航栏；聊天消息间距修复（grid→flex）
5. 历史问答：统一用 `chat-history-icon.png`（CSS 加 `background:none`，注意 `.asset-icon` nth-child 底色规则的坑）；返回正确回 AI 页（returnTo）
6. 个人主页：1:1 复刻意向图，深蓝渐变 hero + SVG 插画；5 个 3D icon（profile-building/report/star/chat/folder），52px + border-radius:14px；去 logo；历史体检报告返回逻辑修复
7. 开始体检按钮文案居中
8. 打印媒体查询：隐藏手机外壳
9. 体检介绍页「开始体检」按钮：去白色底纹+按钮投影（新增 `.sticky-cta.cta-flush` 变体：透明底、无 border、无 blur）
10. 问卷页：进度条区 `.progress-wrap` 去白底改透明；`.page` 加 `page-flex`（仅此页 flex column + `.question-wrap` flex:1）让「上一步/下一步」贴手机底部无缝隙；question-wrap 底部留白 130px→24px；该 CTA 栏也改 cta-flush 透明底；「上一步」ghost 按钮在 cta-flush 下改白底+浅阴影（原 ghost 底色 #f5f8fd 与页面同色不可见）
11. 问卷题改为 Word《问卷.docx》的 10 道风险题（keys: penalty/invoice-match/cross-region/red-flush/customer-risk/scale-match/sensitive-invoice/mutual-invoice/risk-notice/tax-mgmt），answerLabels 同步；文案里"8"改"10"；删除「不清楚，先跳过」按钮（unknown-btn/unknown-answer 逻辑+CSS）；未选选项点下一步只弹 Toast（红框抖动方案已删，用户不要）
12. 首次体检页（未完成态）按意向图 1:1 重做：深蓝 hero（状态栏+顶栏 返回/标题/切换企业、pill 单行、大标题、SVG 3D 插画[cfDocG/cfPodG 渐变]、三栏 zap/scan/shield）+ 白色 `checkup-sheet` 圆角上叠（你将获得 3 彩色 tile、示例报告预览 CSS 文档卡+指标+清单、底部蓝条说明）；hero 顶栏 padding 4px 20px 12px 防贴边
13. AI体检报告页按意向图 1:1 重做：蓝色 hero（返回/大标题+生成日期/切换企业 icon、company-report 玻璃卡 + 右侧小 SVG 税单+盾牌徽章）+ 白色 `report-sheet` 圆角上叠（health-card：86% SVG 圆环[stroke-dashoffset=45.7] + 3 行 hrow[政策机会→opportunities / 风险提醒→risks / 待优化→profile-confirm] + save-band 预计可节税区间[coins icon、柱状图、最高可节税气泡]；重点发现 find-grid 2 卡；建议优先处理 prio-list 3 条编号项）；底部 sticky-cta「导出 PDF 报告」+「问 AI 解读」；新增 icons: zap/coins/sort；删除旧 report-summary/summary-tile/action-list CSS
14. 报告页"待优化"→ profile-confirm 后返回应回报告页（back 判断 `routeParams.returnTo === "report"`）
15. 报告页底部 CTA 固定：`.page.report-scroll` flex column + `.report-scroll-area`（flex:1 唯一滚动区）包裹 hero+sheet；`.report-cta` 改 position:static 纯白底+顶部分隔线贴手机底（原 sticky 有缝隙；同时清掉该页 `.no-nav` 的 20px 底部 padding）
16. 节税区间图改单张 SVG（`.save-chart`）：5 柱渐深 + 折线圆点 + 末位空心点 + 带尖尾白色气泡「最高可节税 14.2 万元」1:1 复刻示意图（旧 .s-chart/.s-bubble CSS 已删）；SVG 抽成 `saveChartSvg(shadowId)` 共享函数
17. 问卷页进度条下方加紧凑版「预计可节税区间」白条（`.save-band.compact`：隐藏说明行、缩小 icon/字号；图表 104px——74px 时气泡文字太小被用户打回），与报告页同款

## 待办 / 未完成
（暂无；报告页已完成，见第 13 条）

## 踩坑记录
- flex 子项要滚动需 `min-height: 0`（纵向）/ `min-width: 0`（横向）
- 全局 `svg { margin: auto }` 会把 flex 按钮里的 SVG 挤到右边 → 已移除，靠容器 place-items:center
- `.chat-feed` 用 grid 会把行撑高 → 改 flex column
- PNG icon 底色：注意 `.asset-icon` 的 nth-child 背景规则，需 `style="background:none"`
- 「开始体检」按钮下白条：去掉 `.page` padding-bottom 解决
- 回退过的方案：`.page` 改 flex column（导致多页面 bug，勿再启用）
