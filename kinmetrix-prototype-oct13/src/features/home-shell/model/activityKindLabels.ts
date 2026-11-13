/** Display labels for completed work on the team activity rail and member history. */
export const ACTIVITY_KIND_LABEL = {
  assessment: 'Assessment',
  smartSession: 'Smart session',
  programDay: 'Program day',
  rangeOfMotion: 'Range of motion',
  firstAssessment: 'First assessment',
} as const

export type ActivityKindLabel =
  (typeof ACTIVITY_KIND_LABEL)[keyof typeof ACTIVITY_KIND_LABEL]

function indefiniteArticle(phrase: string): 'a' | 'an' {
  const first = phrase.trim()[0]
  return first && /[aeiou]/i.test(first) ? 'an' : 'a'
}

/** Second line on the team activity rail: lead text + optional emphasized phrase (lowercase). */
export function activityFeedActionCopy(kindLabel: string): {
  lead: string
  emphasis: string | null
} {
  if (kindLabel === ACTIVITY_KIND_LABEL.firstAssessment) {
    return { lead: 'completed their', emphasis: 'first assessment' }
  }
  if (kindLabel === ACTIVITY_KIND_LABEL.rangeOfMotion) {
    return { lead: 'completed a', emphasis: 'range of motion' }
  }
  const lowered = kindLabel.toLowerCase()
  return {
    lead: `completed ${indefiniteArticle(kindLabel)}`,
    emphasis: lowered,
  }
}
