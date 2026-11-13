import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Field } from '../../../shared/primitives/form/Field'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { SESSION_CONTEXT_TAG_OPTIONS } from '../model/sessionContextModel'
import type { SessionContextTag } from '../model/sessionReportTypes'
import { useSessionReport } from './SessionReportContext'

export function SessionContextSection() {
  const { state, saveSessionContext } = useSessionReport()
  const [note, setNote] = useState(state.note)
  const [tag, setTag] = useState<SessionContextTag>(state.sessionContextTag)

  useEffect(() => {
    setNote(state.note)
    setTag(state.sessionContextTag)
  }, [state.note, state.sessionContextTag])

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      saveSessionContext({ note, sessionContextTag: tag })
    },
    [note, saveSessionContext, tag],
  )

  const handleTagChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTag(event.target.value as SessionContextTag)
  }, [])

  const handleNoteChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(event.target.value)
  }, [])

  return (
    <section className="session-context secondary-section" aria-labelledby="session-context-title">
      <Typography variant="heading" id="session-context-title">
        About this session
      </Typography>
      <Typography variant="muted">
        Tag how you felt today and add a short note for your records. In the future, Kinmetrix can
        compare results from sessions with the same tag.
      </Typography>
      <form className="session-context-form" onSubmit={handleSubmit}>
        <Field label="How you felt">
          <select name="sessionContextTag" value={tag} onChange={handleTagChange}>
            {SESSION_CONTEXT_TAG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Session note">
          <textarea
            name="sessionNote"
            value={note}
            onChange={handleNoteChange}
            placeholder="Optional context from today’s visit…"
            rows={3}
          />
        </Field>
        <Button type="submit" variant="outline">
          Save session note
        </Button>
      </form>
    </section>
  )
}
