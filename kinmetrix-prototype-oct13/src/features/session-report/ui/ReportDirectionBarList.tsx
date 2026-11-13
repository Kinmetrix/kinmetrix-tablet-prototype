import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import {
  convertForce,
  directionName,
  formatDelta,
  formatForce,
  getComparisonShortName,
  getCurrentForces,
  getCurrentStability,
  getDirectionIndices,
  getReferenceForces,
  getReferenceStability,
  getUnitLabel,
} from '../model/sessionReportModel'
import { ReportDelta } from './ReportDelta'

type BarMetricProps = {
  label: string
  value: number
  referenceValue: number | null
  max: number
  isStability?: boolean
}

function DirectionBarMetric({
  label,
  value,
  referenceValue,
  max,
  isStability = false,
}: BarMetricProps) {
  const { state } = useSessionReport()
  const unit = getUnitLabel(state)
  const comparison = getComparisonShortName(state)
  const width = Math.max(0, Math.min(100, (value / max) * 100))
  const refLeft =
    referenceValue === null
      ? null
      : Math.max(0, Math.min(100, (referenceValue / max) * 100))
  const current = isStability ? `${value}%` : `${formatForce(state, value)} ${unit}`
  const delta =
    referenceValue === null
      ? null
      : formatDelta(
          isStability ? value - referenceValue : convertForce(state, value - referenceValue),
          isStability ? ' pts' : ` ${unit}`,
          isStability ? 0 : 1,
        )

  return (
    <span className={`direction-bar-metric ${isStability ? 'is-stability' : ''}`}>
      <span className="bar-metric-label">{label}</span>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ width: `${width}%` }} />
        {refLeft !== null ? (
          <span
            className="bar-reference"
            style={{ left: `${refLeft}%` }}
            title={`${comparison}: ${isStability ? `${referenceValue}%` : `${formatForce(state, referenceValue!)} ${unit}`}`}
          />
        ) : null}
      </span>
      <strong className="bar-current">{current}</strong>
      <span className="bar-change">
        {delta ? <ReportDelta delta={delta} /> : '—'}
      </span>
    </span>
  )
}

export function ReportDirectionBarList() {
  const { state, openDirectionSheet } = useSessionReport()
  const indices = getDirectionIndices(state)
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const reference = getReferenceForces(state)
  const referenceStability = getReferenceStability(state)
  const handleSelect = useCallback(
    (index: number) => {
      openDirectionSheet(index, 'overview')
    },
    [openDirectionSheet],
  )

  return (
    <div
      className="bar-list direction-bars"
      role="group"
      aria-label={`Strength and stability bars by direction. Scroll to review all ${state.count} directions.`}
    >
      {indices.map((index) => {
        const name = directionName(index)
        const selected = index === state.selected
        return (
          <button
            key={index}
            type="button"
            className={`paired-row direction-bar-row ${selected ? 'active' : ''}`}
            aria-pressed={selected}
            onClick={() => handleSelect(index)}
          >
            <span className="bar-direction-name">
              {name}
              <small>{index * 45}°</small>
            </span>
            <span className="direction-bar-pair">
              <DirectionBarMetric
                label="Strength"
                value={forces[index]!}
                referenceValue={reference ? reference[index]! : null}
                max={50}
              />
              <DirectionBarMetric
                label="Stability"
                value={stability[index]!}
                referenceValue={referenceStability ? referenceStability[index]! : null}
                max={100}
                isStability
              />
            </span>
          </button>
        )
      })}
    </div>
  )
}
