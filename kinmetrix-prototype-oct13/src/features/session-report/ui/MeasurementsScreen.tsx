import { useCallback } from 'react'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { EmptyState } from '../../../shared/primitives/feedback/EmptyState'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import {
  convertForce,
  directionName,
  formatDelta,
  formatForce,
  getCurrentForces,
  getCurrentStability,
  getDirectionIndices,
  getReferenceForces,
  getUnitLabel,
} from '../model/sessionReportModel'
import { ReportDelta } from './ReportDelta'
import { ReportIcon } from './ReportIcon'
import { ReportIntroSection } from './ReportIntroSection'

export function MeasurementsScreen() {
  const { state, openDirectionSheet, openSheet } = useSessionReport()
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const reference = getReferenceForces(state)
  const unit = getUnitLabel(state)
  const indices = getDirectionIndices(state)

  const handleBalance = useCallback(() => {
    openSheet('balance')
  }, [openSheet])

  const handleOpenDirection = useCallback(
    (index: number) => {
      openDirectionSheet(index, 'measurements')
    },
    [openDirectionSheet],
  )

  return (
    <div className="page">
      <ReportIntroSection
        title="The measurements behind your session."
        subtitle="Select any direction to inspect its repetitions and recording."
      />
      <div className="protocol">
        <span>
          Exercise{' '}
          <strong>
            {state.method === 'isometric' ? 'Isometric hold' : 'Isokinetic movement'}
          </strong>
        </span>
        <span>
          Starting tilt <strong>3°</strong>
        </span>
        {state.method === 'isokinetic' ? (
          <span>
            Finishing angle <strong>35°</strong>
          </span>
        ) : null}
        <span>
          {state.method === 'isometric' ? 'Hold' : 'Movement duration'}{' '}
          <strong>5 seconds</strong>
        </span>
      </div>
      {state.compare === 'reference' ? (
        <EmptyState>
          <Typography variant="heading">Reference comparison is not available yet.</Typography>
          <Typography variant="muted">Your current measurements are shown below.</Typography>
        </EmptyState>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Direction</th>
              <th>Avg. peak ({unit})</th>
              <th>Stability</th>
              <th>{reference ? `Change (${unit})` : 'Comparison'}</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            {indices.map((index) => {
              const handleRow = () => handleOpenDirection(index)
              return (
                <tr key={index}>
                  <td>
                    <button type="button" className="row-action" onClick={handleRow}>
                      <span className="angle-mark">{index * 45}°</span>
                      {directionName(index)} <ReportIcon name="chevron" />
                    </button>
                  </td>
                  <td>
                    <strong>{formatForce(state, forces[index]!)}</strong>
                  </td>
                  <td>{stability[index]}%</td>
                  <td>
                    {reference ? (
                      <ReportDelta
                        delta={formatDelta(
                          convertForce(state, forces[index]! - reference[index]!),
                        )}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{state.reps}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="section-head" style={{ marginTop: 18 }}>
        <Typography variant="helper">
          Direction values average the peaks of its {state.reps} repetitions.
          <br />
          All values are illustrative prototype data.
        </Typography>
        <TextLink onClick={handleBalance}>
          Explore symmetry ratios <ReportIcon name="arrow" />
        </TextLink>
      </div>
    </div>
  )
}
