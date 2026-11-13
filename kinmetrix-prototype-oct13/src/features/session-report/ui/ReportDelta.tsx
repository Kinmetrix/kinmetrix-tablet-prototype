import type { FormattedDelta } from '../model/sessionReportTypes'

type Props = {
  delta: FormattedDelta
}

export function ReportDelta({ delta }: Props) {
  const toneClass =
    delta.tone === 'up' ? 'up' : delta.tone === 'down' ? 'down' : ''
  return <span className={`delta ${toneClass}`.trim()}>{delta.text}</span>
}
