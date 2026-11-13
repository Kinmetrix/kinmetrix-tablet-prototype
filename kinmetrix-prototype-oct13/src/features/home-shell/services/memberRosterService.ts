import { DEMO_TEAMS, memberRecordFor } from '../model/shellFixtures'
import type { MemberRecord, TeamAccount } from '../model/appShellTypes'

export function loadTeams(): readonly TeamAccount[] {
  return DEMO_TEAMS
}

export function loadDefaultTeamId(): string {
  const first = DEMO_TEAMS[0]
  if (!first) {
    throw new Error('No team accounts')
  }
  return first.id
}

export function loadMemberRecord(memberId: string): MemberRecord {
  return memberRecordFor(memberId)
}
