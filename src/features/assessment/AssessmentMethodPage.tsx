import { Link } from "react-router-dom";

import { AppIcon } from "../../components/icons/AppIcon";
import { PageHeader } from "../../components/layout/PageHeader";
import { getDataBackend } from "../../services/supabase/config";

const asset = (name: string) => `/prototype-assets/${name}`;

export function AssessmentMethodPage() {
  const isMock = getDataBackend() === "mock";
  return <div className="page-stack legacy-assessment-method"><PageHeader title="AI 税务体检" backTo="/assessment"/><div className="intro-visual"><div className="doc"><i/><i/><i style={{ width: "65%" }}/></div><div className="lens"/></div><div className="center-copy"><h1>先了解企业，再精准判断</h1><p>先确认企业资料，再完成 10 道风险题。企业资料用于政策匹配与节税估算，风险等级只由 10 道题决定。</p></div><div className="feature-points"><div className="feature-point"><span className="mini-icon intro-img"><img src={asset("intro-clock.png")} alt="" width="42" height="42"/></span><div><strong>渐进式采集</strong><span>不清楚的信息可以跳过，不会阻断体检</span></div></div><div className="feature-point"><span className="mini-icon intro-img"><img src={asset("intro-shield.png")} alt="" width="42" height="42"/></span><div><strong>隐私边界清晰</strong><span>{isMock ? "当前为本地 Demo，不会上传你的真实文件" : "文件私有加密存储，仅用于你的体检分析"}</span></div></div><div className="feature-point"><span className="mini-icon intro-img"><img src={asset("intro-doc.png")} alt="" width="42" height="42"/></span><div><strong>结论可解释</strong><span>每条结果提供政策依据、条件和更新时间</span></div></div></div><div className="method-list"><Link className="method-card card tap-card" to="/assessment/profile"><span className="mini-icon"><AppIcon name="building" size={25}/></span><span><h3>手工填写企业资料</h3><p>逐项填写或标记“不清楚”，系统会自动保存</p></span><AppIcon className="chev" name="chevron" size={20}/></Link><Link className="method-card card tap-card" to="/files"><span className="mini-icon method-file-icon"><AppIcon name="file" size={25}/></span><span><h3>{isMock ? "文件导入演示" : "导入文件"}</h3><p>{isMock ? "只演示元数据与任务状态，不读取真实文件" : "上传与企业相关的材料，用于体检参考"}</p></span><AppIcon className="chev" name="chevron" size={20}/></Link></div></div>;
}
