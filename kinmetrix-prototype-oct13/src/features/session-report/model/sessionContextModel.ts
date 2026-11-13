import type { SessionContextTag } from './sessionReportTypes'

export const SESSION_CONTEXT_TAG_OPTIONS: {
  value: SessionContextTag
  label: string
}[] = [
  { value: 'unset', label: 'Not set' },
  { value: 'normal', label: 'Felt normal' },
  { value: 'fatigued', label: 'Fatigued' },
  { value: 'sore', label: 'Sore' },
  { value: 'injured', label: 'Injured or limited' },
  { value: 'other', label: 'Other' },
]

export function sessionContextTagLabel(tag: SessionContextTag): string {
  return SESSION_CONTEXT_TAG_OPTIONS.find((option) => option.value === tag)?.label ?? tag
}
