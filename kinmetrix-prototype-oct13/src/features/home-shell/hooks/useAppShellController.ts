import { useCallback, useMemo, useState } from 'react'
import {
  loadDefaultTeamId,
  loadMemberRecord,
  loadTeams,
} from '../services/memberRosterService'
import type {
  AppWorkspaceMode,
  MemberShellDestination,
  RosterMember,
  ShellDestination,
  TeamShellDestination,
} from '../model/appShellTypes'
import { projectDeviceStatus, projectTeamOverview } from '../model/teamOverviewModel'
import {
  TEAM_COMPARE_DESTINATION,
  TEAM_HOME_DESTINATION,
  TEAM_ROSTER_DESTINATION,
  teamCanvasFor,
} from '../model/teamWorkspaceCatalog'

type MemberEntry = 'kiosk' | 'roster'

type Props = {
  onOpenAnalysis: () => void
}

export type AppShellController = ReturnType<typeof useAppShellController>

function findKioskMember() {
  for (const account of loadTeams()) {
    const member = account.roster.find((item) => item.id === 'jordan')
    if (member) {
      return member
    }
  }
  throw new Error('Missing kiosk member')
}

function teamFor(teamId: string) {
  const teams = loadTeams()
  const team = teams.find((item) => item.id === teamId) ?? teams[0]
  if (!team) {
    throw new Error('No team accounts')
  }
  return team
}

export function useAppShellController({ onOpenAnalysis }: Props) {
  const [workspaceMode, setWorkspaceMode] = useState<AppWorkspaceMode>('team')
  const [teamId, setTeamId] = useState(loadDefaultTeamId)
  const [teamDestination, setTeamDestination] =
    useState<TeamShellDestination>(TEAM_HOME_DESTINATION)
  const [memberDestination, setMemberDestination] = useState<MemberShellDestination>('home')
  const [activeMember, setActiveMember] = useState<RosterMember | null>(null)
  const [memberEntry, setMemberEntry] = useState<MemberEntry | null>(null)
  const [compareMemberIds, setCompareMemberIds] = useState<string[] | null>(null)
  const team = teamFor(teamId)

  const shellDestination: ShellDestination = useMemo(() => {
    if (workspaceMode === 'member') {
      return memberDestination
    }
    return teamDestination
  }, [memberDestination, teamDestination, workspaceMode])

  const openMember = useCallback((member: RosterMember) => {
    setActiveMember(member)
    setMemberEntry('roster')
    setWorkspaceMode('member')
    setMemberDestination('home')
  }, [])

  const signOut = useCallback(() => {
    const entry = memberEntry
    setActiveMember(null)
    setMemberEntry(null)
    setMemberDestination('home')
    if (entry === 'roster') {
      setWorkspaceMode('team')
      setTeamDestination(TEAM_ROSTER_DESTINATION)
      return
    }
    setWorkspaceMode('kiosk')
  }, [memberEntry])

  const selectTeamDestination = useCallback((destination: TeamShellDestination) => {
    setTeamDestination(destination)
  }, [])

  const openCompareMembers = useCallback((memberIds?: readonly string[]) => {
    setCompareMemberIds(memberIds ? [...memberIds] : null)
    setTeamDestination(TEAM_COMPARE_DESTINATION)
  }, [])

  const closeCompareMembers = useCallback(() => {
    setCompareMemberIds(null)
    setTeamDestination(TEAM_HOME_DESTINATION)
  }, [])

  const selectTeam = useCallback(
    (nextTeamId: string) => {
      if (nextTeamId === teamId) {
        return
      }
      setTeamId(nextTeamId)
      setTeamDestination(TEAM_HOME_DESTINATION)
    },
    [teamId],
  )

  const selectMemberDestination = useCallback((destination: MemberShellDestination) => {
    setMemberDestination(destination)
  }, [])

  const enterTeamView = useCallback(() => {
    setWorkspaceMode('kiosk')
  }, [])

  const leaveTeamView = useCallback(() => {
    setWorkspaceMode('team')
    setTeamDestination(TEAM_HOME_DESTINATION)
  }, [])

  const openKioskMember = useCallback((destination: 'home' | 'start') => {
    setActiveMember(findKioskMember())
    setMemberEntry('kiosk')
    setWorkspaceMode('member')
    setMemberDestination(destination)
  }, [])

  const openLatestAnalysis = useCallback(() => {
    onOpenAnalysis()
  }, [onOpenAnalysis])

  const memberRecordFor = useCallback((memberId: string) => loadMemberRecord(memberId), [])
  const teamOverview = projectTeamOverview({
    roster: team.roster,
    recordFor: loadMemberRecord,
  })
  const memberConnected = activeMember
    ? loadMemberRecord(activeMember.id).deviceStatus === 'Arc connected'
    : false
  const deviceStatus =
    workspaceMode === 'member' ? projectDeviceStatus(memberConnected) : teamOverview.device

  return {
    teams: loadTeams(),
    teamName: team.name,
    roster: team.roster,
    memberRecordFor,
    workspaceMode,
    shellDestination,
    teamDestination,
    teamCanvas: teamCanvasFor(teamDestination),
    teamOverview,
    deviceStatus,
    activeMember,
    memberEntry,
    openMember,
    signOut,
    selectTeam,
    selectTeamDestination,
    compareMemberIds,
    openCompareMembers,
    closeCompareMembers,
    selectMemberDestination,
    kioskMember: findKioskMember(),
    enterTeamView,
    leaveTeamView,
    openKioskMember,
    openLatestAnalysis,
  }
}
