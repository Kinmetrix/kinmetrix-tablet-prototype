import { ReportTakeHomeSummary } from './ReportTakeHomeSummary'
import { useSessionReport } from './SessionReportContext'

export function ReportPrintAppendix() {
  const { state } = useSessionReport()

  return (
    <section className="only-print print-appendix" aria-hidden="true">
      <ReportTakeHomeSummary state={state} variant="print" />
    </section>
  )
}
