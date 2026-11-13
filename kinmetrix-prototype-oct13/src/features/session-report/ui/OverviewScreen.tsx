import { ReportDirectionVisual } from './ReportDirectionVisual'
import { ReportIntroSection } from './ReportIntroSection'
import { ReportStatsColumn } from './ReportStatsColumn'
import { ReportSymmetryPanel } from './ReportSymmetryPanel'
import { SessionContextSection } from './SessionContextSection'

export function OverviewScreen() {
  return (
    <div className="page overview-page">
      <ReportIntroSection />
      <div className="overview-grid">
        <ReportStatsColumn />
        <ReportDirectionVisual />
        <ReportSymmetryPanel />
      </div>
      <SessionContextSection />
    </div>
  )
}
