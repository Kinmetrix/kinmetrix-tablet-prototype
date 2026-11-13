import { useCallback, useState } from 'react'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import type { MemberRecord } from '../model/appShellTypes'
import { useAppShell } from './AppShellContext'
import { ProgramPlan } from './ProgramPlan'

interface ProtocolDetail {
  kind: 'protocol'
  heading: string
  body: string
}

interface ProgramDetail {
  kind: 'program'
  program: NonNullable<MemberRecord['program']>
}

type StartDetail = ProtocolDetail | ProgramDetail

interface OpenAccess {
  kind: 'open'
  detail: StartDetail
}

interface ClosedAccess {
  kind: 'closed'
  reason: string
}

type StartAccess = OpenAccess | ClosedAccess

interface StartDescribed {
  summary: string
  progress: string | null
  access: StartAccess
}

interface StartViewOption {
  id: StartOptionId
  title: string
  summary: string
  progress: string | null
  helper: string | null
  blocked: boolean
  selected: boolean
}

interface StartView {
  options: StartViewOption[]
  detail: StartDetail | null
}

function describeAssessment(_record: MemberRecord): StartDescribed {
  return {
    summary: 'Baseline neck strength. Uses the team assessment template.',
    progress: null,
    access: {
      kind: 'open',
      detail: {
        kind: 'protocol',
        heading: 'Northridge assessment',
        body: '8 directions · isometric · team protocol',
      },
    },
  }
}

function describeSmartSession(record: MemberRecord): StartDescribed {
  const summary = 'Load comes from the last analyzed assessment.'
  if (!record.smartSessionReady) {
    return {
      summary,
      progress: null,
      access: { kind: 'closed', reason: 'Needs an analyzed assessment first.' },
    }
  }
  return {
    summary,
    progress: null,
    access: {
      kind: 'open',
      detail: {
        kind: 'protocol',
        heading: 'Post-practice session',
        body: 'Intensity follows the latest assessment. This is not the program list.',
      },
    },
  }
}

function programProgress(program: NonNullable<MemberRecord['program']>): string | null {
  const current = program.groups.find((group) => group.state === 'current')
  if (!current) {
    return null
  }
  return `In progress · ${current.name}`
}

function describeProgram(record: MemberRecord): StartDescribed {
  if (!record.program) {
    return {
      summary: 'No program on this account.',
      progress: null,
      access: { kind: 'closed', reason: 'No program on this account.' },
    }
  }
  return {
    summary: record.program.name,
    progress: programProgress(record.program),
    access: {
      kind: 'open',
      detail: { kind: 'program', program: record.program },
    },
  }
}

function describeRangeOfMotion(_record: MemberRecord): StartDescribed {
  return {
    summary: 'How far the neck moves in each direction.',
    progress: null,
    access: {
      kind: 'open',
      detail: {
        kind: 'protocol',
        heading: 'Range of motion',
        body: '8 directions · active motion · no force target',
      },
    },
  }
}

const START_OPTIONS = [
  { id: 'assessment', title: 'Assessment', describe: describeAssessment },
  { id: 'session', title: 'Smart session', describe: describeSmartSession },
  { id: 'program', title: 'Program', describe: describeProgram },
  { id: 'rangeOfMotion', title: 'Range of motion', describe: describeRangeOfMotion },
] as const

type StartOptionId = (typeof START_OPTIONS)[number]['id']

function closedHelper(described: StartDescribed): string | null {
  if (described.access.kind !== 'closed') {
    return null
  }
  if (described.access.reason === described.summary) {
    return null
  }
  return described.access.reason
}

function projectOption(
  entry: (typeof START_OPTIONS)[number],
  record: MemberRecord,
  waiverSigned: boolean,
  selectedId: StartOptionId | null,
): StartViewOption {
  const described = entry.describe(record)
  const blocked = !waiverSigned || described.access.kind === 'closed'
  return {
    id: entry.id,
    title: entry.title,
    summary: described.summary,
    progress: described.progress,
    helper: closedHelper(described),
    blocked,
    selected: selectedId === entry.id && !blocked,
  }
}

function selectedDetail(
  waiverSigned: boolean,
  record: MemberRecord,
  selectedId: StartOptionId | null,
): StartDetail | null {
  if (!selectedId) {
    return null
  }
  const entry = START_OPTIONS.find((option) => option.id === selectedId)
  if (!entry) {
    return null
  }
  const described = entry.describe(record)
  if (!waiverSigned || described.access.kind === 'closed') {
    return null
  }
  return described.access.detail
}

function projectStart(
  waiverSigned: boolean,
  record: MemberRecord,
  selectedId: StartOptionId | null,
): StartView {
  return {
    options: START_OPTIONS.map((entry) =>
      projectOption(entry, record, waiverSigned, selectedId),
    ),
    detail: selectedDetail(waiverSigned, record, selectedId),
  }
}

function StartOptionCard({
  option,
  onSelect,
}: {
  option: StartViewOption
  onSelect: (id: StartOptionId) => void
}) {
  const handleClick = useCallback(() => {
    onSelect(option.id)
  }, [onSelect, option.id])

  return (
    <Button
      variant="outline"
      fullWidth
      className="start-path"
      aria-pressed={option.selected}
      disabled={option.blocked}
      onClick={handleClick}
    >
      <Typography variant="title" as="span">
        {option.title}
      </Typography>
      <Typography variant="muted" as="span">
        {option.summary}
      </Typography>
      {option.progress ? (
        <Typography variant="label" as="span">
          {option.progress}
        </Typography>
      ) : null}
      {option.helper ? (
        <Typography variant="helper" as="span">
          {option.helper}
        </Typography>
      ) : null}
    </Button>
  )
}

function StartProtocolDetail({ detail }: { detail: ProtocolDetail }) {
  return (
    <section className="start-detail">
      <Typography variant="heading" as="h2">
        {detail.heading}
      </Typography>
      <Typography variant="body">{detail.body}</Typography>
    </section>
  )
}

export function ExerciseStartScreen() {
  const { activeMember, memberRecordFor } = useAppShell()
  const [selectedId, setSelectedId] = useState<StartOptionId | null>(null)

  if (!activeMember) {
    return null
  }

  const record = memberRecordFor(activeMember.id)
  const view = projectStart(activeMember.waiverSigned, record, selectedId)

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Start exercise
        </Typography>
        <Typography variant="muted">
          Choose an exercise for {activeMember.name}.
        </Typography>
      </header>
      <div className="start-paths" role="group" aria-label="Start options">
        {view.options.map((option) => (
          <StartOptionCard key={option.id} option={option} onSelect={setSelectedId} />
        ))}
      </div>
      {view.detail?.kind === 'protocol' ? <StartProtocolDetail detail={view.detail} /> : null}
      {view.detail?.kind === 'program' ? (
        <ProgramPlan name={view.detail.program.name} groups={view.detail.program.groups} />
      ) : null}
    </div>
  )
}
