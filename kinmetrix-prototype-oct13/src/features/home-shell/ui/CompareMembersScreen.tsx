import { useCallback, useMemo, useState } from 'react'
import { BreadcrumbItem, Breadcrumbs } from '../../../shared/primitives/breadcrumbs/Breadcrumbs'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { COMPARE_DIRECTION_COUNT } from '../model/memberCompareFixtures'
import {
  defaultCompareSelection,
  nextAddableMemberId,
  projectCompareCandidates,
  projectCompareSnapshots,
} from '../model/memberCompareModel'
import type { MemberCompareSnapshot } from '../model/memberCompareTypes'
import { useAppShell } from './AppShellContext'
import { MemberCompareRadar } from './MemberCompareRadar'

function SeriesLegendIcon({ item }: { item: MemberCompareSnapshot }) {
  const { stroke, dasharray, marker } = item.style
  return (
    <svg className="member-compare-legend-icon" viewBox="0 0 24 12" aria-hidden="true">
      <line
        x1={0}
        y1={6}
        x2={24}
        y2={6}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={dasharray}
      />
      {marker === 'square' ? (
        <rect x={9} y={3} width={6} height={6} fill="var(--white)" stroke={stroke} strokeWidth={2} />
      ) : marker === 'triangle' ? (
        <polygon
          points="12,2 8,10 16,10"
          fill="var(--white)"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : (
        <circle cx={12} cy={6} r={3.5} fill="var(--white)" stroke={stroke} strokeWidth={2} />
      )}
    </svg>
  )
}

function CompareMemberRow({
  item,
  checked,
  onToggle,
  onViewAnalysis,
}: {
  item: MemberCompareSnapshot
  checked: boolean
  onToggle: (memberId: string) => void
  onViewAnalysis: (memberId: string) => void
}) {
  const handleToggle = useCallback(() => {
    onToggle(item.memberId)
  }, [item.memberId, onToggle])

  const handleView = useCallback(() => {
    onViewAnalysis(item.memberId)
  }, [item.memberId, onViewAnalysis])

  return (
    <div className="member-compare-row">
      <label className="member-compare-row-main">
        <input type="checkbox" checked={checked} onChange={handleToggle} />
        <SeriesLegendIcon item={item} />
        <span className="member-compare-row-copy">
          <Typography variant="body" as="strong">
            {item.name}
          </Typography>
          <Typography variant="label" className="muted">
            {item.dateLabel}
          </Typography>
        </span>
      </label>
      {item.canOpenAnalysis ? (
        <button type="button" className="member-compare-view-link" onClick={handleView}>
          View analysis
        </button>
      ) : null}
    </div>
  )
}

export function CompareMembersScreen() {
  const {
    roster,
    memberRecordFor,
    compareMemberIds,
    closeCompareMembers,
    selectTeamDestination,
    openMember,
    openLatestAnalysis,
  } = useAppShell()
  const [selectedIds, setSelectedIds] = useState(() =>
    compareMemberIds && compareMemberIds.length > 0
      ? compareMemberIds
      : defaultCompareSelection(roster),
  )

  const candidates = useMemo(
    () => projectCompareCandidates({ roster, recordFor: memberRecordFor }),
    [memberRecordFor, roster],
  )

  const snapshots = useMemo(
    () => projectCompareSnapshots({ roster, selectedIds, recordFor: memberRecordFor }),
    [memberRecordFor, roster, selectedIds],
  )

  const handleBack = useCallback(() => {
    closeCompareMembers()
  }, [closeCompareMembers])

  const handleChangeMembers = useCallback(() => {
    selectTeamDestination('roster')
  }, [selectTeamDestination])

  const handleToggle = useCallback((memberId: string) => {
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        if (current.length <= 1) {
          return current
        }
        return current.filter((id) => id !== memberId)
      }
      return [...current, memberId]
    })
  }, [])

  const handleAddMember = useCallback(() => {
    const nextId = nextAddableMemberId(candidates, selectedIds)
    if (!nextId) {
      return
    }
    setSelectedIds((current) => [...current, nextId])
  }, [candidates, selectedIds])

  const handleViewAnalysis = useCallback(
    (memberId: string) => {
      const member = roster.find((item) => item.id === memberId)
      if (!member) {
        return
      }
      openMember(member)
      openLatestAnalysis()
    },
    [openLatestAnalysis, openMember, roster],
  )

  const addableId = nextAddableMemberId(candidates, selectedIds)
  const subtitle =
    selectedIds.length === 1
      ? '1 member selected'
      : `${selectedIds.length} members selected`

  return (
    <div className="shell-page member-compare-page">
      <header className="member-compare-head">
        <div className="member-compare-head-copy">
          <Breadcrumbs>
            <BreadcrumbItem onSelect={handleBack}>Team overview</BreadcrumbItem>
            <BreadcrumbItem current>Compare members</BreadcrumbItem>
          </Breadcrumbs>
          <Typography variant="display" as="h1">
            Compare members
          </Typography>
          <Typography variant="muted">{subtitle}</Typography>
        </div>
        <div className="member-compare-head-actions">
          <Button variant="outline" onClick={handleChangeMembers}>
            Change members
          </Button>
        </div>
      </header>

      <div className="member-compare-layout">
        <section className="member-compare-chart-card" aria-labelledby="compare-chart-title">
          <div className="member-compare-chart-head">
            <div>
              <Typography variant="heading" as="h2" id="compare-chart-title">
                Force by neck angle
              </Typography>
              <Typography variant="label" className="muted">
                Newtons (N)
              </Typography>
            </div>
          </div>
          <div className="member-compare-radar-wrap">
            <MemberCompareRadar series={snapshots} />
          </div>
        </section>

        <aside className="member-compare-panel" aria-labelledby="compare-panel-title">
          <div className="member-compare-panel-head">
            <Typography variant="heading" as="h2" id="compare-panel-title">
              Members
            </Typography>
            <Typography variant="label" className="muted">
              {COMPARE_DIRECTION_COUNT} directions
            </Typography>
          </div>
          <div className="member-compare-panel-list">
            {snapshots.map((item) => (
              <CompareMemberRow
                key={item.memberId}
                item={item}
                checked={selectedIds.includes(item.memberId)}
                onToggle={handleToggle}
                onViewAnalysis={handleViewAnalysis}
              />
            ))}
          </div>
          <Button variant="outline" fullWidth disabled={!addableId} onClick={handleAddMember}>
            Add member
          </Button>
        </aside>
      </div>

      <section className="member-compare-stability" aria-labelledby="compare-stability-title">
        <Typography variant="heading" as="h2" id="compare-stability-title">
          Stability
        </Typography>
        <div className="member-compare-stability-row">
          {snapshots.map((item) => (
            <div key={item.memberId} className="member-compare-stability-item">
              <span
                className="member-compare-stability-dot"
                style={{ background: item.style.stroke }}
                aria-hidden="true"
              />
              <Typography variant="body" as="strong">
                {item.name}
              </Typography>
              <Typography variant="metricCompact">{item.stabilityPercent}%</Typography>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
