import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import {
  directionName,
  formatForce,
  getCurrentForces,
  getCurrentStability,
  getDirectionIndices,
  getReferenceForces,
  getReferenceStability,
  getUnitLabel,
} from '../model/sessionReportModel'

const LABEL_POSITIONS: [number, number][] = [
  [205, 22],
  [337, 53],
  [370, 140],
  [337, 228],
  [205, 260],
  [73, 228],
  [40, 140],
  [73, 53],
]

const CX = 205
const CY = 140
const R = 103
const FORCE_MAX = 50

function polarPoint(index: number, value: number, max: number): [number, number] {
  const angle = (index * Math.PI) / 4
  return [CX + Math.sin(angle) * R * (value / max), CY - Math.cos(angle) * R * (value / max)]
}

function polygonPoints(indices: number[], values: number[], max: number): string {
  return indices
    .map((index) => polarPoint(index, values[index]!, max).map((v) => v.toFixed(1)).join(','))
    .join(' ')
}

function HeadOrientation() {
  return (
    <g
      className="head-orientation"
      role="img"
      aria-label="Top view of the head. Nose points to Forward, zero degrees. Participant’s right is on the right."
      pointerEvents="none"
    >
      <path d="M197 119 L205 106 L213 119 C225 124 229 146 221 159 C215 170 195 170 189 159 C181 146 185 124 197 119Z" />
      <path d="M184 137 C175 130 175 151 185 150 M226 137 C235 130 235 151 225 150" />
    </g>
  )
}

export function ReportRadarMap() {
  const { state, openDirectionSheet } = useSessionReport()
  const indices = getDirectionIndices(state)
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const reference = getReferenceForces(state)
  const referenceStability = getReferenceStability(state)
  const unit = getUnitLabel(state)
  const showReference = state.showComparison && reference !== null

  const handleSelect = useCallback(
    (index: number) => {
      openDirectionSheet(index, 'overview')
    },
    [openDirectionSheet],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openDirectionSheet(index, 'overview')
      }
    },
    [openDirectionSheet],
  )

  return (
    <svg
      className="map combined-map"
      viewBox="0 0 410 292"
      role="group"
      aria-label={`Strength and stability together by direction. Independent scales: strength zero to ${formatForce(state, FORCE_MAX)} ${unit}; stability zero to 100 percent.`}
    >
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={polygonPoints(indices, indices.map(() => fraction), 1)}
          fill="none"
          stroke="#dddde0"
          strokeWidth={1}
        >
          <title>
            {formatForce(state, FORCE_MAX * fraction)} {unit} strength; {fraction * 100}%
            stability
          </title>
        </polygon>
      ))}
      {indices.map((index) => {
        const [x, y] = polarPoint(index, 1, 1)
        return (
          <path
            key={`spoke-${index}`}
            d={`M${CX} ${CY}L${x} ${y}`}
            fill="none"
            stroke="#e6e6e9"
          />
        )
      })}
      <HeadOrientation />
      {showReference && reference && referenceStability ? (
        <>
          <polygon
            className="reference-force"
            points={polygonPoints(indices, reference, FORCE_MAX)}
            fill="none"
            stroke="#3f3f46"
            strokeOpacity={0.65}
            strokeWidth={1.3}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />
          <polygon
            className="reference-stability"
            points={polygonPoints(indices, referenceStability, 100)}
            fill="none"
            stroke="#356a9a"
            strokeOpacity={0.7}
            strokeWidth={1.3}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />
        </>
      ) : null}
      <polygon
        className="strength-series"
        points={polygonPoints(indices, forces, FORCE_MAX)}
        fill="#3f3f460d"
        stroke="#3f3f46"
        strokeWidth={2.2}
      />
      <polygon
        className="stability-series"
        points={polygonPoints(indices, stability, 100)}
        fill="none"
        stroke="#356a9a"
        strokeWidth={2}
        strokeDasharray="6 3"
      />
      {indices.map((index) => {
        const [px, py] = polarPoint(index, forces[index]!, FORCE_MAX)
        const [qx, qy] = polarPoint(index, stability[index]!, 100)
        const [lx, ly] = LABEL_POSITIONS[index]!
        const selected = index === state.selected
        const name = directionName(index)
        return (
          <g
            key={index}
            className="dir-hit"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${name}, ${index * 45} degrees, strength ${formatForce(state, forces[index]!)} ${unit}, stability ${stability[index]} percent`}
            onClick={() => handleSelect(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <circle
              className="strength-point"
              cx={px}
              cy={py}
              r={selected ? 5 : 3}
              fill={selected ? '#fff' : '#3f3f46'}
              stroke="#3f3f46"
              strokeWidth={selected ? 2.5 : 1}
            />
            <rect
              className="stability-point"
              x={qx - (selected ? 4 : 2.5)}
              y={qy - (selected ? 4 : 2.5)}
              width={selected ? 8 : 5}
              height={selected ? 8 : 5}
              fill={selected ? '#fff' : '#356a9a'}
              stroke="#356a9a"
              strokeWidth={selected ? 2 : 1}
            />
            <rect
              className="label-bg"
              x={lx - 45}
              y={ly - 23}
              width={90}
              height={58}
              rx={7}
              fill={selected ? '#efeff1' : 'transparent'}
              stroke="none"
            />
            <text x={lx} y={ly - 9} textAnchor="middle" fill="#626267" fontSize={11}>
              {name}
              {index === 0 ? ' · 0°' : ''}
            </text>
            <text
              className="direction-strength"
              x={lx}
              y={ly + 7}
              textAnchor="middle"
              fill="#3f3f46"
              fontWeight={650}
              fontSize={13}
            >
              {formatForce(state, forces[index]!)}
              <tspan fontSize={10} fontWeight={500}>
                {' '}
                {unit}
              </tspan>
            </text>
            <text
              className="direction-stability"
              x={lx}
              y={ly + 23}
              textAnchor="middle"
              fill="#356a9a"
              fontWeight={600}
              fontSize={11}
            >
              {stability[index]}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
