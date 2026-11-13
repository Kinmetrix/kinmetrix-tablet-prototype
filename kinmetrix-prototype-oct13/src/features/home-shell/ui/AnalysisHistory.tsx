import { Typography } from '../../../shared/primitives/typography/Typography'
import type { AnalysisSummary } from '../model/appShellTypes'

type Props = {
  analyses: AnalysisSummary[]
}

export function AnalysisHistory({ analyses }: Props) {
  if (analyses.length === 0) {
    return <Typography variant="helper">No strength analyses yet.</Typography>
  }

  return (
    <ul className="home-lines">
      {analyses.map((analysis) => (
        <li key={analysis.id} className="home-line">
          <Typography variant="body" as="strong">
            {analysis.kindLabel}
          </Typography>
          <Typography variant="muted">{analysis.dateLabel}</Typography>
          <Typography variant="muted">Symmetry {analysis.symmetry}</Typography>
          <Typography variant="muted">Weight {analysis.stableWeight}</Typography>
        </li>
      ))}
    </ul>
  )
}
