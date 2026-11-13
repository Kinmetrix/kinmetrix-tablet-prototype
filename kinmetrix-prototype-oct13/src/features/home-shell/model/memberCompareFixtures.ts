import type { MemberCompareSeriesStyle } from './memberCompareTypes'

export const COMPARE_DIRECTION_COUNT = 8
export const COMPARE_FORCE_MAX = 200

export const COMPARE_SERIES_STYLES: Record<string, MemberCompareSeriesStyle> = {
  alex: { stroke: '#2563eb', dasharray: undefined, marker: 'circle' },
  jamie: { stroke: '#9333ea', dasharray: '6 4', marker: 'square' },
  taylor: { stroke: '#ea580c', dasharray: undefined, marker: 'triangle' },
  jordan: { stroke: '#0f766e', dasharray: '4 3', marker: 'circle' },
}

/** Newtons at 0°, 45°, … 315° for prototype compare charts. */
export const COMPARE_FORCES_BY_MEMBER: Record<string, readonly number[]> = {
  alex: [118, 152, 138, 112, 98, 104, 126, 145],
  jamie: [102, 128, 118, 108, 112, 118, 110, 120],
  taylor: [130, 165, 148, 125, 115, 108, 122, 158],
  jordan: [108, 132, 124, 102, 94, 98, 112, 128],
}

export const COMPARE_STABILITY_BY_MEMBER: Record<string, number> = {
  alex: 92,
  jamie: 88,
  taylor: 95,
  jordan: 90,
}

export const DEFAULT_COMPARE_MEMBER_IDS = ['alex', 'jamie', 'taylor'] as const
