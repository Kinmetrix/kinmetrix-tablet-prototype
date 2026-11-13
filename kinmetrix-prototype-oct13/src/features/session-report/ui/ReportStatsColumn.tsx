import { useCallback } from 'react'
import { MetricHelpButton } from '../../../shared/primitives/buttons/MetricHelpButton'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import {
  convertForce,
  formatDelta,
  formatForce,
  getSessionTotals,
  getSymmetrySummary,
  getUnitLabel,
} from '../model/sessionReportModel'
import { ReportDelta } from './ReportDelta'
import { ReportIcon } from './ReportIcon'

export function ReportStatsColumn() {
  const { state, openSheet } = useSessionReport()
  const totals = getSessionTotals(state)
  const symmetry = getSymmetrySummary(state)
  const unit = getUnitLabel(state)

  const handleDefinitions = useCallback(() => {
    openSheet('definitions')
  }, [openSheet])

  const handleBalance = useCallback(() => {
    openSheet('balance')
  }, [openSheet])

  const strengthDelta =
    totals.base === null
      ? null
      : formatDelta(convertForce(state, totals.strength - totals.base), ` ${unit}`)
  const controlDelta =
    totals.bc === null ? null : formatDelta(totals.control - totals.bc, ' pts', 0)

  const symmetryValue = symmetry.scored
    ? `${symmetry.within} of ${symmetry.scored} in range`
    : 'Not scored'

  let symmetryFoot = ''
  if (symmetry.scored) {
    symmetryFoot = `Within ±${state.symmetry.tolerance}%`
  } else if (state.method !== 'isometric') {
    symmetryFoot = 'No isokinetic targets set'
  } else {
    symmetryFoot = 'Choose a benchmark profile'
  }

  return (
    <div className="stats numeric">
      <div className="stat">
        <div className="stat-label">
          <Typography variant="label" as="span">
            Strength
          </Typography>{' '}
          <MetricHelpButton aria-label="About average peak force" onClick={handleDefinitions}>
            <ReportIcon name="info" />
          </MetricHelpButton>
        </div>
        <div className="stat-inline">
          <Typography variant="metric" className="stat-value">
            {formatForce(state, totals.strength)}
            <span className="unit">{unit}</span>
          </Typography>
          {strengthDelta ? <ReportDelta delta={strengthDelta} /> : null}
        </div>
        <Typography variant="muted" as="div" className="stat-foot">
          Average peak force
          <br />
          Across all {state.count * state.reps} repetitions
        </Typography>
      </div>
      <div className="stat">
        <Typography variant="label" as="div" className="stat-label">
          Stability
        </Typography>
        <div className="stat-inline">
          <Typography variant="metric" className="stat-value">
            {Math.round(totals.control)}
            <span className="unit">%</span>
          </Typography>
          {controlDelta ? <ReportDelta delta={controlDelta} /> : null}
        </div>
        <Typography variant="muted" as="div" className="stat-foot">
          Control through the exercise
        </Typography>
      </div>
      <div className="stat">
        <Typography variant="label" as="div" className="stat-label">
          Symmetry
        </Typography>
        <div className="stat-inline">
          <Typography variant="metricCompact" className="stat-value score-pending">
            {symmetryValue}
          </Typography>
        </div>
        <Typography variant="muted" as="div" className="stat-foot">
          {symmetry.scored ? (
            <>
              {symmetryFoot}
              <br />
              {symmetry.unscored
                ? `${symmetry.unscored} pairs need targets`
                : 'All measured pairs compared'}
            </>
          ) : (
            <>
              {symmetryFoot}
              <br />
              Isometric reference available
            </>
          )}
        </Typography>
        <TextLink onClick={handleBalance}>
          View target ranges <ReportIcon name="chevron" />
        </TextLink>
      </div>
    </div>
  )
}
