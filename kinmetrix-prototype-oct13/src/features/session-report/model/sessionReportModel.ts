import {
  BASE_CONTROL,
  BASELINE_FORCES,
  CLINICAL_NAMES,
  COMPARE_OPTIONS,
  DIRECTION_NAMES,
  EARLIER_CONTROL,
  EARLIER_FORCES,
  ORIGINAL_FORCES,
  PARTICIPANT,
  PREV_CONTROL,
  PREVIOUS_FORCES,
  RECORDED_SESSION,
  STABILITY,
  SYMMETRY_PAIR_DEFINITIONS,
} from './sessionFixtures'
import {
  DEFAULT_PLAN_SMART_SESSION_TEMPLATE_ID,
  isPlanSmartSessionTemplateId,
  planSmartSessionTemplateLabel,
} from './planSmartSessionTemplates'
import type {
  CompareWith,
  FormattedDelta,
  SessionContextTag,
  SessionReportState,
  SessionTotals,
  SymmetryPairDefinition,
  SymmetryResult,
} from './sessionReportTypes'

export type PersistedSessionSlice = {
  plan?: Partial<SessionReportState['plan']> & Record<string, unknown>
  note?: string
  sessionContextTag?: SessionContextTag
}

export function normalizePersistedPlan(
  raw: PersistedSessionSlice['plan'],
): SessionReportState['plan'] {
  const templateRaw = raw?.smartSessionTemplateId
  const smartSessionTemplateId =
    typeof templateRaw === 'string' && isPlanSmartSessionTemplateId(templateRaw)
      ? templateRaw
      : DEFAULT_PLAN_SMART_SESSION_TEMPLATE_ID

  return {
    frequency: typeof raw?.frequency === 'number' ? raw.frequency : 3,
    weeks: typeof raw?.weeks === 'number' ? raw.weeks : 6,
    repetitions: typeof raw?.repetitions === 'number' ? raw.repetitions : 10,
    smartSessionTemplateId,
  }
}

export function formatPlanSummary(plan: SessionReportState['plan']): string {
  const template = planSmartSessionTemplateLabel(plan.smartSessionTemplateId)
  return `${plan.frequency} sessions per week · ${plan.weeks}-week plan · ${template} · ${plan.repetitions} reps per direction`
}

export { planSmartSessionTemplateLabel } from './planSmartSessionTemplates'

const LB_TO_KG = 2.2046226218

export function directionName(index: number): string {
  return DIRECTION_NAMES[index] ?? ''
}

export function clinicalName(index: number): string {
  return CLINICAL_NAMES[index] ?? ''
}

export function baselineForce(index: number): number {
  return BASELINE_FORCES[index] ?? 0
}

export function recordedSession(): {
  challengePercent: number
  completedSessions: number
  programTotal: number
} {
  return RECORDED_SESSION
}

export function participantSummary(): {
  name: string
  initials: string
  sessionDateLabel: string
} {
  return PARTICIPANT
}

export function compareOptions(): { value: CompareWith; label: string }[] {
  return COMPARE_OPTIONS
}

export function createDefaultSessionReportState(
  persisted: PersistedSessionSlice | null,
): SessionReportState {
  const plan = normalizePersistedPlan(persisted?.plan)
  const sessionContextTag = persisted?.sessionContextTag ?? 'unset'

  return {
    view: 'overview',
    from: 'overview',
    lastReportView: 'overview',
    compare: 'baseline',
    selected: 1,
    mapView: 'map',
    showComparison: true,
    count: 8,
    method: 'isometric',
    purpose: 'assessment',
    scenario: 'improving',
    unit: 'lb',
    reps: 12,
    rep: 0,
    chart: 'force',
    sample: 2.5,
    metric: 'strength',
    note: persisted?.note ?? '',
    sessionContextTag,
    symmetry: { profile: 'male', tolerance: 20 },
    plan,
    sheet: { kind: 'closed', pairIndex: null },
    nextClient: 'Jordan Hale',
    pickingClient: false,
    nextReady: false,
    nextPurpose: 'assessment',
    nextMethod: 'isometric',
    nextCount: '8',
    clientSearch: '',
  }
}

export function getDirectionIndices(state: SessionReportState): number[] {
  return state.count === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7]
}

export function getUnitLabel(state: SessionReportState): 'lb' | 'kg' {
  return state.unit === 'kg' ? 'kg' : 'lb'
}

export function convertForce(state: SessionReportState, value: number): number {
  return state.unit === 'kg' ? value / LB_TO_KG : value
}

export function formatForce(state: SessionReportState, value: number): string {
  return convertForce(state, value).toFixed(1)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function getCurrentForces(state: SessionReportState): number[] {
  if (state.scenario === 'steady') {
    return BASELINE_FORCES.map(
      (value, index) =>
        value * [1.02, 0.97, 1.01, 1.02, 1, 0.98, 1.01, 1][index]!,
    )
  }
  if (state.scenario === 'lower') {
    return BASELINE_FORCES.map(
      (value, index) =>
        value * [0.91, 0.88, 0.95, 0.92, 0.94, 0.89, 0.93, 0.91][index]!,
    )
  }
  return ORIGINAL_FORCES
}

export function getCurrentStability(state: SessionReportState): number[] {
  if (state.scenario === 'steady') {
    return BASE_CONTROL.map(
      (value, index) => value + [1, 0, 1, -1, 0, 1, 0, 0][index]!,
    )
  }
  if (state.scenario === 'lower') {
    return BASE_CONTROL.map((value) => value - 3)
  }
  return STABILITY
}

export function getReferenceForces(state: SessionReportState): number[] | null {
  if (state.scenario === 'first' || state.compare === 'reference') {
    return null
  }
  if (state.compare === 'previous') {
    return PREVIOUS_FORCES
  }
  if (state.compare === 'earlier') {
    return EARLIER_FORCES
  }
  return BASELINE_FORCES
}

export function getReferenceStability(state: SessionReportState): number[] | null {
  if (state.scenario === 'first' || state.compare === 'reference') {
    return null
  }
  if (state.compare === 'previous') {
    return PREV_CONTROL
  }
  if (state.compare === 'earlier') {
    return EARLIER_CONTROL
  }
  return BASE_CONTROL
}

export function getReferenceName(state: SessionReportState): string {
  if (state.compare === 'previous') {
    return 'last assessment'
  }
  if (state.compare === 'earlier') {
    return '15 Sep assessment'
  }
  if (state.compare === 'reference') {
    return 'reference group'
  }
  return 'baseline'
}

export function getReferenceDate(state: SessionReportState): string {
  if (state.compare === 'previous') {
    return '19 Sep 2026'
  }
  if (state.compare === 'earlier') {
    return '15 Sep 2026'
  }
  return '1 Sep 2026'
}

export function getComparisonShortName(state: SessionReportState): string {
  if (state.compare === 'previous') {
    return 'Last'
  }
  if (state.compare === 'earlier') {
    return '15 Sep'
  }
  return 'Baseline'
}

export function getSessionTotals(state: SessionReportState): SessionTotals {
  const ids = getDirectionIndices(state)
  const current = getCurrentForces(state)
  const control = getCurrentStability(state)
  const reference = getReferenceForces(state)
  const referenceControl = getReferenceStability(state)

  return {
    strength: average(ids.map((index) => current[index]!)),
    control: average(ids.map((index) => control[index]!)),
    base: reference ? average(ids.map((index) => reference[index]!)) : null,
    bc: referenceControl
      ? average(ids.map((index) => referenceControl[index]!))
      : null,
  }
}

export function formatDelta(
  value: number,
  suffix = '',
  digits = 1,
): FormattedDelta {
  const rounded = Number(value.toFixed(digits))
  let tone: FormattedDelta['tone'] = 'neutral'
  if (rounded > 0) {
    tone = 'up'
  } else if (rounded < 0) {
    tone = 'down'
  }
  const sign = rounded > 0 ? '+' : ''
  const text =
    rounded === 0 ? `0${suffix}` : `${sign}${rounded.toFixed(digits)}${suffix}`
  return { text, tone }
}

export function getOverviewHeading(state: SessionReportState): [string, string] {
  const totals = getSessionTotals(state)
  const reference = getReferenceForces(state)
  const ids = getDirectionIndices(state)
  const current = getCurrentForces(state)

  if (state.scenario === 'first') {
    return [
      'Your starting point is set.',
      'This assessment gives you a reference for the sessions ahead.',
    ]
  }
  if (!reference) {
    return [
      'Your results, ready to review.',
      'Connect matching reference data to put these results in context.',
    ]
  }

  const pct = (totals.strength / totals.base! - 1) * 100
  const improved = ids.filter((index) => current[index]! > reference[index]!).length

  if (Math.abs(pct) < 3) {
    return [
      'Strength is holding steady.',
      `Average peak force is ${Math.abs(pct).toFixed(1)}% ${pct < 0 ? 'lower' : 'higher'} than your ${getReferenceName(state)}.`,
    ]
  }
  if (pct > 0) {
    const stabilityDelta = totals.control - totals.bc!
    return [
      `Stronger in ${improved} of ${state.count} directions.`,
      `Strength is up ${pct.toFixed(0)}%; stability ${totals.control >= totals.bc! ? 'up' : 'down'} ${Math.round(Math.abs(stabilityDelta))} points from ${getReferenceName(state)}.`,
    ]
  }
  return [
    'Strength is lower this session.',
    `Average peak force is ${Math.abs(pct).toFixed(0)}% below your ${getReferenceName(state)}. Review the details together.`,
  ]
}

export function getSymmetryPairs(state: SessionReportState): SymmetryPairDefinition[] {
  return state.count === 4
    ? SYMMETRY_PAIR_DEFINITIONS.slice(0, 2)
    : SYMMETRY_PAIR_DEFINITIONS
}

export function getPairRatio(forces: number[], pair: SymmetryPairDefinition): string {
  return `${(forces[pair.a]! / forces[pair.b]!).toFixed(2)} : 1`
}

export function getSymmetryResult(
  state: SessionReportState,
  pair: SymmetryPairDefinition,
): SymmetryResult {
  const forces = getCurrentForces(state)
  const actual = forces[pair.a]! / forces[pair.b]!
  const configured = Boolean(pair.target) && state.symmetry.profile !== 'unset'
  const target = configured
    ? pair.target![state.symmetry.profile === 'female' ? 1 : 0]!
    : null
  const eligible = configured && state.method === 'isometric'
  const tolerance = state.symmetry.tolerance / 100
  const low = target === null ? null : target * (1 - tolerance)
  const high = target === null ? null : target * (1 + tolerance)
  const within =
    eligible && low !== null && high !== null && actual >= low - 1e-10 && actual <= high + 1e-10

  let status = 'Target not set'
  if (configured) {
    status = !eligible ? 'Isometric only' : within ? 'In range' : actual < low! ? 'Below range' : 'Above range'
  }

  const tone = !eligible ? 'unscored' : within ? 'in-range' : 'outside-range'

  return {
    actual,
    target,
    low,
    high,
    eligible,
    within,
    status,
    tone,
  }
}

export function getSymmetrySummary(state: SessionReportState): {
  scored: number
  within: number
  unscored: number
} {
  const results = getSymmetryPairs(state).map((pair) => getSymmetryResult(state, pair))
  const scored = results.filter((result) => result.eligible)
  return {
    scored: scored.length,
    within: scored.filter((result) => result.within).length,
    unscored: results.length - scored.length,
  }
}

export function getSymmetryProfileName(state: SessionReportState): string {
  if (state.symmetry.profile === 'unset') {
    return 'No profile'
  }
  return `MMA ${state.symmetry.profile}`
}

export function formatSymmetryBand(result: SymmetryResult): string {
  if (result.low === null || result.high === null) {
    return ''
  }
  return `${result.low.toFixed(2)}–${result.high.toFixed(2)} : 1`
}

export function isCompareDisabled(state: SessionReportState): boolean {
  return state.scenario === 'first'
}
