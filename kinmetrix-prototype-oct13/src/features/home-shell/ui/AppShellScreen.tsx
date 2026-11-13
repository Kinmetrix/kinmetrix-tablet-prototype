import { useCallback } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { classNames } from '../../../shared/primitives/classNames'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { AppSidebar } from './AppSidebar'
import { useAppShell } from './AppShellContext'
import { ShellNavIcon } from './ShellNavIcon'
import { AnalysisHistoryScreen } from './AnalysisHistoryScreen'
import { ExerciseStartScreen } from './ExerciseStartScreen'
import { MemberHomeScreen } from './MemberHomeScreen'
import { TeamDeviceScreen } from './TeamDeviceScreen'
import { TeamActivityScreen } from './TeamActivityScreen'
import { TeamOverviewScreen } from './TeamOverviewScreen'
import { CompareMembersScreen } from './CompareMembersScreen'
import { TeamRosterScreen } from './TeamRosterScreen'
import { TeamSettingsScreen } from './TeamSettingsScreen'
import { TeamTemplatesScreen } from './TeamTemplatesScreen'
import { KioskSignInScreen } from './KioskSignInScreen'

export function AppShellScreen() {
  const { workspaceMode, shellDestination, teamCanvas } = useAppShell()

  if (workspaceMode === 'kiosk') {
    return <KioskSignInScreen />
  }

  let canvas
  if (workspaceMode === 'team') {
    switch (teamCanvas.kind) {
      case 'overview':
        canvas = <TeamOverviewScreen />
        break
      case 'activity':
        canvas = <TeamActivityScreen />
        break
      case 'roster':
        canvas = <TeamRosterScreen />
        break
      case 'compare':
        canvas = <CompareMembersScreen />
        break
      case 'templates':
        canvas = <TeamTemplatesScreen />
        break
      case 'settings':
        canvas = <TeamSettingsScreen />
        break
      case 'device':
        canvas = <TeamDeviceScreen />
        break
    }
  } else {
    switch (shellDestination) {
      case 'history':
        canvas = <AnalysisHistoryScreen />
        break
      case 'start':
        canvas = <ExerciseStartScreen />
        break
      case 'device':
        canvas = <TeamDeviceScreen />
        break
      default:
        canvas = <MemberHomeScreen />
    }
  }

  const compareFullScreen = workspaceMode === 'team' && teamCanvas.kind === 'compare'

  return (
    <div className={classNames('app-shell', compareFullScreen && 'app-shell--compare-full')}>
      {workspaceMode === 'member' ? <MemberShellHeader /> : null}
      <div className="app-shell-body">
        {compareFullScreen ? null : <AppSidebar />}
        <div className="app-shell-canvas">
          <main className="app-shell-main" tabIndex={-1}>
            {canvas}
          </main>
        </div>
      </div>
    </div>
  )
}

function initialsFor(name: string): string {
  const parts = name.split(' ').filter((part) => part.length > 0)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

function MemberShellHeader() {
  const { teamName, deviceStatus, memberEntry, shellDestination, signOut, selectMemberDestination } =
    useAppShell()

  const handleBack = useCallback(() => {
    signOut()
  }, [signOut])

  const handleDevice = useCallback(() => {
    selectMemberDestination('device')
  }, [selectMemberDestination])

  const onDevice = shellDestination === 'device'
  const backLabel = memberEntry === 'roster' ? 'Back to roster' : 'Back to kiosk'

  return (
    <header className="member-shell-header">
      <div className="member-shell-header-team">
        <span className="team-mark" aria-hidden="true">
          <Typography variant="label">{initialsFor(teamName)}</Typography>
        </span>
        <Typography variant="body" as="span" className="team-switcher-name">
          {teamName}
        </Typography>
      </div>
      <Button
        variant="outline"
        className={classNames('member-shell-device', deviceStatus.connected && 'is-connected')}
        aria-current={onDevice ? 'page' : undefined}
        onClick={handleDevice}
      >
        <ShellNavIcon name="device" />
        {deviceStatus.navLabel}
      </Button>
      <Button variant="outline" onClick={handleBack}>
        {backLabel}
      </Button>
    </header>
  )
}
