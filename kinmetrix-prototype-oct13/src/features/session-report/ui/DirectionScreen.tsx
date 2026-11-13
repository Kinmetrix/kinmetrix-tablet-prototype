import { useCallback } from 'react'
import { SegmentedControl, SegmentedOption } from '../../../shared/primitives/form/SegmentedControl'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import {
  REP_CONTROL_OFFSETS,
  repAverageForce,
  traceDirectionRep,
} from '../model/repRecordingModel'
import {
  clinicalName,
  directionName,
  formatForce,
  getCurrentForces,
  getCurrentStability,
  getReferenceDate,
  getReferenceForces,
  getReferenceName,
  getUnitLabel,
} from '../model/sessionReportModel'
import { ForceRepChart } from './ForceRepChart'
import { RepSelector } from './RepSelector'
import { ReportIcon } from './ReportIcon'
import { ReportIntroSection } from './ReportIntroSection'

export function DirectionScreen() {
  const { state, goBackFromDirection, goToNextDirection, setChart } = useSessionReport()
  const index = state.selected
  const reference = getReferenceForces(state)
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const unit = getUnitLabel(state)
  const rep = state.rep
  const samples = rep ? traceDirectionRep(state, index, rep) : null
  const peak = rep
    ? Math.max(...samples!.map((point) => point.force))
    : forces[index]!
  const repControl =
    rep > 0
      ? stability[index]! + REP_CONTROL_OFFSETS[rep - 1]!
      : stability[index]!

  const handleBack = useCallback(() => goBackFromDirection(), [goBackFromDirection])
  const handleNext = useCallback(() => goToNextDirection(), [goToNextDirection])
  const handleChartForce = useCallback(() => setChart('force'), [setChart])
  const handleChartMovement = useCallback(() => setChart('movement'), [setChart])

  const backLabel = state.from === 'measurements' ? 'measurements' : 'overview'

  return (
    <div className="page direction-page">
      <button type="button" className="back" onClick={handleBack}>
        <ReportIcon name="back" /> Back to {backLabel}
      </button>
      <ReportIntroSection
        title={`${directionName(index)} · ${index * 45}°`}
        subtitle={`${clinicalName(index)} · ${
          reference
            ? `Compared with ${getReferenceName(state)}, ${getReferenceDate(state)}`
            : 'Current session'
        }`}
      />
      <div className="protocol" style={{ marginTop: 16 }}>
        <span>
          Starting tilt <strong>3°</strong>
        </span>
        {state.method === 'isokinetic' ? (
          <span>
            Finishing angle <strong>35°</strong>
          </span>
        ) : null}
        <span>
          {state.method === 'isometric' ? 'Hold' : 'Movement'} <strong>5 seconds</strong>
        </span>
        <span>
          Repetitions <strong>{state.reps}</strong>
        </span>
      </div>
      <div className="section-head">
        <Typography variant="title">
          {state.chart === 'movement' && state.method === 'isokinetic'
            ? 'Movement through the repetition'
            : 'How the force was produced'}
        </Typography>
        {state.method === 'isokinetic' ? (
          <SegmentedControl aria-label="Chart type">
            <SegmentedOption pressed={state.chart === 'force'} onClick={handleChartForce}>
              Force
            </SegmentedOption>
            <SegmentedOption pressed={state.chart === 'movement'} onClick={handleChartMovement}>
              Movement
            </SegmentedOption>
          </SegmentedControl>
        ) : null}
      </div>
      <RepSelector />
      <div className="detail-grid">
        <section>
          <ForceRepChart />
          <Typography variant="helper">
            {rep
              ? 'Average force includes the entire recorded repetition, including the initial build-up.'
              : 'Each line is one repetition. Select a rep to inspect its average force, peak and control.'}
          </Typography>
        </section>
        <aside className="rep-summary numeric">
          <Typography variant="heading">
            {rep ? `Repetition ${rep}` : 'Direction summary'}
          </Typography>
          <div className="rep-measure">
            <label>{rep ? 'Peak force' : 'Average peak force'}</label>
            <strong>
              {formatForce(state, peak)} <span className="unit">{unit}</span>
            </strong>
          </div>
          {rep && samples ? (
            <div className="rep-measure">
              <label>Average force within rep</label>
              <strong>
                {formatForce(state, repAverageForce(samples))}{' '}
                <span className="unit">{unit}</span>
              </strong>
            </div>
          ) : null}
          <div className="rep-measure">
            <label>Stability</label>
            <strong>
              {repControl}
              <span className="unit">%</span>
            </strong>
          </div>
        </aside>
      </div>
      <div className="section-head secondary-section">
        <Typography variant="helper" as="span">
          Showing illustrative recordings.
        </Typography>
        <TextLink onClick={handleNext}>
          Next direction <ReportIcon name="arrow" />
        </TextLink>
      </div>
    </div>
  )
}
