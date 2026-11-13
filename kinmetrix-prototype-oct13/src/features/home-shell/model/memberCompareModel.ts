import type { MemberRecord, RosterMember } from './appShellTypes'
import {
  COMPARE_DIRECTION_COUNT,
  COMPARE_FORCES_BY_MEMBER,
  COMPARE_SERIES_STYLES,
  COMPARE_STABILITY_BY_MEMBER,
  DEFAULT_COMPARE_MEMBER_IDS,
} from './memberCompareFixtures'
import type { MemberCompareCandidate, MemberCompareSnapshot } from './memberCompareTypes'

const FALLBACK_STYLE = COMPARE_SERIES_STYLES.jordan!

function latestAnalysisDate(record: MemberRecord): string {
  const latest = record.analyses[0]
  if (!latest) {
    return 'No analysis yet'
  }
  return latest.dateLabel
}

export function isCompareEligible(memberId: string, record: MemberRecord): boolean {
  return record.analyses.length > 0 && memberId in COMPARE_FORCES_BY_MEMBER
}

function hasCompareData(memberId: string, record: MemberRecord): boolean {
  return isCompareEligible(memberId, record)
}

export function defaultCompareSelection(roster: readonly RosterMember[]): string[] {
  const rosterIds = new Set(roster.map((member) => member.id))
  const preferred = DEFAULT_COMPARE_MEMBER_IDS.filter((id) => rosterIds.has(id))
  if (preferred.length > 0) {
    return [...preferred]
  }
  return roster
    .filter((member) => memberIdHasForces(member.id))
    .slice(0, 3)
    .map((member) => member.id)
}

function memberIdHasForces(memberId: string): boolean {
  return memberId in COMPARE_FORCES_BY_MEMBER
}

export function projectCompareCandidates(input: {
  roster: readonly RosterMember[]
  recordFor: (memberId: string) => MemberRecord
}): MemberCompareCandidate[] {
  return input.roster.map((member) => {
    const record = input.recordFor(member.id)
    return {
      memberId: member.id,
      name: member.name,
      dateLabel: latestAnalysisDate(record),
      hasCompareData: hasCompareData(member.id, record),
    }
  })
}

export function projectCompareSnapshots(input: {
  roster: readonly RosterMember[]
  selectedIds: readonly string[]
  recordFor: (memberId: string) => MemberRecord
}): MemberCompareSnapshot[] {
  const rosterById = new Map(input.roster.map((member) => [member.id, member]))
  return input.selectedIds.flatMap((memberId) => {
    const member = rosterById.get(memberId)
    if (!member) {
      return []
    }
    const record = input.recordFor(memberId)
    const forces = COMPARE_FORCES_BY_MEMBER[memberId]
    if (!forces || forces.length !== COMPARE_DIRECTION_COUNT) {
      return []
    }
    const style = COMPARE_SERIES_STYLES[memberId] ?? FALLBACK_STYLE
    const stabilityPercent = COMPARE_STABILITY_BY_MEMBER[memberId] ?? 0
    const canOpenAnalysis = record.analyses.some((analysis) => analysis.openable)
    return [
      {
        memberId,
        name: member.name,
        dateLabel: latestAnalysisDate(record),
        forces,
        stabilityPercent,
        style,
        canOpenAnalysis,
      },
    ]
  })
}

export function nextAddableMemberId(
  candidates: readonly MemberCompareCandidate[],
  selectedIds: readonly string[],
): string | null {
  const selected = new Set(selectedIds)
  const next = candidates.find(
    (candidate) => candidate.hasCompareData && !selected.has(candidate.memberId),
  )
  return next?.memberId ?? null
}
