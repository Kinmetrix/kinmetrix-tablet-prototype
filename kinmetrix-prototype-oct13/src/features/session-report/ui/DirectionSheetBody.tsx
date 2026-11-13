import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import {
  REP_CONTROL_OFFSETS,
  repAverageForce,
  repNumbers,
  traceDirectionRep,
} from '../model/repRecordingModel'
import {
  baselineForce,
  clinicalName,
  convertForce,
  formatDelta,
  formatForce,
  getComparisonShortName,
  getCurrentForces,
  getCurrentStability,
  getReferenceForces,
  getReferenceStability,
  getUnitLabel,
  recordedSession,
} from '../model/sessionReportModel'
import { SegmentedControl, SegmentedOption } from '../../../shared/primitives/form/SegmentedControl'
import { ForceRepChart } from './ForceRepChart'
import { RepSelector } from './RepSelector'
import { ReportDelta } from './ReportDelta'
import { RepMarker } from './RepMarkerInline'

export function DirectionSheetBody() {
  const { state, setChart, setRep } = useSessionReport()
  const index = state.selected
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const reference = getReferenceForces(state)
  const referenceStability = getReferenceStability(state)
  const unit = getUnitLabel(state)
  const recorded = recordedSession()
  const comparison = getComparisonShortName(state)
  const control = stability[index]!

  const handleChartForce = useCallback(() => setChart('force'), [setChart])
  const handleChartMovement = useCallback(() => setChart('movement'), [setChart])

  const recordingTabs =
    state.method === 'isokinetic' ? (
      <SegmentedControl role="group" aria-label="Recording metric">
        <SegmentedOption pressed={state.chart === 'force'} onClick={handleChartForce}>
          Force
        </SegmentedOption>
        <SegmentedOption pressed={state.chart === 'movement'} onClick={handleChartMovement}>
          Movement
        </SegmentedOption>
      </SegmentedControl>
    ) : null

  return (
    <>
      <div className="drawer-recording">
        <div className="drawer-context">
          <span>{clinicalName(index)}</span>
          <span>
            {state.method === 'isometric'
              ? 'Isometric · 3° hold'
              : 'Isokinetic · 3° to 35°'}{' '}
            · 5 s
          </span>
          {state.purpose === 'training' ? (
            <span className="drawer-challenge">
              Challenge:{' '}
              {formatForce(
                state,
                baselineForce(index) * (recorded.challengePercent / 100),
              )}{' '}
              {unit} · {recorded.challengePercent}% baseline
            </span>
          ) : null}
        </div>
        <div className="drawer-summary numeric">
          <div>
            <label>Direction average peak force</label>
            <div>
              <strong>
                {formatForce(state, forces[index]!)}
                <span className="unit"> {unit}</span>
              </strong>
              {reference ? (
                <ReportDelta
                  delta={formatDelta(
                    convertForce(state, forces[index]! - reference[index]!),
                    ` ${unit}`,
                  )}
                />
              ) : null}
            </div>
            <small>
              {reference
                ? `${comparison} · ${formatForce(state, reference[index]!)} ${unit}`
                : 'No comparison available'}
            </small>
          </div>
          <div>
            <label>Direction stability</label>
            <div>
              <strong>
                {control}
                <span className="unit">%</span>
              </strong>
              {referenceStability ? (
                <ReportDelta
                  delta={formatDelta(control - referenceStability[index]!, ' pts', 0)}
                />
              ) : null}
            </div>
            <small>
              {referenceStability
                ? `${comparison} · ${referenceStability[index]}%`
                : state.scenario === 'first'
                  ? 'Starting stability'
                  : 'Current stability'}
            </small>
          </div>
        </div>
        <div className="drawer-chart-context">
          <span>
            {state.rep
              ? `Rep ${state.rep} of ${state.reps}`
              : `All ${state.reps} repetitions`}{' '}
            · Current session
          </span>
          {state.method === 'isokinetic' && state.reps > 4
            ? recordingTabs
            : 'Tap a color to inspect a rep'}
        </div>
        <div
          className={`drawer-rep-controls ${state.reps <= 4 ? 'few-reps' : ''}`}
        >
          <RepSelector />
          {state.reps <= 4 ? recordingTabs : null}
        </div>
        <ForceRepChart compact />
      </div>
      <div className="drawer-table-head">
        <h3>
          Every repetition <span>· {state.reps}</span>
        </h3>
        <span>{state.reps > 4 ? 'Scroll for all reps' : 'Tap a row to inspect'}</span>
      </div>
      <div
        className="drawer-table-scroll"
        role="region"
        aria-label={`All ${state.reps} repetition measurements`}
        tabIndex={0}
      >
        <table className="drawer-reps numeric" aria-label="Measurements for all repetitions">
          <thead>
            <tr>
              <th scope="col">Rep</th>
              <th scope="col">Peak ({unit})</th>
              <th scope="col">Average ({unit})</th>
              <th scope="col">Stability</th>
            </tr>
          </thead>
          <tbody>
            {repNumbers(state).map((rep) => {
              const samples = traceDirectionRep(state, index, rep)
              const peak = Math.max(...samples.map((point) => point.force))
              const repStability = control + REP_CONTROL_OFFSETS[rep - 1]!
              const handleRowRep = () => setRep(rep)
              return (
                <tr
                  key={rep}
                  className={state.rep === rep ? 'selected' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      aria-pressed={state.rep === rep}
                      onClick={handleRowRep}
                    >
                      <RepMarker rep={rep} />
                      Rep {rep}
                    </button>
                  </td>
                  <td>{formatForce(state, peak)}</td>
                  <td>{formatForce(state, repAverageForce(samples))}</td>
                  <td>{repStability}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="drawer-footnote">
        Average force covers the whole rep. Colors identify reps, not scores.
        Illustrative recordings.
      </p>
    </>
  )
}
