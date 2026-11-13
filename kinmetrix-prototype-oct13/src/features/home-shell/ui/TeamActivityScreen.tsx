import { useCallback } from 'react'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useAppShell } from './AppShellContext'
import { TeamActivityFeed } from './TeamActivityFeed'

export function TeamActivityScreen() {
  const { teamOverview, roster, openMember } = useAppShell()

  const handleOpenMember = useCallback(
    (memberId: string) => {
      const member = roster.find((entry) => entry.id === memberId)
      if (member) {
        openMember(member)
      }
    },
    [openMember, roster],
  )

  const { items } = teamOverview.activity

  return (
    <div className="shell-page team-activity-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Activity
        </Typography>
        <Typography variant="muted">
          Recent completions across the roster. Open a row to view that member.
        </Typography>
      </header>
      <TeamActivityFeed
        items={items}
        onOpenMember={handleOpenMember}
        scrollClassName="team-activity-page-scroll"
      />
    </div>
  )
}
