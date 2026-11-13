import { useCallback } from 'react'
import { MetricHelpButton } from '../../../shared/primitives/buttons/MetricHelpButton'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import {
  formatSymmetryBand,
  getCurrentForces,
  getPairRatio,
  getSymmetryPairs,
  getSymmetryProfileName,
  getSymmetryResult,
} from '../model/sessionReportModel'
import { ReportIcon } from './ReportIcon'

export function ReportSymmetryPanel() {
  const { state, openSheet } = useSessionReport()
  const forces = getCurrentForces(state)
  const pairs = getSymmetryPairs(state)

  const handleInfo = useCallback(() => {
    openSheet('balance')
  }, [openSheet])

  const handleComposite = useCallback(() => {
    openSheet('balance')
  }, [openSheet])

  return (
    <aside className="symmetry-panel" aria-labelledby="symmetry-title">
      <div className="section-head">
        <Typography variant="title" id="symmetry-title">
          Symmetry
        </Typography>
        <MetricHelpButton
          aria-label="About symmetry and target ratios"
          onClick={handleInfo}
        >
          <ReportIcon name="info" />
        </MetricHelpButton>
      </div>
      <Typography variant="label" as="p" className="symmetry-profile">
        {getSymmetryProfileName(state)} · ±{state.symmetry.tolerance}%
      </Typography>
      <div className="symmetry-list">
        {pairs.map((pair, index) => {
          const result = getSymmetryResult(state, pair)
          const handlePair = () => openSheet('symmetry-pair', index)
          return (
            <button
              key={pair.label}
              type="button"
              className={`symmetry-pair ${result.tone}`}
              onClick={handlePair}
            >
              <span>
                {pair.label}
                <small>
                  {result.eligible
                    ? `Range ${formatSymmetryBand(result)}`
                    : result.status}
                </small>
              </span>
              <span className="pair-result">
                <strong>{getPairRatio(forces, pair)}</strong>
                {result.eligible ? (
                  <small className="range-status">{result.status}</small>
                ) : null}
              </span>
              <ReportIcon name="chevron" />
            </button>
          )
        })}
      </div>
      <button type="button" className="composite-row" onClick={handleComposite}>
        <span>Front–back / left–right</span>
        <span>
          Pending <ReportIcon name="chevron" />
        </span>
      </button>
      <Typography variant="label" as="p" className="symmetry-caption">
        UFC/MMA isometric targets.
        <br />
        Tap a pair to see its range and result.
      </Typography>
    </aside>
  )
}
