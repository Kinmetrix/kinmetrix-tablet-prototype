import { useCallback } from 'react'
import { ParticipantAvatar } from '../../../shared/primitives/avatar/ParticipantAvatar'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import {
  compareOptions,
  getOverviewHeading,
  isCompareDisabled,
  participantSummary,
} from '../model/sessionReportModel'
import type { CompareWith } from '../model/sessionReportTypes'

type Props = {
  title?: string
  subtitle?: string
}

export function ReportIntroSection({ title, subtitle }: Props) {
  const { state, setCompare } = useSessionReport()
  const [defaultTitle, defaultSubtitle] = getOverviewHeading(state)
  const heading = title ?? defaultTitle
  const lead = subtitle ?? defaultSubtitle
  const purposeLabel =
    state.purpose === 'assessment' ? 'Assessment' : 'Strength session'
  const methodLabel = state.method === 'isometric' ? 'Isometric' : 'Isokinetic'
  const participant = participantSummary()
  const options = compareOptions()

  const handleCompareChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setCompare(event.target.value as CompareWith)
    },
    [setCompare],
  )

  return (
    <section
      className="intro personal-section"
      aria-label={`${participant.name}’s personal session summary`}
    >
      <div className="personal-copy">
        <ParticipantAvatar aria-hidden="true" title="Illustrative profile photo">
          <span>{participant.initials}</span>
        </ParticipantAvatar>
        <div className="personal-story">
          <div className="personal-identity">
            <Typography variant="title" as="strong" className="participant-name">
              {participant.name}
            </Typography>
            <Typography variant="label" as="span" className="participant-session">
              {participant.sessionDateLabel} · {purposeLabel}
            </Typography>
          </div>
          <Typography variant="display">{heading}</Typography>
          <Typography variant="muted">{lead}</Typography>
        </div>
      </div>
      <div className="report-context">
        <label className="compare" htmlFor="compare">
          Compare with
          <select
            id="compare"
            aria-label="Compare results with"
            disabled={isCompareDisabled(state)}
            value={isCompareDisabled(state) ? 'baseline' : state.compare}
            onChange={handleCompareChange}
          >
            {isCompareDisabled(state) ? (
              <option>No earlier assessment</option>
            ) : (
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="session-meta">
          <strong>
            {participant.sessionDateLabel} · {purposeLabel}
          </strong>
          {methodLabel} · {state.count} directions · {state.reps} reps / direction
        </div>
      </div>
    </section>
  )
}
