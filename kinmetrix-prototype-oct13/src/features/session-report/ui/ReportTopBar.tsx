import { useCallback } from 'react'
import { IconButton } from '../../../shared/primitives/buttons/IconButton'
import { NavTabButton } from '../../../shared/primitives/buttons/NavTabButton'
import { useReportChrome } from './ReportChromeContext'
import { useSessionReport } from './SessionReportContext'
import type { ReportTabView } from '../model/sessionReportTypes'
import { ReportIcon } from './ReportIcon'

const TABS: { view: ReportTabView; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'measurements', label: 'Measurements' },
  { view: 'progress', label: 'Progress' },
]

type ReportTabProps = {
  view: ReportTabView
  label: string
  active: boolean
  onSelect: (view: ReportTabView) => void
}

function ReportTab({ view, label, active, onSelect }: ReportTabProps) {
  const handleClick = useCallback(() => {
    onSelect(view)
  }, [onSelect, view])

  return (
    <NavTabButton aria-current={active ? 'page' : undefined} onClick={handleClick}>
      {label}
    </NavTabButton>
  )
}

export function ReportTopBar() {
  const { embedded, onExitToHome } = useReportChrome()
  const { state, setView, openSheet } = useSessionReport()

  const activeTab: ReportTabView =
    state.view === 'overview' || state.view === 'measurements' || state.view === 'progress'
      ? state.view
      : state.from

  const handleTab = useCallback(
    (view: ReportTabView) => {
      setView(view)
    },
    [setView],
  )

  const handleShare = useCallback(() => {
    openSheet('export')
  }, [openSheet])

  const handleExitHome = useCallback(() => {
    onExitToHome?.()
  }, [onExitToHome])

  return (
    <header className="topbar report-topbar">
      <div className="topbar-start">
        {embedded && onExitToHome ? (
          <IconButton
            className="report-back-home"
            aria-label="Back to home"
            onClick={handleExitHome}
          >
            <ReportIcon name="back" />
          </IconButton>
        ) : null}
      </div>
      <nav className="nav" aria-label="Report sections">
        {TABS.map((tab) => (
          <ReportTab
            key={tab.view}
            view={tab.view}
            label={tab.label}
            active={activeTab === tab.view}
            onSelect={handleTab}
          />
        ))}
      </nav>
      <div className="top-actions">
        <IconButton
          className="report-action"
          aria-label="Print or export report"
          onClick={handleShare}
        >
          <ReportIcon name="share" />
        </IconButton>
      </div>
    </header>
  )
}
