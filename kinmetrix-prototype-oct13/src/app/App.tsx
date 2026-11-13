import { TabletAppScreen } from './TabletAppScreen'
import '../shared/primitives/tokens.css'
import '../shared/primitives/typography/typography.css'
import '../shared/primitives/buttons/buttons.css'
import '../shared/primitives/form/field.css'
import '../shared/primitives/form/segmented.css'
import '../shared/primitives/feedback/toast.css'
import '../shared/primitives/feedback/empty-state.css'
import '../shared/primitives/feedback/callout.css'
import '../shared/primitives/avatar/participant-avatar.css'
import '../shared/primitives/overlay/sheet.css'
import '../shared/primitives/breadcrumbs/breadcrumbs.css'
import '../features/home-shell/styles/home-shell.css'
import '../features/home-shell/styles/kiosk-sign-in.css'
import '../features/session-report/styles/session-report.css'

function App() {
  return (
    <div className="session-report-host">
      <TabletAppScreen />
    </div>
  )
}

export default App
