import { CLINICAL_NAMES } from './sessionFixtures'
import {
  convertForce,
  formatForce,
  getCurrentForces,
  getCurrentStability,
  getDirectionIndices,
  getReferenceDate,
  getReferenceForces,
  getReferenceName,
  getUnitLabel,
} from './sessionReportModel'
import type { SessionReportState } from './sessionReportTypes'

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function buildMeasurementsCsv(state: SessionReportState): string {
  const reference = getReferenceForces(state)
  const unit = getUnitLabel(state)
  const forces = getCurrentForces(state)
  const stability = getCurrentStability(state)
  const rows: (string | number)[][] = [
    ['Kinmetrix prototype — illustrative data'],
    ['Session date', '22 Sep 2026'],
    ['Purpose', state.purpose],
    ['Method', state.method],
    ['Starting tilt', 3],
    ['Finishing angle', state.method === 'isokinetic' ? 35 : 'Not applicable'],
    ['Duration (seconds)', 5],
    [
      'Comparison',
      reference ? `${getReferenceName(state)} ${getReferenceDate(state)}` : 'None',
    ],
    [],
    [
      'Direction',
      'Angle',
      `Average peak force (${unit})`,
      'Stability (%)',
      'Repetitions',
      `Reference force (${unit})`,
      `Change (${unit})`,
    ],
    ...getDirectionIndices(state).map((index) => [
      CLINICAL_NAMES[index]!,
      index * 45,
      formatForce(state, forces[index]!),
      stability[index]!,
      state.reps,
      reference ? formatForce(state, reference[index]!) : '',
      reference
        ? convertForce(state, forces[index]! - reference[index]!).toFixed(1)
        : '',
    ]),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

