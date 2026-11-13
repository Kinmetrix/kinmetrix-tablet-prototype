import { useCallback } from 'react'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { EmptyState } from '../../../shared/primitives/feedback/EmptyState'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import { getHistorySeries } from '../model/repRecordingModel'
import { formatForce, planSmartSessionTemplateLabel, recordedSession } from '../model/sessionReportModel'
import { ProgressHistoryChart } from './ProgressHistoryChart'
import { ReportIcon } from './ReportIcon'
import { ReportIntroSection } from './ReportIntroSection'

export function ProgressScreen() {
  const { state, setMetric, openSheet } = useSessionReport()
  const plan = state.plan
  const strengthHistory = getHistorySeries(state, 'strength')
  const stabilityHistory = getHistorySeries(state, 'stability')

  const handleStrengthMetric = useCallback(() => setMetric('strength'), [setMetric])
  const handleStabilityMetric = useCallback(() => setMetric('stability'), [setMetric])
  const handlePlan = useCallback(() => openSheet('plan'), [openSheet])
  const recorded = recordedSession()

  const progressWidth =
    state.scenario === 'first'
      ? 0
      : Math.min(100, (recorded.completedSessions / recorded.programTotal) * 100)

  return (
    <div className="page">
      <ReportIntroSection
        title="See the longer view."
        subtitle="Strength, stability and the sessions that connect them."
      />
      <div className="history-grid">
        <section>
          <div className="section-head">
            <div className="metric-tabs" role="group" aria-label="Chart metric">
              <button
                type="button"
                aria-pressed={state.metric === 'strength'}
                onClick={handleStrengthMetric}
              >
                Strength
              </button>
              <button
                type="button"
                aria-pressed={state.metric === 'stability'}
                onClick={handleStabilityMetric}
              >
                Stability
              </button>
            </div>
            <Typography variant="label" className="small muted">
              {state.method === 'isometric' ? 'Isometric' : 'Isokinetic'} · {state.count}{' '}
              directions
            </Typography>
          </div>
          {state.scenario === 'first' ? (
            <EmptyState>
              <Typography variant="heading">Your first assessment.</Typography>
              <Typography variant="muted">
                Complete another comparable assessment to start seeing change over time.
              </Typography>
            </EmptyState>
          ) : (
            <>
              <div style={{ marginTop: 18 }}>
                <ProgressHistoryChart />
              </div>
              <div className="table-wrap">
                <table style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>Assessment</th>
                      <th>Avg. peak ({state.unit})</th>
                      <th>Stability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      '1 Sep · Baseline',
                      '15 Sep',
                      '19 Sep',
                      '22 Sep · Current',
                    ].map((date, rowIndex) => (
                      <tr key={date}>
                        <td>{date}</td>
                        <td>
                          <strong>{formatForce(state, strengthHistory[rowIndex]!)}</strong>
                        </td>
                        <td>{Math.round(stabilityHistory[rowIndex]!)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <Typography variant="helper">
            These example assessments use matching exercise conditions. Comparisons across
            different protocols need to be identified separately.
          </Typography>
        </section>
        <aside className="plan-summary">
          <Typography variant="heading">Your current program</Typography>
          <Typography variant="label" className="small muted">
            {state.scenario === 'first'
              ? 'Ready to begin'
              : `Current program · ${recorded.completedSessions} of ${recorded.programTotal} complete`}
          </Typography>
          <div className="progress-track">
            <div style={{ width: `${progressWidth}%` }} />
          </div>
          <Typography variant="helper" className="plan-summary-helper">
            Recommended schedule
          </Typography>
          <dl>
            <div>
              <dt>Sessions per week</dt>
              <dd>{plan.frequency}</dd>
            </div>
            <div>
              <dt>Plan length</dt>
              <dd>{plan.weeks} weeks</dd>
            </div>
            <div>
              <dt>Smart session</dt>
              <dd>{planSmartSessionTemplateLabel(plan.smartSessionTemplateId)}</dd>
            </div>
            <div>
              <dt>Reps per direction</dt>
              <dd>{plan.repetitions}</dd>
            </div>
          </dl>
          <TextLink onClick={handlePlan}>
            Plan your next visit <ReportIcon name="arrow" />
          </TextLink>
          <Typography variant="helper">
            Matches the schedule in the report footer and printed copy.
          </Typography>
        </aside>
      </div>
    </div>
  )
}
