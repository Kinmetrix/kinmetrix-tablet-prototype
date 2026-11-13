import { formatRelativeDate } from '../../../shared/date/formatRelativeDate'
import type { MemberRecord, RosterMember } from './appShellTypes'
import { DEMO_REFERENCE_DATE } from './shellFixtures'
import {
  COMPARE_FORCES_BY_MEMBER,
  COMPARE_STABILITY_BY_MEMBER,
} from './memberCompareFixtures'

export type TeamOverviewKpiId = 'activeUsers' | 'analyses' | 'programs'

export type TeamOverviewKpi = {
  id: TeamOverviewKpiId
  label: string
  value: number
  deltaLabel: string
  footnote: string
  trend: readonly number[]
}

export type TeamOverviewMemberRow = {
  member: RosterMember
  analysesCount: number
  currentForceLabel: string | null
  stabilityLabel: string | null
  measuredLabel: string
}

export type TeamOverviewPeriod = {
  rangeLabel: string
  compareLabel: string
  presetLabel: string
}

export type TeamActivityItem = {
  id: string
  memberId: string
  memberName: string
  kindLabel: string
  occurredAt: string
  timeLabel: string
}

export type TeamActivityRail = {
  items: readonly TeamActivityItem[]
}

export type TeamDeviceStatus = {
  connected: boolean
  navLabel: 'Connected' | 'Not connected'
  summary: string
  actionLabel: string
}

export type TeamOverviewModel = {
  title: 'Team overview'
  subtitle: string
  period: TeamOverviewPeriod
  kpis: readonly TeamOverviewKpi[]
  memberRows: readonly TeamOverviewMemberRow[]
  activity: TeamActivityRail
  device: TeamDeviceStatus
}

const ARC_CONNECTED = 'Arc connected'

const OVERVIEW_PERIOD: TeamOverviewPeriod = {
  rangeLabel: '17 Sept 2026 – 16 Oct 2026',
  compareLabel: 'Compared with 18 Aug 2026 – 16 Sept 2026',
  presetLabel: 'Last 30 days',
}

function collectActivity(
  roster: readonly RosterMember[],
  recordFor: (memberId: string) => MemberRecord,
): TeamActivityRail {
  const rows: { at: string; item: TeamActivityItem }[] = []
  for (const member of roster) {
    for (const analysis of recordFor(member.id).analyses) {
      rows.push({
        at: analysis.occurredAt,
        item: {
          id: `${member.id}:${analysis.id}`,
          memberId: member.id,
          memberName: member.name,
          kindLabel: analysis.kindLabel,
          occurredAt: analysis.occurredAt,
          timeLabel: formatRelativeDate(analysis.occurredAt, DEMO_REFERENCE_DATE),
        },
      })
    }
  }
  rows.sort((a, b) => b.at.localeCompare(a.at))
  return { items: rows.map((row) => row.item) }
}

function formatKpiDelta(current: number, previous: number): string {
  if (current === previous) {
    return `Unchanged from ${previous}`
  }
  const diff = current - previous
  const sign = diff > 0 ? '+' : ''
  const pct = previous === 0 ? 100 : (diff / previous) * 100
  return `${sign}${diff} (${sign}${pct.toFixed(1)}%) from ${previous}`
}

function previousPeriodValue(current: number): number {
  if (current <= 0) {
    return 0
  }
  return Math.max(0, current - Math.max(1, Math.round(current * 0.14)))
}

function kpiTrendSeries(current: number, previous: number): number[] {
  const pointCount = 14
  if (current === 0 && previous === 0) {
    return Array.from({ length: pointCount }, () => 0)
  }
  const amplitude = Math.max(0.35, (current + previous) * 0.05)
  return Array.from({ length: pointCount }, (_, index) => {
    const t = index / (pointCount - 1)
    const linear = previous + (current - previous) * t
    const wave = Math.sin(index * 0.72) * amplitude * (1 - t * 0.35)
    return Math.max(0, Math.round(linear + wave))
  })
}

function overviewKpis(
  roster: readonly RosterMember[],
  recordFor: (memberId: string) => MemberRecord,
): TeamOverviewKpi[] {
  const activeUsers = roster.filter((member) => recordFor(member.id).analyses.length > 0).length
  const analyses = roster.reduce(
    (total, member) => total + recordFor(member.id).analyses.length,
    0,
  )
  const programs = roster.filter((member) => recordFor(member.id).program !== null).length

  const activeUsersPrev = previousPeriodValue(activeUsers)
  const analysesPrev = previousPeriodValue(analyses)
  const programsPrev = previousPeriodValue(programs)

  return [
    {
      id: 'activeUsers',
      label: 'Active users',
      value: activeUsers,
      deltaLabel: formatKpiDelta(activeUsers, activeUsersPrev),
      footnote: 'Completed an analysis in the period',
      trend: kpiTrendSeries(activeUsers, activeUsersPrev),
    },
    {
      id: 'analyses',
      label: 'Analyses',
      value: analyses,
      deltaLabel: formatKpiDelta(analyses, analysesPrev),
      footnote: 'Completed during period',
      trend: kpiTrendSeries(analyses, analysesPrev),
    },
    {
      id: 'programs',
      label: 'Active programs',
      value: programs,
      deltaLabel: formatKpiDelta(programs, programsPrev),
      footnote: 'Member assignments at period end',
      trend: kpiTrendSeries(programs, programsPrev),
    },
  ]
}

function memberRow(
  member: RosterMember,
  record: MemberRecord,
): TeamOverviewMemberRow {
  const analysesCount = record.analyses.length
  const latest = record.analyses[0]
  if (!latest) {
    return {
      member,
      analysesCount: 0,
      currentForceLabel: null,
      stabilityLabel: null,
      measuredLabel: 'No data',
    }
  }

  const forces = COMPARE_FORCES_BY_MEMBER[member.id]
  const forceValue = forces ? Math.max(...forces) : Number(latest.stableWeight)
  const stability =
    COMPARE_STABILITY_BY_MEMBER[member.id] ?? Math.round(Number(latest.symmetry) * 100)

  return {
    member,
    analysesCount,
    currentForceLabel: Number.isFinite(forceValue) ? `${forceValue} N` : null,
    stabilityLabel: `${stability}%`,
    measuredLabel: latest.dateLabel,
  }
}

export function projectDeviceStatus(connected: boolean): TeamDeviceStatus {
  if (connected) {
    return {
      connected: true,
      navLabel: 'Connected',
      summary: 'Arc is connected.',
      actionLabel: 'Arc is connected',
    }
  }
  return {
    connected: false,
    navLabel: 'Not connected',
    summary: 'Arc is not connected.',
    actionLabel: 'Arc is not connected',
  }
}

export function projectTeamDeviceStatus(
  roster: readonly RosterMember[],
  recordFor: (memberId: string) => MemberRecord,
): TeamDeviceStatus {
  const connected = roster.some((member) => recordFor(member.id).deviceStatus === ARC_CONNECTED)
  return projectDeviceStatus(connected)
}

export function projectTeamOverview(input: {
  roster: readonly RosterMember[]
  recordFor: (memberId: string) => MemberRecord
}): TeamOverviewModel {
  return {
    title: 'Team overview',
    subtitle: 'Members, measurements, and activity in one place.',
    period: OVERVIEW_PERIOD,
    kpis: overviewKpis(input.roster, input.recordFor),
    memberRows: input.roster.map((member) => memberRow(member, input.recordFor(member.id))),
    activity: collectActivity(input.roster, input.recordFor),
    device: projectTeamDeviceStatus(input.roster, input.recordFor),
  }
}
