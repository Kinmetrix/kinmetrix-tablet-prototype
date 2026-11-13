import { COMPARE_FORCE_MAX } from '../model/memberCompareFixtures'
import type { MemberCompareSnapshot } from '../model/memberCompareTypes'

const CX = 200
const CY = 168
const R = 118
const INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1] as const
const DEGREE_LABELS = ['0°', '45°', '90°', '135°', '180°', '225°', '270°', '315°'] as const

const LABEL_OFFSET: [number, number][] = [
  [200, 24],
  [312, 58],
  [348, 168],
  [312, 278],
  [200, 312],
  [88, 278],
  [52, 168],
  [88, 58],
]

function polarPoint(index: number, value: number, max: number): [number, number] {
  const angle = (index * Math.PI) / 4
  return [CX + Math.sin(angle) * R * (value / max), CY - Math.cos(angle) * R * (value / max)]
}

function polygonPoints(values: readonly number[], max: number): string {
  return INDICES.map((index) => {
    const [x, y] = polarPoint(index, values[index]!, max)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function ringPolygon(fraction: number): string {
  return INDICES.map((index) => {
    const [x, y] = polarPoint(index, fraction, 1)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function CompareMarker({
  x,
  y,
  shape,
  stroke,
  selected,
}: {
  x: number
  y: number
  shape: MemberCompareSnapshot['style']['marker']
  stroke: string
  selected: boolean
}) {
  const size = selected ? 5 : 4
  if (shape === 'square') {
    return (
      <rect
        x={x - size}
        y={y - size}
        width={size * 2}
        height={size * 2}
        fill="var(--white)"
        stroke={stroke}
        strokeWidth={2}
      />
    )
  }
  if (shape === 'triangle') {
    const h = size * 1.8
    return (
      <polygon
        points={`${x},${y - h} ${x - h},${y + h * 0.6} ${x + h},${y + h * 0.6}`}
        fill="var(--white)"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    )
  }
  return (
    <circle cx={x} cy={y} r={size} fill="var(--white)" stroke={stroke} strokeWidth={2} />
  )
}

type Props = {
  series: readonly MemberCompareSnapshot[]
}

export function MemberCompareRadar({ series }: Props) {
  return (
    <svg
      className="member-compare-radar"
      viewBox="0 0 400 336"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Force by neck angle for ${series.length} members. Scale zero to ${COMPARE_FORCE_MAX} newtons.`}
    >
      {RING_FRACTIONS.map((fraction) => (
        <polygon
          key={fraction}
          points={ringPolygon(fraction)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
        />
      ))}
      {INDICES.map((index) => {
        const [x, y] = polarPoint(index, 1, 1)
        return (
          <path
            key={`spoke-${index}`}
            d={`M${CX} ${CY}L${x} ${y}`}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1}
          />
        )
      })}
      {RING_FRACTIONS.map((fraction) => {
        const value = COMPARE_FORCE_MAX * fraction
        return (
          <text
            key={`scale-${fraction}`}
            x={CX + 6}
            y={CY - R * fraction + 4}
            fill="var(--muted)"
            fontSize={10}
          >
            {value}
          </text>
        )
      })}
      {INDICES.map((index) => {
        const [lx, ly] = LABEL_OFFSET[index]!
        return (
          <text key={`deg-${index}`} x={lx} y={ly} textAnchor="middle" fill="var(--sub)" fontSize={11}>
            {DEGREE_LABELS[index]}
          </text>
        )
      })}
      {series.map((item) => (
        <g key={item.memberId} className="member-compare-series">
          <polygon
            points={polygonPoints(item.forces, COMPARE_FORCE_MAX)}
            fill={`${item.style.stroke}14`}
            stroke={item.style.stroke}
            strokeWidth={2}
            strokeDasharray={item.style.dasharray}
            strokeLinejoin="round"
          />
          {INDICES.map((index) => {
            const [px, py] = polarPoint(index, item.forces[index]!, COMPARE_FORCE_MAX)
            return (
              <CompareMarker
                key={`${item.memberId}-${index}`}
                x={px}
                y={py}
                shape={item.style.marker}
                stroke={item.style.stroke}
                selected={false}
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}
