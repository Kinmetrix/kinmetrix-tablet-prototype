import { Typography } from '../../../shared/primitives/typography/Typography'
import type { MemberRecord } from '../model/appShellTypes'

type Props = {
  record: MemberRecord
}

export function HomeActionSplit({ record }: Props) {
  const nextGroup = record.program?.groups.find((group) => group.state === 'current')

  return (
    <section className="home-status">
      <Typography variant="display" as="p">
        {nextGroup ? 'Ready to start' : 'Assessment comes first'}
      </Typography>
      <Typography variant="muted">
        {record.program ? record.program.name : 'No program yet'}
      </Typography>
    </section>
  )
}
