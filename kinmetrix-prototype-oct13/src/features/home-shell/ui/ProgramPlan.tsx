import { Typography } from '../../../shared/primitives/typography/Typography'
import type { ProgramGroup } from '../model/appShellTypes'

type Props = {
  name: string
  groups: ProgramGroup[]
}

export function ProgramPlan({ name, groups }: Props) {
  return (
    <section>
      <div className="section-head">
        <Typography variant="heading" as="h2">
          {name}
        </Typography>
      </div>
      <ol className="home-lines">
        {groups.map((group) => (
          <li key={group.id} className={`home-line is-${group.state}`}>
            <Typography variant="body" as={group.state === 'current' ? 'strong' : 'span'}>
              {group.name}
            </Typography>
            <Typography variant="muted">{group.detail}</Typography>
            <Typography variant="label">
              {group.state === 'done' ? 'Done' : group.state === 'current' ? 'Next' : 'Later'}
            </Typography>
          </li>
        ))}
      </ol>
    </section>
  )
}
