import { useCallback } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import { formatPlanSummary, recordedSession } from '../model/sessionReportModel'
import { ReportIcon } from './ReportIcon'

export function ReportFooter() {
  const { state, openSheet } = useSessionReport()
  const plan = state.plan
  const recorded = recordedSession()

  const handlePlan = useCallback(() => {
    openSheet('plan')
  }, [openSheet])

  const footerLead =
    state.scenario === 'first'
      ? 'Build from your starting point.'
      : 'Keep your next session in sight.'

  const completion =
    state.scenario === 'first'
      ? 'Ready for your first session'
      : `${recorded.completedSessions} training sessions complete`

  return (
    <footer className="footer">
      <div className="next-copy">
        <Typography variant="title" as="strong">
          {footerLead}
        </Typography>
        <Typography variant="muted">{formatPlanSummary(plan)}</Typography>
      </div>
      <div className="footer-actions">
        <span className="completion">{completion}</span>
        <Button onClick={handlePlan}>
          Plan your next visit <ReportIcon name="arrow" />
        </Button>
      </div>
    </footer>
  )
}
