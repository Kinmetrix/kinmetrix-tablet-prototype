import { useCallback, useMemo } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Field, FieldGrid } from '../../../shared/primitives/form/Field'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import { ReportIcon } from './ReportIcon'

const CLIENTS = ['Jordan Hale', 'Alex Morgan', 'Sam Bennett']

export function HandoffScreen() {
  const {
    state,
    toggleClientPicker,
    setClientSearch,
    selectClient,
    setNextSessionField,
    submitNextSession,
    editNextSession,
  } = useSessionReport()

  const filteredClients = useMemo(() => {
    const query = state.clientSearch.trim().toLowerCase()
    if (!query) {
      return CLIENTS
    }
    return CLIENTS.filter((name) => name.toLowerCase().includes(query))
  }, [state.clientSearch])

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setClientSearch(event.target.value)
    },
    [setClientSearch],
  )

  const handlePurposeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setNextSessionField('nextPurpose', event.target.value)
    },
    [setNextSessionField],
  )

  const handleMethodChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setNextSessionField('nextMethod', event.target.value)
    },
    [setNextSessionField],
  )

  const handleCountChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setNextSessionField('nextCount', event.target.value)
    },
    [setNextSessionField],
  )

  const handleSubmitNext = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      submitNextSession()
    },
    [submitNextSession],
  )

  const clientBlurb =
    state.nextClient === 'Jordan Hale'
      ? `Current client · Just completed ${
          state.purpose === 'assessment' ? 'an assessment' : 'a strength session'
        }`
      : 'Selected client · Example profile'

  return (
    <div className="page">
      <div className="session-home">
        <Typography variant="display">Ready for what’s next.</Typography>
        <Typography variant="muted">
          Jordan’s report review is complete. Continue with this client or choose someone else.
        </Typography>
        <div className="handoff-grid">
          <section className="handoff-client">
            <Typography variant="title">{state.nextClient}</Typography>
            <Typography variant="muted">{clientBlurb}</Typography>
            <Button variant="outline" onClick={toggleClientPicker}>
              Choose another client <ReportIcon name="arrow" />
            </Button>
            {state.pickingClient ? (
              <div className="client-search">
                <Field label="Find a client">
                  <input
                    id="client-search"
                    type="search"
                    placeholder="Search by name"
                    autoComplete="off"
                    value={state.clientSearch}
                    onChange={handleSearchChange}
                  />
                </Field>
                <div className="client-list">
                  {filteredClients.map((name) => {
                    const handleSelect = () => selectClient(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        className="client-choice"
                        onClick={handleSelect}
                      >
                        <div>
                          <Typography variant="body" as="strong">
                            {name}
                          </Typography>
                          <Typography variant="label" as="span">
                            Example client
                          </Typography>
                        </div>
                        <ReportIcon name="chevron" />
                      </button>
                    )
                  })}
                </div>
                {filteredClients.length === 0 ? (
                  <Typography variant="helper">No matching clients.</Typography>
                ) : null}
              </div>
            ) : null}
          </section>
          <section className="handoff-form">
            <Typography variant="title">
              {state.nextReady ? 'Your next session' : 'Another session'}
            </Typography>
            {state.nextReady ? (
              <div className="ready-message">
                <Typography variant="heading" as="strong">
                  {state.nextPurpose === 'assessment' ? 'Assessment' : 'Strength session'} ready
                  for {state.nextClient.split(' ')[0]}.
                </Typography>
                <Typography variant="muted">
                  {state.nextMethod === 'isometric' ? 'Isometric' : 'Isokinetic'} ·{' '}
                  {state.nextCount} directions
                </Typography>
                <Typography variant="muted">
                  In the full app, this continues to device setup. This prototype ends at the
                  report handoff.
                </Typography>
                <Button variant="outline" onClick={editNextSession}>
                  Back to session choices
                </Button>
              </div>
            ) : (
              <form id="next-session-form" onSubmit={handleSubmitNext}>
                <Field label="Session type">
                  <select name="purpose" value={state.nextPurpose} onChange={handlePurposeChange}>
                    <option value="assessment">Assessment</option>
                    <option value="training">Strength session</option>
                  </select>
                </Field>
                <FieldGrid>
                  <Field label="Exercise">
                    <select name="method" value={state.nextMethod} onChange={handleMethodChange}>
                      <option value="isometric">Isometric</option>
                      <option value="isokinetic">Isokinetic</option>
                    </select>
                  </Field>
                  <Field label="Directions">
                    <select name="count" value={state.nextCount} onChange={handleCountChange}>
                      <option value="8">8 directions</option>
                      <option value="4">4 directions</option>
                    </select>
                  </Field>
                </FieldGrid>
                <Button type="submit">
                  Continue to session <ReportIcon name="arrow" />
                </Button>
                <Typography variant="helper">
                  Example navigation. No device session will start.
                </Typography>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
