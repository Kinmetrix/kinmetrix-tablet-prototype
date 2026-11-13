import { useCallback, useState } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Callout } from '../../../shared/primitives/feedback/Callout'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useAppShell } from './AppShellContext'
import type { TeamAccount } from '../model/appShellTypes'
import {
  TEAM_WORKSPACE_CATALOG,
  TEAM_WORKSPACE_CHROME,
  teamNavHighlightsDestination,
} from '../model/teamWorkspaceCatalog'
import { ShellDeviceNavItem } from './ShellDeviceNavItem'
import { ShellChevron } from './ShellNavIcon'
import { ShellNavLeaf } from './ShellNavItem'

type SidebarMenu = 'teams' | null

function initialsFor(name: string): string {
  const parts = name.split(' ').filter((part) => part.length > 0)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

function TeamSwitchOption({
  team,
  selected,
  onSelect,
}: {
  team: TeamAccount
  selected: boolean
  onSelect: (teamId: string) => void
}) {
  const handleSelect = useCallback(() => {
    onSelect(team.id)
  }, [onSelect, team.id])

  return (
    <li role="presentation">
      <button
        type="button"
        className="team-menu-option"
        role="option"
        aria-selected={selected}
        onClick={handleSelect}
      >
        <span className="team-mark">
          <Typography variant="label">{initialsFor(team.name)}</Typography>
        </span>
        <Typography variant="body" as="span" className="team-menu-option-name">
          {team.name}
        </Typography>
        {selected ? <Typography variant="label">Current</Typography> : null}
      </button>
    </li>
  )
}

function TeamSwitcher() {
  const { teams, teamName, selectTeam } = useAppShell()
  const [menu, setMenu] = useState<SidebarMenu>(null)

  const handleOpenTeams = useCallback(() => {
    setMenu((current) => (current === 'teams' ? null : 'teams'))
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenu(null)
  }, [])

  const handleSelectTeam = useCallback(
    (teamId: string) => {
      selectTeam(teamId)
      setMenu(null)
    },
    [selectTeam],
  )

  return (
    <>
      {menu ? (
        <button type="button" className="team-menu-backdrop" aria-label="Close menu" onClick={handleCloseMenu} />
      ) : null}
      <div className="team-switcher-wrap">
        <button
          type="button"
          className="team-switcher"
          aria-haspopup="listbox"
          aria-expanded={menu === 'teams'}
          aria-label={`Current team, ${teamName}`}
          onClick={handleOpenTeams}
        >
          <span className="team-mark">
            <Typography variant="label">{initialsFor(teamName)}</Typography>
          </span>
          <Typography variant="body" as="span" className="team-switcher-name">
            {teamName}
          </Typography>
          <ShellChevron />
        </button>
        {menu === 'teams' ? (
          <ul className="team-menu" role="listbox" aria-label="Teams">
            {teams.map((team) => (
              <TeamSwitchOption
                key={team.id}
                team={team}
                selected={team.name === teamName}
                onSelect={handleSelectTeam}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}

export function TeamSidebar() {
  const { deviceStatus, teamDestination, selectTeamDestination } = useAppShell()
  const [helpOpen, setHelpOpen] = useState(false)

  const handleShowHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])

  const handleCloseHelp = useCallback(() => {
    setHelpOpen(false)
  }, [])

  const handleDevice = useCallback(() => {
    selectTeamDestination('device')
  }, [selectTeamDestination])

  return (
    <aside className="app-sidebar team-sidebar">
      <TeamSwitcher />
      <nav className="shell-nav" aria-label="App sections">
        {TEAM_WORKSPACE_CATALOG.nav.map((entry) =>
          entry.destination === 'device' ? (
            <ShellDeviceNavItem
              key={entry.destination}
              label={entry.label}
              icon={entry.icon}
              active={teamDestination === entry.destination}
              status={deviceStatus.navLabel}
              onSelect={handleDevice}
            />
          ) : (
            <ShellNavLeaf
              key={entry.destination}
              destination={entry.destination}
              label={entry.label}
              icon={entry.icon}
              active={teamNavHighlightsDestination(teamDestination, entry.destination)}
              onSelect={selectTeamDestination}
            />
          ),
        )}
      </nav>
      <div className="team-sidebar-footer">
        {helpOpen ? (
          <Callout>
            <Typography variant="body">{TEAM_WORKSPACE_CHROME.helpBody}</Typography>
            <Button variant="outline" fullWidth onClick={handleCloseHelp}>
              Close
            </Button>
          </Callout>
        ) : (
          <Button variant="outline" fullWidth onClick={handleShowHelp}>
            {TEAM_WORKSPACE_CHROME.helpLabel}
          </Button>
        )}
      </div>
    </aside>
  )
}
