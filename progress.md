# 税策通 Demo 优化进度

> 项目路径：`/Users/jyokann/Documents/ChatGPT/新悦杯/dist/`（index.html / styles.css / app.js + PNG 素材）
> 最后更新：2026-10-12

## 当前架构
- 纯 vanilla JS SPA，IIFE + 事件委托，无框架
- 桌面端显示 iPhone 外壳：`.phone-frame`（450x960，钛金渐变，Dynamic Island）> `.phone-screen`（45px 圆角，overflow hidden）> `.app-shell`（flex column，overflow hidden）
- `.page`：flex:1 + min-height:0 + overflow-y:auto（内部滚动，隐藏滚动条）
- `.bottom-nav`：flex 子项 flex-shrink:0（非 fixed/sticky）
- 弹窗/Toast：position:absolute（相对 phone-screen）
- AI 问答页：`.ai-page` flex column → hero(固定) + `.chat-feed`(flex:1, min-height:0, 唯一滚动区) + suggestions + compose(均 flex-shrink:0)
- 路由返回：`go()` 支持 `returnTo` 参数记录来源页
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

## 待办 / 未完成
1. **【进行中·被打断】AI体检报告页 1:1 复刻意向图**（用户最后一条指令）
   意向图结构：
   - 顶栏：返回 + "报告" + 日期 2026.10.11
   - 标题：企业税务体检报告 + 公司名「杭州星云智创科技有限公司」
   - 综合健康度：A- 评分 + 说明
   - 三个统计块：3 政策机会 | 2 风险提醒 | 86% 画像完整度
   - 本次核心发现：2 条（礼物 icon + 警示 icon）
   - 预计可优化税负：8.6–14.2 万元/年
   - 建议优先处理：3 条编号行动项
   - 风险与机会总览：2 张卡片（风险 + 机会）
   - 报告说明：文字段落
   - 底部 CTA：「导出 PDF」+「问 AI」，需始终贴手机底部
   - 底部导航：首页 | 体检 | 问答 | 我的
   实现方式：重写 app.js 的 `reportPage()` + 新增对应 CSS；底部 CTA 用 `position: sticky; bottom: 0`（注意：之前用 flex column 方案搞坏了多处页面被用户要求回退，本次不要动 `.page` 的 display）
2. 报告页底部 CTA 常驻手机底部（与上条一起做）

## 踩坑记录
- flex 子项要滚动需 `min-height: 0`（纵向）/ `min-width: 0`（横向）
- 全局 `svg { margin: auto }` 会把 flex 按钮里的 SVG 挤到右边 → 已移除，靠容器 place-items:center
- `.chat-feed` 用 grid 会把行撑高 → 改 flex column
- PNG icon 底色：注意 `.asset-icon` 的 nth-child 背景规则，需 `style="background:none"`
- 「开始体检」按钮下白条：去掉 `.page` padding-bottom 解决
- 回退过的方案：`.page` 改 flex column（导致多页面 bug，勿再启用）
