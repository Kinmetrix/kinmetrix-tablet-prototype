import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import {
  formatForce,
  getComparisonShortName,
  getReferenceDate,
  getReferenceForces,
  getUnitLabel,
} from '../model/sessionReportModel'

export function ReportMapLegend() {
  const { state, setShowComparison } = useSessionReport()
  const reference = getReferenceForces(state)
  const unit = getUnitLabel(state)

  const handleComparisonToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShowComparison(event.target.checked)
    },
    [setShowComparison],
  )

  if (state.mapView === 'list') {
    const comparisonLabel = reference
      ? `${getComparisonShortName(state)} · ${getReferenceDate(state).replace(' 2026', '')}`
      : 'No comparison available'
    return (
      <div className="list-key">
        <span>
          <i className="list-reference-key" />
          {comparisonLabel}
        </span>
        <span>
          {state.count > 4
            ? `Scroll for all ${state.count} directions`
            : `${state.count} directions`}
        </span>
      </div>
    )
  }

  return (
    <div className="radial-key" aria-label="Chart legend and independent scales">
      <span>
        <i className="force-key" />
        Strength · 0–{formatForce(state, 50)} {unit}
      </span>
      <span>
        <i className="stability-key" />
        Stability · 0–100%
      </span>
      {state.mapView === 'map' ? (
        <label
          className="comparison-toggle"
          title="Dotted lines show the selected comparison for strength and stability"
        >
          <input
            type="checkbox"
            checked={state.showComparison && reference !== null}
            disabled={reference === null}
            onChange={handleComparisonToggle}
          />
          <span>
            {reference ? (
              <>
                <i className="reference-key" />
                vs {getComparisonShortName(state)}
              </>
            ) : (
              'No comparison'
            )}
          </span>
        </label>
      ) : null}
    </div>
  )
}
