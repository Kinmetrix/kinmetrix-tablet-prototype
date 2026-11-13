import { useSessionReport } from './SessionReportContext'
import { getHistorySeries } from '../model/repRecordingModel'
import { convertForce, formatForce, getUnitLabel } from '../model/sessionReportModel'

const DATES = ['1 Sep', '15 Sep', '19 Sep', '22 Sep']

export function ProgressHistoryChart() {
  const { state } = useSessionReport()
  const stable = state.metric === 'stability'
  const values = getHistorySeries(state, state.metric)
  const width = 540
  const height = 210
  const left = 42
  const right = 17
  const top = 18
  const bottom = 30
  const max = stable ? 100 : 40
  const unit = getUnitLabel(state)

  const xScale = (index: number) =>
    left + [0, 14, 18, 21][index]! * ((width - left - right) / 21)
  const yScale = (value: number) =>
    top + ((max - value) / max) * (height - top - bottom)
  const format = (value: number) =>
    stable ? Math.round(value).toString() : formatForce(state, value)

  const linePath = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${xScale(index)} ${yScale(value)}`)
    .join(' ')

  const gridValues = stable ? [25, 50, 75, 100] : [10, 20, 30, 40]

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${stable ? 'Stability' : 'Average peak force'} across four assessments`}
    >
      <text x="4" y="12">{stable ? '%' : unit}</text>
      {gridValues.map((gridValue) => (
        <g key={gridValue}>
          <path d={`M${left} ${yScale(gridValue)}H${width - right}`} stroke="#e6e6e9" />
          <text x={left - 9} y={yScale(gridValue) + 4} textAnchor="end">
            {stable ? gridValue : Math.round(convertForce(state, gridValue))}
          </text>
        </g>
      ))}
      <path d={linePath} stroke="#3f3f46" strokeWidth={2.4} fill="none" />
      {values.map((value, index) => (
        <g key={DATES[index]}>
          <circle cx={xScale(index)} cy={yScale(value)} r={4} fill="#3f3f46" />
          <text
            x={xScale(index)}
            y={yScale(value) - 10}
            textAnchor="middle"
            style={{ fill: '#3f3f46', fontWeight: 600 }}
          >
            {format(value)}
            {stable ? '%' : ''}
          </text>
          <text x={xScale(index)} y={height - 6} textAnchor="middle">
            {DATES[index]}
          </text>
        </g>
      ))}
    </svg>
  )
}
