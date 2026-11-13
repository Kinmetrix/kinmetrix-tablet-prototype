import { useCallback, useEffect } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Field, FieldGrid } from '../../../shared/primitives/form/Field'
import { IconButton } from '../../../shared/primitives/buttons/IconButton'
import { Sheet, SheetActions, SheetContent, SheetHead } from '../../../shared/primitives/overlay/Sheet'
import { TextLink } from '../../../shared/primitives/buttons/TextLink'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import type { PreviewSettingsInput } from '../hooks/useSessionReportController'
import {
  directionName,
  formatForce,
  formatSymmetryBand,
  getCurrentForces,
  getCurrentStability,
  getPairRatio,
  getReferenceForces,
  getReferenceName,
  getSymmetryPairs,
  getSymmetryResult,
  getUnitLabel,
  participantSummary,
} from '../model/sessionReportModel'
import { PLAN_SMART_SESSION_TEMPLATES } from '../model/planSmartSessionTemplates'
import { DirectionSheetBody } from './DirectionSheetBody'
import { ReportIcon } from './ReportIcon'
import { ReportTakeHomeSummary } from './ReportTakeHomeSummary'

const SYMMETRY_SOURCE =
  'https://valdperformance.com/news/neck-coupling-strength-in-mma-testing-what-matters'

function sheetTitle(state: ReturnType<typeof useSessionReport>['state']): string {
  switch (state.sheet.kind) {
    case 'definitions':
      return 'Understanding the results'
    case 'export':
      return 'Print or export'
    case 'preview':
      return 'Prototype settings'
    case 'plan':
      return 'Plan your next visit'
    case 'balance':
      return 'Symmetry target ranges'
    case 'symmetry-pair': {
      const pair = getSymmetryPairs(state)[state.sheet.pairIndex ?? 0]
      return pair ? `Symmetry · ${pair.label}` : 'Symmetry'
    }
    case 'direction':
      return `${directionName(state.selected)} · ${state.selected * 45}°`
    default:
      return ''
  }
}

export function ReportSheetDialog() {
  const controller = useSessionReport()
  const {
    state,
    sheetDialogRef,
    closeSheet,
    expandDirectionSheet,
    setView,
    openSheet,
    openDirectionSheet,
    applyPreviewSettings,
    savePlan,
    applySymmetrySettings,
    resetPrototype,
    printReport,
    downloadCsv,
  } = controller

  const kind = state.sheet.kind
  const isDirection = kind === 'direction'
  const isPlan = kind === 'plan'

  useEffect(() => {
    if (kind !== 'closed' && sheetDialogRef.current && !sheetDialogRef.current.open) {
      sheetDialogRef.current.showModal()
    }
  }, [kind, sheetDialogRef])

  const handleClose = useCallback(() => closeSheet(), [closeSheet])
  const handleExpand = useCallback(() => expandDirectionSheet(), [expandDirectionSheet])

  const handleDialogClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      const dialog = event.currentTarget
      const rect = dialog.getBoundingClientRect()
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      if (outside) {
        closeSheet()
      }
    },
    [closeSheet],
  )

  if (kind === 'closed') {
    return (
      <Sheet ref={sheetDialogRef} id="sheet" aria-labelledby="sheet-title" hidden />
    )
  }

  return (
    <Sheet
      ref={sheetDialogRef}
      id="sheet"
      aria-labelledby="sheet-title"
      className={isDirection ? 'direction-sheet' : isPlan ? 'plan-sheet' : undefined}
      data-kind={kind}
      onClick={handleDialogClick}
    >
      <SheetHead>
        <Typography variant="title" id="sheet-title">
          {sheetTitle(state)}
        </Typography>
        <SheetActions>
          {isDirection ? (
            <IconButton
              aria-label="Open direction in full view"
              title="Full view"
              onClick={handleExpand}
            >
              <ReportIcon name="expand" />
            </IconButton>
          ) : null}
          <IconButton aria-label="Close panel" onClick={handleClose}>
            <ReportIcon name="close" />
          </IconButton>
        </SheetActions>
      </SheetHead>
      <SheetContent>
        <SheetBody
          state={state}
          openSheet={openSheet}
          openDirectionSheet={openDirectionSheet}
          applyPreviewSettings={applyPreviewSettings}
          savePlan={savePlan}
          applySymmetrySettings={applySymmetrySettings}
          resetPrototype={resetPrototype}
          printReport={printReport}
          downloadCsv={downloadCsv}
          setView={setView}
          closeSheet={closeSheet}
        />
      </SheetContent>
    </Sheet>
  )
}

type SheetBodyProps = {
  state: ReturnType<typeof useSessionReport>['state']
  openSheet: ReturnType<typeof useSessionReport>['openSheet']
  openDirectionSheet: ReturnType<typeof useSessionReport>['openDirectionSheet']
  applyPreviewSettings: ReturnType<typeof useSessionReport>['applyPreviewSettings']
  savePlan: ReturnType<typeof useSessionReport>['savePlan']
  applySymmetrySettings: ReturnType<typeof useSessionReport>['applySymmetrySettings']
  resetPrototype: ReturnType<typeof useSessionReport>['resetPrototype']
  printReport: ReturnType<typeof useSessionReport>['printReport']
  downloadCsv: ReturnType<typeof useSessionReport>['downloadCsv']
  setView: ReturnType<typeof useSessionReport>['setView']
  closeSheet: ReturnType<typeof useSessionReport>['closeSheet']
}

function SheetBody(props: SheetBodyProps) {
  const { state } = props

  switch (state.sheet.kind) {
    case 'direction':
      return <DirectionSheetBody />
    case 'definitions':
      return <DefinitionsBody />
    case 'export':
      return (
        <ExportBody
          state={state}
          printReport={props.printReport}
          downloadCsv={props.downloadCsv}
          openSheet={props.openSheet}
          setView={props.setView}
          closeSheet={props.closeSheet}
        />
      )
    case 'preview':
      return (
        <PreviewBody
          state={state}
          applyPreviewSettings={props.applyPreviewSettings}
          resetPrototype={props.resetPrototype}
        />
      )
    case 'plan':
      return (
        <PlanBody state={state} savePlan={props.savePlan} />
      )
    case 'balance':
      return (
        <BalanceBody state={state} applySymmetrySettings={props.applySymmetrySettings} />
      )
    case 'symmetry-pair':
      return (
        <SymmetryPairBody
          state={state}
          openSheet={props.openSheet}
          openDirectionSheet={props.openDirectionSheet}
        />
      )
    default:
      return null
  }
}

function DefinitionsBody() {
  return (
    <>
      <Typography variant="heading">Average peak force</Typography>
      <Typography variant="muted">
        Take the highest force in each repetition, then average those peaks. The session result
        includes every recorded rep; direction results include only that direction’s reps.
      </Typography>
      <Typography variant="heading">Stability</Typography>
      <Typography variant="muted">
        How smoothly and consistently the exercise was performed. The example scores illustrate
        the interface; the device’s actual calculation will supply this value.
      </Typography>
      <Typography variant="heading">Symmetry</Typography>
      <Typography variant="muted">
        Force ratios between direction pairs, compared with configured target ratios when
        available.
      </Typography>
    </>
  )
}

function ExportBody({
  state,
  printReport,
  downloadCsv,
  openSheet,
  setView,
  closeSheet,
}: {
  state: SheetBodyProps['state']
  printReport: () => void
  downloadCsv: () => void
  openSheet: SheetBodyProps['openSheet']
  setView: SheetBodyProps['setView']
  closeSheet: SheetBodyProps['closeSheet']
}) {
  const handleReviewPlan = useCallback(() => {
    openSheet('plan')
  }, [openSheet])

  const handleSessionNote = useCallback(() => {
    closeSheet()
    setView('overview')
  }, [closeSheet, setView])

  return (
    <>
      <Typography variant="muted">
        Printing opens the Overview results plus the take-home block below. Measurements download
        is separate.
      </Typography>
      <ReportTakeHomeSummary state={state} variant="preview" />
      <TextLink onClick={handleReviewPlan}>
        Edit recommended schedule <ReportIcon name="chevron" />
      </TextLink>
      <TextLink onClick={handleSessionNote}>
        Add session note on Overview <ReportIcon name="chevron" />
      </TextLink>
      <Button fullWidth onClick={printReport}>
        <ReportIcon name="print" /> Print / save PDF
      </Button>
      <Button variant="outline" fullWidth onClick={downloadCsv}>
        <ReportIcon name="download" /> Download measurements
      </Button>
    </>
  )
}

function PreviewBody({
  state,
  applyPreviewSettings,
  resetPrototype,
}: {
  state: SheetBodyProps['state']
  applyPreviewSettings: SheetBodyProps['applyPreviewSettings']
  resetPrototype: SheetBodyProps['resetPrototype']
}) {
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const input: PreviewSettingsInput = {
        count: Number(data.get('count')) as 4 | 8,
        unit: String(data.get('unit')) as 'lb' | 'kg',
        reps: Number(data.get('reps')),
        method: String(data.get('method')) as 'isometric' | 'isokinetic',
        purpose: String(data.get('purpose')) as 'assessment' | 'training',
        scenario: String(data.get('scenario')) as SheetBodyProps['state']['scenario'],
      }
      applyPreviewSettings(input)
    },
    [applyPreviewSettings],
  )

  return (
    <>
      <Typography variant="muted">
        Explore the same report in different situations. All names, measurements and recordings
        are example data.
      </Typography>
      <form id="preview-form" onSubmit={handleSubmit}>
        <FieldGrid>
          <Field label="Directions">
            <select name="count" defaultValue={state.count}>
              <option value="8">8 directions</option>
              <option value="4">4 directions</option>
            </select>
          </Field>
          <Field label="Force units">
            <select name="unit" defaultValue={state.unit}>
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </Field>
        </FieldGrid>
        <Field label="Recorded reps per direction">
          <select name="reps" defaultValue={state.reps}>
            {[4, 8, 12].map((value) => (
              <option key={value} value={value}>
                {value} reps
              </option>
            ))}
          </select>
        </Field>
        <Field label="Exercise method">
          <select name="method" defaultValue={state.method}>
            <option value="isometric">Isometric · hold at 3°</option>
            <option value="isokinetic">Isokinetic · move from 3° to 35°</option>
          </select>
        </Field>
        <Field label="Session purpose">
          <select name="purpose" defaultValue={state.purpose}>
            <option value="assessment">Assessment</option>
            <option value="training">Strength training</option>
          </select>
        </Field>
        <Field label="Result scenario">
          <select name="scenario" defaultValue={state.scenario}>
            <option value="improving">Improving strength</option>
            <option value="steady">Little change</option>
            <option value="lower">Lower strength</option>
            <option value="first">First assessment</option>
          </select>
        </Field>
        <Button fullWidth type="submit">
          Apply to prototype <ReportIcon name="check" />
        </Button>
      </form>
      <TextLink onClick={resetPrototype}>Reset example data and plan</TextLink>
    </>
  )
}

function PlanBody({
  state,
  savePlan,
}: {
  state: SheetBodyProps['state']
  savePlan: SheetBodyProps['savePlan']
}) {
  const participant = participantSummary()
  const firstName = participant.name.split(' ')[0] ?? participant.name

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      savePlan({
        frequency: Number(data.get('frequency')),
        weeks: Number(data.get('weeks')),
        repetitions: Number(data.get('repetitions')),
        smartSessionTemplateId: String(
          data.get('smartSessionTemplateId'),
        ) as SheetBodyProps['state']['plan']['smartSessionTemplateId'],
      })
    },
    [savePlan],
  )

  return (
    <>
      <Typography variant="heading">Recommended schedule</Typography>
      <Typography variant="muted">
        How often to train and for how long. The same schedule appears in the report footer and
        on the printed copy.
      </Typography>
      <form id="plan-form" onSubmit={handleSubmit}>
        <Typography variant="label" as="p" className="plan-field-group-label">
          Cadence
        </Typography>
        <FieldGrid>
          <Field label="Sessions per week">
            <input
              name="frequency"
              type="number"
              min={1}
              max={7}
              defaultValue={state.plan.frequency}
              required
            />
          </Field>
          <Field label="Plan length (weeks)">
            <input
              name="weeks"
              type="number"
              min={1}
              max={24}
              defaultValue={state.plan.weeks}
              required
            />
          </Field>
        </FieldGrid>
        <Typography variant="label" as="p" className="plan-field-group-label">
          Each session
        </Typography>
        <Field label="Smart session template">
          <select
            name="smartSessionTemplateId"
            defaultValue={state.plan.smartSessionTemplateId}
            required
          >
            {PLAN_SMART_SESSION_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label} · {template.detail}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Repetitions per direction">
          <input
            name="repetitions"
            type="number"
            min={1}
            max={30}
            defaultValue={state.plan.repetitions}
            required
          />
        </Field>
        <Button fullWidth type="submit">
          Save plan for {firstName} <ReportIcon name="check" />
        </Button>
      </form>
    </>
  )
}

function BalanceBody({
  state,
  applySymmetrySettings,
}: {
  state: SheetBodyProps['state']
  applySymmetrySettings: SheetBodyProps['applySymmetrySettings']
}) {
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      applySymmetrySettings(
        String(data.get('profile')) as 'male' | 'female' | 'unset',
        Number(data.get('tolerance')),
      )
    },
    [applySymmetrySettings],
  )

  return (
    <>
      <Typography variant="muted">
        The target is the expected ratio between two directions. “In range” means the measured
        ratio falls inside the selected band around that target.
      </Typography>
      <form id="symmetry-settings" onSubmit={handleSubmit}>
        <Field label="Example benchmark profile">
          <select name="profile" defaultValue={state.symmetry.profile}>
            <option value="male">UFC / MMA · Male</option>
            <option value="female">UFC / MMA · Female</option>
            <option value="unset">No profile selected</option>
          </select>
        </Field>
        <Field label="Allowed deviation from target">
          <select name="tolerance" defaultValue={state.symmetry.tolerance}>
            {[10, 15, 20].map((value) => (
              <option key={value} value={value}>
                ±{value}% of target ratio
              </option>
            ))}
          </select>
        </Field>
        <Button fullWidth type="submit">
          Apply example bands <ReportIcon name="check" />
        </Button>
      </form>
      <Typography variant="label" as="p" className="source-note">
        Source:{' '}
        <a href={SYMMETRY_SOURCE} target="_blank" rel="noopener noreferrer">
          VALD · Neck Coupling Strength in MMA
        </a>
        .
      </Typography>
    </>
  )
}

function SymmetryPairBody({
  state,
  openSheet,
  openDirectionSheet,
}: {
  state: SheetBodyProps['state']
  openSheet: SheetBodyProps['openSheet']
  openDirectionSheet: SheetBodyProps['openDirectionSheet']
}) {
  const pair = getSymmetryPairs(state)[state.sheet.pairIndex ?? 0]
  const handleBalance = useCallback(() => openSheet('balance'), [openSheet])
  if (!pair) {
    return null
  }
  const forces = getCurrentForces(state)
  const reference = getReferenceForces(state)
  const result = getSymmetryResult(state, pair)
  const unit = getUnitLabel(state)
  const stability = getCurrentStability(state)

  return (
    <>
      <Typography variant="muted">
        Average peak force in {directionName(pair.a).toLowerCase()} divided by{' '}
        {directionName(pair.b).toLowerCase()}.
      </Typography>
      <div className="pair-comparison">
        <div>
          <span>This session</span>
          <strong>{getPairRatio(forces, pair)}</strong>
        </div>
        <div>
          <span>{reference ? getReferenceName(state) : 'Comparison'}</span>
          <strong>{reference ? getPairRatio(reference, pair) : '—'}</strong>
        </div>
      </div>
      <section className={`target-detail ${result.tone}`}>
        {result.eligible ? (
          <>
            <Typography variant="heading">Target range</Typography>
            <Typography variant="metricCompact" className="target-range numeric">
              {formatSymmetryBand(result)}
            </Typography>
            <Typography variant="label" as="p" className="range-status">
              {result.status}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="heading">{result.status}</Typography>
            <Typography variant="muted">Configure symmetry targets to score this pair.</Typography>
          </>
        )}
      </section>
      <TextLink onClick={handleBalance}>
        Review targets and tolerance <ReportIcon name="chevron" />
      </TextLink>
      <Typography variant="heading">Direction measurements</Typography>
      {[pair.a, pair.b].map((index) => {
        const handleOpen = () => openDirectionSheet(index)
        return (
          <button key={index} type="button" className="sheet-direction" onClick={handleOpen}>
            <span>
              <strong>
                {directionName(index)} · {index * 45}°
              </strong>
              <small>
                {formatForce(state, forces[index]!)} {unit} avg. peak · {stability[index]}%
                stability
              </small>
            </span>
            <ReportIcon name="arrow" />
          </button>
        )
      })}
    </>
  )
}
