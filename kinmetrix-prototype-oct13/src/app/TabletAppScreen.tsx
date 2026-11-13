import { useCallback, useState } from 'react'
import { DeviceFrame } from '../shared/layout/DeviceFrame'
import { AppShellProvider } from '../features/home-shell/ui/AppShellContext'
import { AppShellScreen } from '../features/home-shell/ui/AppShellScreen'
import { ReportChromeProvider } from '../features/session-report/ui/ReportChromeContext'
import { SessionReportScreen } from '../features/session-report/ui/SessionReportScreen'

export function TabletAppScreen() {
  const [showReport, setShowReport] = useState(false)

  const handleOpenAnalysis = useCallback(() => {
    setShowReport(true)
  }, [])

  const handleExitToHome = useCallback(() => {
    setShowReport(false)
  }, [])

  return (
    <DeviceFrame isHome={!showReport}>
      {showReport ? (
        <ReportChromeProvider chrome={{ embedded: true, onExitToHome: handleExitToHome }}>
          <SessionReportScreen layout="content" />
        </ReportChromeProvider>
      ) : (
        <AppShellProvider onOpenAnalysis={handleOpenAnalysis}>
          <AppShellScreen />
        </AppShellProvider>
      )}
    </DeviceFrame>
  )
}
