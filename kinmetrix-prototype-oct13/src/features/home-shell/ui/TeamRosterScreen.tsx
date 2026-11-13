import { useCallback, useMemo, useState } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { defaultCompareSelection, isCompareEligible } from '../model/memberCompareModel'
import { useAppShell } from './AppShellContext'
import type { RosterMember } from '../model/appShellTypes'

function RosterRow({
  member,
  compareEligible,
  selected,
  onToggleSelect,
}: {
  member: RosterMember
  compareEligible: boolean
  selected: boolean
  onToggleSelect: (memberId: string) => void
}) {
  const { openMember } = useAppShell()

  const handleOpen = useCallback(() => {
    openMember(member)
  }, [member, openMember])

  const handleToggle = useCallback(() => {
    onToggleSelect(member.id)
  }, [member.id, onToggleSelect])

  return (
    <tr className={selected ? 'is-selected' : undefined}>
      <td className="roster-select-cell">
        {compareEligible ? (
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Include ${member.name} in comparison`}
            onChange={handleToggle}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
      </td>
      <td>
        <button type="button" className="roster-name-btn" onClick={handleOpen}>
          <Typography variant="body" as="strong">
            {member.name}
          </Typography>
        </button>
      </td>
      <td>
        <Typography variant="label" className="muted">
          {member.lastAnalysisLabel}
        </Typography>
      </td>
      <td>
        <Typography variant="body" as="strong" className="numeric">
          {member.strengthScore}
        </Typography>
      </td>
      <td>
        <Typography variant="label" className={member.waiverSigned ? 'waiver-ok' : 'waiver-pending'}>
          {member.waiverSigned ? 'Signed' : 'Needed'}
        </Typography>
      </td>
    </tr>
  )
}

export function TeamRosterScreen() {
  const { roster, memberRecordFor, openCompareMembers } = useAppShell()
  const [selectedIds, setSelectedIds] = useState(() => defaultCompareSelection(roster))

  const eligibility = useMemo(
    () =>
      new Map(
        roster.map((member) => [member.id, isCompareEligible(member.id, memberRecordFor(member.id))]),
      ),
    [memberRecordFor, roster],
  )

  const compareCount = selectedIds.length

  const handleToggleSelect = useCallback((memberId: string) => {
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId)
      }
      return [...current, memberId]
    })
  }, [])

  const handleCompare = useCallback(() => {
    if (selectedIds.length < 2) {
      return
    }
    openCompareMembers(selectedIds)
  }, [openCompareMembers, selectedIds])

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Roster
        </Typography>
        <Typography variant="muted">Select members to compare, or tap a name to open their home.</Typography>
      </header>
      <section className="members-section" aria-label="Members">
        <div className="roster-table-actions">
          <Button disabled={compareCount < 2} onClick={handleCompare}>
            Compare ({compareCount})
          </Button>
        </div>
        <div className="table-wrap roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th scope="col" className="roster-select-cell" aria-label="Compare">
                  {' '}
                </th>
                <th scope="col">Member</th>
                <th scope="col">Latest analysis</th>
                <th scope="col">Strength</th>
                <th scope="col">Waiver</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((member) => (
                <RosterRow
                  key={member.id}
                  member={member}
                  compareEligible={eligibility.get(member.id) ?? false}
                  selected={selectedIds.includes(member.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
