import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import type { FileUploadSelection } from "../../domain/file-analysis";
import { validateFileMetadata } from "../../../supabase/functions/enterprise-file-upload/file-policy";

export function FileSelectPage() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<FileUploadSelection | null>(null);
  const [error, setError] = useState("");
  return <div className="page-stack file-page"><PageHeader title="文件分析" /><section className="file-notice"><b>隐私与能力说明</b><p>文件只归属于当前企业。生产模式通过短期签名链接上传至私有空间；在正文尚未被处理时，系统会明确标注“未读取”，不会生成内容结论。</p></section><label className="file-drop"><input aria-label="选择企业文件" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; if (!file) { setSelection(null); return; } try { const metadata = validateFileMetadata(file.name, file.type, file.size); setSelection({ displayName: metadata.originalName, mediaType: metadata.detectedMime, byteSize: metadata.byteSize, sourceFile: file }); setError(""); } catch { setSelection(null); setError("请选择 20MB 以内的 PDF、Word、Excel、CSV、文本、JSON 或图片文件。"); } }} /><span>＋</span><b>{selection ? selection.displayName : "选择一个文件"}</b><p>{selection ? `${selection.mediaType} · ${(selection.byteSize / 1024).toFixed(1)} KB` : "支持 PDF、Word、Excel、CSV、文本、JSON 与图片，最大 20MB"}</p></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<Button disabled={!selection} onClick={() => selection && navigate("/files/task", { state: { selection } })}>下一步：选择任务</Button><Link className="text-link file-history-link" to="/files/history">查看文件记录</Link></div>;
}
