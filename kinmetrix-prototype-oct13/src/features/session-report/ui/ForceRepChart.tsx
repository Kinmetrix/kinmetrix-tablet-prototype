import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import {
  REP_STYLES,
  repNumbers,
  traceDirectionRep,
} from '../model/repRecordingModel'
import {
  convertForce,
  formatForce,
  getCurrentForces,
  getUnitLabel,
} from '../model/sessionReportModel'

type Props = {
  compact?: boolean
}

export function ForceRepChart({ compact = false }: Props) {
  const { state, setSample } = useSessionReport()
  const width = compact ? 580 : 630
  const height = compact ? 166 : 225
  const left = 43
  const right = 14
  const top = 22
  const bottom = 31
  const angle = state.chart === 'movement' && state.method === 'isokinetic'
  const max = angle
    ? 40
    : Math.ceil((getCurrentForces(state)[state.selected]! * 1.15) / 10) * 10
  const unit = getUnitLabel(state)

  const xScale = useCallback(
    (time: number) => left + (time / 5) * (width - left - right),
    [width, left, right],
  )
  const yScale = useCallback(
    (value: number) => top + ((max - value) / max) * (height - top - bottom),
    [max, height, top, bottom],
  )

  const traces = repNumbers(state).map((rep) =>
    traceDirectionRep(state, state.selected, rep),
  )
  const visibleTraces = state.rep ? [traces[state.rep - 1]!] : traces
  const sampleIndex = Math.round(state.sample * 20)
  const valuesAtSample = visibleTraces.map(
    (trace) => trace[sampleIndex]![angle ? 'angle' : 'force'],
  )
  const sampleValue =
    valuesAtSample.reduce((sum, value) => sum + value, 0) / valuesAtSample.length

  const handleSampleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSample(Number(event.target.value))
    },
    [setSample],
  )

  return (
    <div id="rep-chart">
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${angle ? 'Movement angle' : 'Force'} over five seconds`}
      >
        <text x="4" y="12">
          {angle ? 'Angle (°)' : `Force (${unit})`}
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <path
              d={`M${left} ${yScale(max * fraction)}H${width - right}`}
              stroke="#e6e6e9"
            />
            <text x={left - 9} y={yScale(max * fraction) + 4} textAnchor="end">
              {Math.round(angle ? max * fraction : convertForce(state, max * fraction))}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5].map((tick) => (
          <text key={tick} x={xScale(tick)} y={height - 14} textAnchor="middle">
            {tick}
          </text>
        ))}
        <text x={width / 2} y={height} textAnchor="middle">
          Time (seconds)
        </text>
        {visibleTraces.map((trace, traceIndex) => {
          const styleIndex = state.rep ? state.rep - 1 : traceIndex
          const style = REP_STYLES[styleIndex]!
          const path = trace
            .map((point, index) => {
              const command = index === 0 ? 'M' : 'L'
              const x = xScale(point.t).toFixed(1)
              const y = yScale(point[angle ? 'angle' : 'force']).toFixed(1)
              return `${command}${x} ${y}`
            })
            .join(' ')
          return (
            <path
              key={styleIndex}
              d={path}
              stroke={style.color}
              strokeDasharray={style.dash}
              strokeWidth={state.rep ? 2.5 : 1.7}
              fill="none"
            />
          )
        })}
        <path
          d={`M${xScale(state.sample)} ${top}V${height - bottom}`}
          stroke="#9898a0"
          strokeDasharray="3 4"
        />
        <circle
          cx={xScale(state.sample)}
          cy={yScale(sampleValue)}
          r={4}
          fill={state.rep ? REP_STYLES[state.rep - 1]!.color : '#3f3f46'}
        />
      </svg>
      <div className="chart-control">
        <label htmlFor="sample-time">Explore time</label>
        <input
          id="sample-time"
          type="range"
          min={0}
          max={5}
          step={0.05}
          value={state.sample}
          aria-label="Time within repetition"
          onChange={handleSampleChange}
        />
        <output className="chart-readout">
          {state.sample.toFixed(2)}s ·{' '}
          {angle
            ? `${sampleValue.toFixed(1)}°`
            : `${formatForce(state, sampleValue)} ${unit}`}
          {state.rep ? '' : ' avg'}
        </output>
      </div>
    </div>
  )
}
