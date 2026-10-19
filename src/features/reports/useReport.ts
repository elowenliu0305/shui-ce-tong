import { useEffect, useState } from "react";

import { useAppContext } from "../../app/app-context";
import type { ReportSnapshot } from "../../domain/report";

export function useReport(reportId: string | undefined) {
  const { dependencies } = useAppContext();
  const [report, setReport] = useState<ReportSnapshot | null | undefined>(reportId ? undefined : null);
  useEffect(() => {
    if (!reportId) return;
    void dependencies.assessment.getReport(reportId).then((result) => setReport(result.ok ? result.data : null));
  }, [dependencies, reportId]);
  return reportId ? report : null;
}
