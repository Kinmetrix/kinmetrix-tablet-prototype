import { sessionContextTagLabel } from '../model/sessionContextModel'
import { formatPlanSummary } from '../model/sessionReportModel'
import type { SessionReportState } from '../model/sessionReportTypes'
import { Typography } from '../../../shared/primitives/typography/Typography'

type Props = {
  state: SessionReportState
  variant?: 'print' | 'preview'
}

export function ReportTakeHomeSummary({ state, variant = 'print' }: Props) {
  const planLine = formatPlanSummary(state.plan)
  const tagLabel =
    state.sessionContextTag === 'unset'
      ? null
      : sessionContextTagLabel(state.sessionContextTag)
  const note = state.note.trim()
  const hasSessionContext = Boolean(tagLabel || note)

  if (variant === 'print') {
    return (
      <>
        <h2>Recommended schedule</h2>
        <p>{planLine}</p>
        {hasSessionContext ? (
          <>
            <h2>About this session</h2>
            {tagLabel ? <p>How you felt: {tagLabel}</p> : null}
            {note ? <p>{note}</p> : null}
          </>
        ) : null}
      </>
    )
  }

  return (
    <div className="export-print-preview">
      <Typography variant="heading">Included when you print</Typography>
      <Typography variant="label" className="small muted">
        Recommended schedule
      </Typography>
      <Typography variant="muted">{planLine}</Typography>
      {hasSessionContext ? (
        <>
          <Typography variant="label" className="small muted">
            About this session
          </Typography>
          {tagLabel ? (
            <Typography variant="muted">How you felt: {tagLabel}</Typography>
          ) : null}
          {note ? <Typography variant="muted">{note}</Typography> : null}
        </>
      ) : (
        <Typography variant="helper">No session note or feeling tag saved yet.</Typography>
      )}
    </div>
  )
}
