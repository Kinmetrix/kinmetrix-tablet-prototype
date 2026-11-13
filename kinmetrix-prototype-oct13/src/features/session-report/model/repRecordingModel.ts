import {
  BASELINE_FORCES,
  BASE_CONTROL,
  EARLIER_CONTROL,
  EARLIER_FORCES,
  PREV_CONTROL,
  PREVIOUS_FORCES,
} from './sessionFixtures'
import {
  getCurrentForces,
  getCurrentStability,
  getDirectionIndices,
} from './sessionReportModel'
import type { RepTracePoint, SessionReportState } from './sessionReportTypes'

export const REP_STYLES = [
  { color: '#3f3f46', dash: '' },
  { color: '#2563a6', dash: '6 3' },
  { color: '#804fa0', dash: '2 3' },
  { color: '#946419', dash: '8 3 2 3' },
  { color: '#bd492f', dash: '' },
  { color: '#167fa3', dash: '6 3' },
  { color: '#ba427c', dash: '2 3' },
  { color: '#9b5225', dash: '8 3 2 3' },
  { color: '#596c87', dash: '' },
  { color: '#5046ba', dash: '6 3' },
  { color: '#8b4934', dash: '2 3' },
  { color: '#41454b', dash: '8 3 2 3' },
] as const

const REP_PEAK_FACTORS = [
  0.93, 1.025, 0.99, 1.055, 0.86, 1.14, 0.905, 1.095, 0.96, 1.04, 0.88, 1.12,
]

export const REP_CONTROL_OFFSETS = [-1, 2, -2, 1, -5, 5, -3, 3, -4, 4, -6, 6]

export function repNumbers(state: SessionReportState): number[] {
  return Array.from({ length: state.reps }, (_, index) => index + 1)
}

export function traceDirectionRep(
  state: SessionReportState,
  directionIndex: number,
  rep: number,
): RepTracePoint[] {
  const peak = getCurrentForces(state)[directionIndex]! * REP_PEAK_FACTORS[rep - 1]!
  const control =
    getCurrentStability(state)[directionIndex]! + REP_CONTROL_OFFSETS[rep - 1]!
  const raw: { t: number; v: number }[] = []

  for (let step = 0; step <= 100; step += 1) {
    const t = step / 20
    const ramp = 1 - Math.exp(-t * 4)
    const noise =
      ((100 - control) / 800) *
      (Math.sin(t * 9 + rep) * 0.7 + Math.sin(t * 19 + rep) * 0.3)
    let value = ramp * (1 - (0.07 * t) / 5) + noise * ramp
    if (state.method === 'isokinetic') {
      value *= 0.91 + 0.09 * Math.sin((Math.PI * t) / 5)
    }
    raw.push({ t, v: value })
  }

  const max = Math.max(...raw.map((point) => point.v))
  return raw.map((point) => ({
    t: point.t,
    force: (point.v / max) * peak,
    angle:
      3 +
      (32 * point.t) / 5 +
      ((100 - control) / 150) *
        Math.sin(point.t * 6 + rep) *
        Math.sin((Math.PI * point.t) / 5),
  }))
}

export function repAverageForce(samples: RepTracePoint[]): number {
  let integral = 0
  for (let index = 1; index < samples.length; index += 1) {
    integral +=
      ((samples[index]!.force + samples[index - 1]!.force) / 2) *
      (samples[index]!.t - samples[index - 1]!.t)
  }
  return integral / 5
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function getHistorySeries(
  state: SessionReportState,
  metric: 'strength' | 'stability' = 'strength',
): number[] {
  const ids = getDirectionIndices(state)
  const controlSeries = [BASE_CONTROL, EARLIER_CONTROL, PREV_CONTROL, getCurrentStability(state)]
  const forceSeries = [BASELINE_FORCES, EARLIER_FORCES, PREVIOUS_FORCES, getCurrentForces(state)]
  const source = metric === 'stability' ? controlSeries : forceSeries
  return source.map((series) => average(ids.map((index) => series[index]!)))
}
