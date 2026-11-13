import type { CompareWith, SymmetryPairDefinition } from './sessionReportTypes'

export const DIRECTION_NAMES = [
  'Forward',
  'Front right',
  'Right',
  'Back right',
  'Rear',
  'Back left',
  'Left',
  'Front left',
] as const

export const CLINICAL_NAMES = [
  'Forward flexion',
  'Right diagonal flexion',
  'Right lateral flexion',
  'Right diagonal extension',
  'Rear extension',
  'Left diagonal extension',
  'Left lateral flexion',
  'Left diagonal flexion',
] as const

export const ORIGINAL_FORCES = [26.9, 14.9, 23.1, 36.1, 46.2, 33.2, 27.2, 20.1]
export const BASELINE_FORCES = [20.1, 16.2, 17.2, 28.4, 35, 25.2, 21.2, 17.5]
export const PREVIOUS_FORCES = [25.4, 16.3, 22.1, 33.6, 42.8, 30, 25.9, 20.7]
export const EARLIER_FORCES = [23.6, 15.8, 20.4, 31, 39.6, 28.1, 24.3, 19.1]

export const STABILITY = [66, 87, 90, 90, 82, 86, 88, 88]
export const BASE_CONTROL = [57, 78, 65, 74, 69, 68, 74, 72]
export const PREV_CONTROL = [63, 86, 86, 85, 81, 83, 85, 86]
export const EARLIER_CONTROL = [60, 84, 77, 82, 76, 79, 83, 81]

export const RECORDED_SESSION = {
  challengePercent: 10,
  completedSessions: 6,
  programTotal: 18,
} as const

export const PARTICIPANT = {
  name: 'Jordan Hale',
  initials: 'JH',
  sessionDateLabel: '22 Sep 2026',
} as const

export const SYMMETRY_PAIR_DEFINITIONS: SymmetryPairDefinition[] = [
  { a: 0, b: 4, label: 'Front / rear', target: [0.8, 0.7] },
  { a: 6, b: 2, label: 'Left / right', target: [1, 1] },
  { a: 5, b: 1, label: 'Back left / front right' },
  { a: 7, b: 3, label: 'Front left / back right' },
  { a: 7, b: 1, label: 'Front left / front right' },
  { a: 5, b: 3, label: 'Back left / back right' },
]

export const COMPARE_OPTIONS: { value: CompareWith; label: string }[] = [
  { value: 'baseline', label: 'Baseline · 1 Sep' },
  { value: 'previous', label: 'Last assessment · 19 Sep' },
  { value: 'earlier', label: 'Earlier assessment · 15 Sep' },
  { value: 'reference', label: 'Matching reference group' },
]
