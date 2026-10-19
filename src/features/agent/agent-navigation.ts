export function createAgentHref(context: { reportId?: string; documentId?: string; conversationId?: string }) {
  const search = new URLSearchParams();
  if (context.reportId) search.set("reportId", context.reportId);
  if (context.documentId) search.set("documentId", context.documentId);
  if (context.conversationId) search.set("conversationId", context.conversationId);
  return `/agent${search.size ? `?${search.toString()}` : ""}`;
}
