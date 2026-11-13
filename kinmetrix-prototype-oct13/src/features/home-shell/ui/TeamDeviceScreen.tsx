import { Typography } from '../../../shared/primitives/typography/Typography'
import { useAppShell } from './AppShellContext'

export function TeamDeviceScreen() {
  const { deviceStatus } = useAppShell()
  const nextStep = deviceStatus.connected
    ? 'Calibrate Arc before the next session.'
    : 'Connect Arc, then calibrate it.'

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Device
        </Typography>
        <Typography variant="muted">{deviceStatus.summary}</Typography>
      </header>
      <Typography variant="body">{nextStep}</Typography>
    </div>
  )
}
