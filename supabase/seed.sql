-- Deterministic development releases. Demo policy rules remain pending and are
-- deliberately excluded from the active catalog until real sources are imported
-- and verified.

with payload as (
  select '{"package":"@shuicetong/assessment-engine","version":"0.1.0","riskScoring":"equal-weight-10"}'::jsonb manifest
)
insert into public.assessment_engine_releases (id, version, content_hash, manifest, status, activated_at)
select
  'a0000000-0000-0000-0000-000000000001',
  'assessment-engine-0.1.0',
  encode(extensions.digest(convert_to(manifest::text, 'UTF8'), 'sha256'), 'hex'),
  manifest,
  'active',
  timezone('utc', now())
from payload
on conflict (id) do nothing;

with payload as (
  select $$[
    {"id":"penalty","order":1,"title":"近 3 年，贵公司是否有过税务处罚或纳税信用等级变更？","help":"税务处罚记录、纳税信用等级变动","options":[{"id":"penalty-1","label":"没有，信用等级一直稳定","effect":"safe","riskPoints":0},{"id":"penalty-2","label":"有过税务行政处罚（罚款/警告）","effect":"risk","riskPoints":1},{"id":"penalty-3","label":"纳税信用等级发生过降级","effect":"risk","riskPoints":1},{"id":"penalty-4","label":"不清楚/未查询过","effect":"unknown","riskPoints":0}]},
    {"id":"invoice-match","order":2,"title":"近 3 年，贵公司进项发票中，是否存在“税号或企业名称”与供应商实际信息不一致的情况？","help":"发票税号名称不匹配风险","options":[{"id":"invoice-match-1","label":"从未出现，全部一致","effect":"safe","riskPoints":0},{"id":"invoice-match-2","label":"偶尔有，已要求对方重开","effect":"risk","riskPoints":1},{"id":"invoice-match-3","label":"经常出现，需要频繁手工调整","effect":"risk","riskPoints":1},{"id":"invoice-match-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"cross-region","order":3,"title":"近 3 年，贵公司的采购和销售业务，是否主要集中在注册地以外的地区？","help":"购销两头在外风险","options":[{"id":"cross-region-1","label":"不存在，业务主要在本地","effect":"safe","riskPoints":0},{"id":"cross-region-2","label":"部分业务在外地，但正常经营","effect":"risk","riskPoints":1},{"id":"cross-region-3","label":"大部分购销都在外地，本地无实际经营场所","effect":"risk","riskPoints":1},{"id":"cross-region-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"red-flush","order":4,"title":"近 3 年，贵公司发票的“红冲”和“作废”情况如何？","help":"红冲作废分析","options":[{"id":"red-flush-1","label":"非常少，属于正常范围","effect":"safe","riskPoints":0},{"id":"red-flush-2","label":"偶尔有，都能合理解释","effect":"risk","riskPoints":1},{"id":"red-flush-3","label":"频繁红冲/作废，占比明显偏高","effect":"risk","riskPoints":1},{"id":"red-flush-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"customer-risk","order":5,"title":"近 3 年，贵公司前十大客户中，是否有被行政处罚的记录？","help":"前十大客户行政处罚信息","options":[{"id":"customer-risk-1","label":"没有，客户均为正常经营企业","effect":"safe","riskPoints":0},{"id":"customer-risk-2","label":"有一两个客户有过处罚记录","effect":"risk","riskPoints":1},{"id":"customer-risk-3","label":"有多个客户存在处罚记录","effect":"risk","riskPoints":1},{"id":"customer-risk-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"scale-match","order":6,"title":"近 3 年，贵公司开票规模与公司实际经营规模（员工人数、办公场地、营业收入）是否匹配？","help":"公司规模与开票额匹配分析","options":[{"id":"scale-match-1","label":"完全匹配，开票额与经营规模一致","effect":"safe","riskPoints":0},{"id":"scale-match-2","label":"部分月份开票额偏高，但能合理解释","effect":"risk","riskPoints":1},{"id":"scale-match-3","label":"开票额远高于实际规模","effect":"risk","riskPoints":1},{"id":"scale-match-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"sensitive-invoice","order":7,"title":"近 3 年，贵公司进项发票中，咨询费、服务费、会议费等“敏感业务”发票占比是否偏高？","help":"敏感进项发票分析","options":[{"id":"sensitive-invoice-1","label":"没有，进项结构正常","effect":"safe","riskPoints":0},{"id":"sensitive-invoice-2","label":"有一些，但比例正常","effect":"risk","riskPoints":1},{"id":"sensitive-invoice-3","label":"敏感业务发票占比明显过高","effect":"risk","riskPoints":1},{"id":"sensitive-invoice-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"mutual-invoice","order":8,"title":"近 3 年，贵公司是否与同一企业存在频繁的互开发票（对开/环开）情况？","help":"互开发票风险","options":[{"id":"mutual-invoice-1","label":"没有，上下游清晰","effect":"safe","riskPoints":0},{"id":"mutual-invoice-2","label":"有少量，属于正常业务往来","effect":"risk","riskPoints":1},{"id":"mutual-invoice-3","label":"存在明显的互开发票现象","effect":"risk","riskPoints":1},{"id":"mutual-invoice-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"risk-notice","order":9,"title":"近 3 年，贵公司是否收到过税务机关的“风险提示”或“自查通知”？","help":"税务风险提示/自查通知记录","options":[{"id":"risk-notice-1","label":"从未收到过","effect":"safe","riskPoints":0},{"id":"risk-notice-2","label":"收到过，已按要求自查并整改","effect":"risk","riskPoints":1},{"id":"risk-notice-3","label":"收到过，但尚未处理完毕","effect":"risk","riskPoints":1},{"id":"risk-notice-4","label":"不清楚","effect":"unknown","riskPoints":0}]},
    {"id":"tax-mgmt","order":10,"title":"贵公司目前的税务管理方式是？","help":"税务管理能力评估","options":[{"id":"tax-mgmt-1","label":"有专职财务/税务人员，且定期参加税务培训","effect":"safe","riskPoints":0},{"id":"tax-mgmt-2","label":"有专职财务，但税务知识更新不及时","effect":"risk","riskPoints":1},{"id":"tax-mgmt-3","label":"委托代账公司处理，自己不审核","effect":"risk","riskPoints":1},{"id":"tax-mgmt-4","label":"老板自己处理，没有专业财务","effect":"risk","riskPoints":1}]}
  ]$$::jsonb questions
)
insert into public.question_set_releases (id, version, content_hash, questions, status, activated_at)
select
  'a0000000-0000-0000-0000-000000000002',
  'risk-questions-2026.1',
  encode(extensions.digest(convert_to(questions::text, 'UTF8'), 'sha256'), 'hex'),
  questions,
  'active',
  timezone('utc', now())
from payload
on conflict (id) do nothing;

with pending_rules(id, policy_version_key, title, eligibility, formula, required_fields, exclusion_group, priority, citation) as (
  values
    (
      'a0000000-0000-0000-0000-000000000011'::uuid,
      'demo-rd-deduction',
      '研发费用加计扣除（待真实资料核验）',
      '[{"id":"rd-known","fieldPath":"researchInvestment","operator":"isKnown","expected":true,"basisRefs":["pending-source"],"required":true}]'::jsonb,
      '{"id":"rd-saving-demo","version":"1","inputPaths":["researchInvestment.amountYuan"]}'::jsonb,
      array['researchInvestment.amountYuan'],
      null::text,
      10,
      '{"documentId":"pending","sourceId":"pending","title":"待真实资料核验","docNo":null,"locator":"待导入","excerpt":null}'::jsonb
    ),
    (
      'a0000000-0000-0000-0000-000000000012'::uuid,
      'demo-small-profit',
      '小型微利企业所得税优惠（待真实资料核验）',
      '[{"id":"income-limit","fieldPath":"taxableIncome.amountYuan","operator":"lte","expected":3000000,"basisRefs":["pending-source"],"required":true}]'::jsonb,
      '{"id":"small-profit-saving-demo","version":"1","inputPaths":["taxableIncome.amountYuan"]}'::jsonb,
      array['taxableIncome.amountYuan'],
      'enterprise-income-tax',
      20,
      '{"documentId":"pending","sourceId":"pending","title":"待真实资料核验","docNo":null,"locator":"待导入","excerpt":null}'::jsonb
    )
)
insert into public.policy_rule_releases (
  id, version, policy_version_key, title, content_hash, eligibility, formula,
  required_fields, exclusion_group, overlap_priority, citation, review_status, status
)
select
  id,
  'development-pending-1',
  policy_version_key,
  title,
  encode(extensions.digest(convert_to(jsonb_build_object('eligibility', eligibility, 'formula', formula)::text, 'UTF8'), 'sha256'), 'hex'),
  eligibility,
  formula,
  required_fields,
  exclusion_group,
  priority,
  citation,
  'pending',
  'draft'
from pending_rules
on conflict (id) do nothing;

with manifest as (
  select jsonb_build_object(
    'engineReleaseId', 'a0000000-0000-0000-0000-000000000001',
    'questionSetReleaseId', 'a0000000-0000-0000-0000-000000000002',
    'policyRuleIds', jsonb_build_array(),
    'reason', 'No policy participates until a real source is imported and verified.'
  ) value
)
insert into public.catalog_releases (
  id, version, content_hash, engine_release_id, question_set_release_id,
  policy_rule_ids, status, activated_at
)
select
  'a0000000-0000-0000-0000-000000000003',
  'catalog-development-2026.1',
  encode(extensions.digest(convert_to(value::text, 'UTF8'), 'sha256'), 'hex'),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  '{}'::uuid[],
  'active',
  timezone('utc', now())
from manifest
on conflict (id) do nothing;
