export type ReportView =
  | 'overview'
  | 'measurements'
  | 'progress'
  | 'direction'
  | 'next'

export type ReportTabView = 'overview' | 'measurements' | 'progress'

export type CompareWith = 'baseline' | 'previous' | 'earlier' | 'reference'

export type MapView = 'map' | 'list'

export type ForceUnit = 'lb' | 'kg'

export type ExerciseMethod = 'isometric' | 'isokinetic'

export type SessionPurpose = 'assessment' | 'training'

export type ResultScenario = 'improving' | 'steady' | 'lower' | 'first'

export type SymmetryProfile = 'male' | 'female' | 'unset'

export type SymmetryTone = 'unscored' | 'in-range' | 'outside-range'

export type DeltaTone = 'up' | 'down' | 'neutral'

export type ChartMode = 'force' | 'movement'

export type ProgressMetric = 'strength' | 'stability'

import type { PlanSmartSessionTemplateId } from './planSmartSessionTemplates'

export type SessionContextTag =
  | 'unset'
  | 'normal'
  | 'fatigued'
  | 'sore'
  | 'injured'
  | 'other'

export type SheetKind =
  | 'closed'
  | 'definitions'
  | 'export'
  | 'preview'
  | 'plan'
  | 'balance'
  | 'symmetry-pair'
  | 'direction'

export type SymmetryPairDefinition = {
  a: number
  b: number
  label: string
  target?: [number, number]
}

export type SessionReportState = {
  view: ReportView
  from: ReportTabView
  lastReportView: ReportTabView
  compare: CompareWith
  selected: number
  mapView: MapView
  showComparison: boolean
  count: 4 | 8
  method: ExerciseMethod
  purpose: SessionPurpose
  scenario: ResultScenario
  unit: ForceUnit
  reps: number
  rep: number
  chart: ChartMode
  sample: number
  metric: ProgressMetric
  note: string
  sessionContextTag: SessionContextTag
  symmetry: {
    profile: SymmetryProfile
    tolerance: number
  }
  plan: {
    frequency: number
    weeks: number
    repetitions: number
    smartSessionTemplateId: PlanSmartSessionTemplateId
  }
  sheet: {
    kind: SheetKind
    pairIndex: number | null
  }
  nextClient: string
  pickingClient: boolean
  nextReady: boolean
  nextPurpose: SessionPurpose
  nextMethod: ExerciseMethod
  nextCount: '4' | '8'
  clientSearch: string
}

export type SymmetryResult = {
  actual: number
  target: number | null
  low: number | null
  high: number | null
  eligible: boolean
  within: boolean
  status: string
  tone: SymmetryTone
}

export type FormattedDelta = {
  text: string
  tone: DeltaTone
}

export type SessionTotals = {
  strength: number
  control: number
  base: number | null
  bc: number | null
}

export type RepTracePoint = {
  t: number
  force: number
  angle: number
}
