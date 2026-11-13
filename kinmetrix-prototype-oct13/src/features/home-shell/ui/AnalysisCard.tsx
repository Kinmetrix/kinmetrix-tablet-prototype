import { useCallback } from 'react'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { Typography } from '../../../shared/primitives/typography/Typography'
import type { AnalysisSummary } from '../model/appShellTypes'

type Props = {
  analysis: AnalysisSummary | undefined
  onOpen: () => void
}

export function AnalysisCard({ analysis, onOpen }: Props) {
  const handleOpen = useCallback(() => {
    onOpen()
  }, [onOpen])

  return (
    <aside className="symmetry-panel" aria-label="Latest analysis">
      <div className="section-head">
        <Typography variant="heading" as="h2">
          Latest analysis
        </Typography>
      </div>
      {analysis ? (
        <>
          <Typography variant="body" as="strong">
            {analysis.kindLabel}
          </Typography>
          <Typography variant="muted">{analysis.dateLabel}</Typography>
          {analysis.note ? <Typography variant="muted">{analysis.note}</Typography> : null}
          {analysis.openable ? (
            <TextLink onClick={handleOpen}>View latest analysis</TextLink>
          ) : (
            <Typography variant="helper">Report detail is not in this prototype.</Typography>
          )}
        </>
      ) : (
        <Typography variant="helper">No analyzed session yet.</Typography>
      )}
    </aside>
  )
}
