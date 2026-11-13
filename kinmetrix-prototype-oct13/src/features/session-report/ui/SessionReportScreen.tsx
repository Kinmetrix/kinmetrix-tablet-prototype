import { DeviceFrame } from '../../../shared/layout/DeviceFrame'
import { ReportFooter } from './ReportFooter'
import { ReportSheetDialog } from './ReportSheetDialog'
import { Toast } from '../../../shared/primitives/feedback/Toast'
import { ReportTopBar } from './ReportTopBar'
import { SessionReportProvider, useSessionReport } from './SessionReportContext'
import { DirectionScreen } from './DirectionScreen'
import { HandoffScreen } from './HandoffScreen'
import { MeasurementsScreen } from './MeasurementsScreen'
import { OverviewScreen } from './OverviewScreen'
import { ProgressScreen } from './ProgressScreen'
import { ReportPrintAppendix } from './ReportPrintAppendix'

function SessionReportBody() {
  const { state, toast } = useSessionReport()
  const isHandoff = state.view === 'next'

  let mainContent
  switch (state.view) {
    case 'measurements':
      mainContent = <MeasurementsScreen />
      break
    case 'progress':
      mainContent = <ProgressScreen />
      break
    case 'direction':
      mainContent = <DirectionScreen />
      break
    case 'next':
      mainContent = <HandoffScreen />
      break
    default:
      mainContent = <OverviewScreen />
  }

  return (
    <>
      <ReportTopBar />
      <main className="main" tabIndex={-1}>
        {mainContent}
        {!isHandoff ? <ReportPrintAppendix /> : null}
      </main>
      {!isHandoff ? <ReportFooter /> : null}
      <ReportSheetDialog />
      <Toast message={toast} />
    </>
  )
}

function SessionReportFrame() {
  const { state } = useSessionReport()
  return (
    <DeviceFrame isHome={state.view === 'next'}>
      <SessionReportBody />
    </DeviceFrame>
  )
}

type SessionReportScreenProps = {
  layout?: 'frame' | 'content'
}

export function SessionReportScreen({ layout = 'frame' }: SessionReportScreenProps) {
  if (layout === 'content') {
    return (
      <SessionReportProvider>
        <SessionReportBody />
      </SessionReportProvider>
    )
  }

  return (
    <SessionReportProvider>
      <SessionReportFrame />
    </SessionReportProvider>
  )
}
