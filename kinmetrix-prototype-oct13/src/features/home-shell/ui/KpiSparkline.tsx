type KpiSparklineTrend = 'up' | 'down' | 'flat'

type KpiSparklineProps = {
  gradientId: string
  values: readonly number[]
  trend: KpiSparklineTrend
  ariaLabel: string
}

const WIDTH = 112
const HEIGHT = 44
const PAD = 3

function strokeForTrend(trend: KpiSparklineTrend): string {
  if (trend === 'down') {
    return 'var(--danger)'
  }
  if (trend === 'up') {
    return 'var(--positive)'
  }
  return 'var(--sub)'
}

export function KpiSparkline({ gradientId, values, trend, ariaLabel }: KpiSparklineProps) {
  if (values.length < 2) {
    return null
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const innerWidth = WIDTH - PAD * 2
  const innerHeight = HEIGHT - PAD * 2

  const points = values.map((value, index) => {
    const x = PAD + (index / (values.length - 1)) * innerWidth
    const y = PAD + ((max - value) / range) * innerHeight
    return { x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ')
  const last = points[points.length - 1]!
  const first = points[0]!
  const areaPath = `${linePath} L${last.x} ${HEIGHT - PAD} L${first.x} ${HEIGHT - PAD} Z`
  const stroke = strokeForTrend(trend)

  return (
    <svg
      className="team-overview-kpi-sparkline"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
