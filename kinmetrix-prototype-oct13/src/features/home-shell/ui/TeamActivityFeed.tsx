import { ParticipantAvatar } from '../../../shared/primitives/avatar/ParticipantAvatar'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { formatActivityFeedWhen } from '../../../shared/date/formatRelativeDate'
import { activityFeedActionCopy } from '../model/activityKindLabels'
import type { TeamActivityItem } from '../model/teamOverviewModel'
import { classNames } from '../../../shared/primitives/classNames'

function initialsFor(name: string): string {
  const parts = name.split(' ').filter((part) => part.length > 0)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

type Props = {
  items: readonly TeamActivityItem[]
  onOpenMember: (memberId: string) => void
  className?: string
  scrollClassName?: string
}

export function TeamActivityFeed({
  items,
  onOpenMember,
  className,
  scrollClassName,
}: Props) {
  if (items.length === 0) {
    return (
      <Typography variant="muted" className={classNames('team-activity-empty', className)}>
        No sessions yet.
      </Typography>
    )
  }

  return (
    <ul
      className={classNames(
        'team-overview-activity-list',
        'team-overview-activity-scroll',
        scrollClassName,
        className,
      )}
    >
      {items.map((item) => {
        const action = activityFeedActionCopy(item.kindLabel)
        return (
          <li key={item.id}>
            <button
              type="button"
              className="team-overview-activity-row"
              onClick={() => onOpenMember(item.memberId)}
            >
              <ParticipantAvatar memberId={item.memberId} className="team-overview-activity-avatar">
                {initialsFor(item.memberName)}
              </ParticipantAvatar>
              <span className="team-overview-activity-main">
                <span className="team-overview-activity-name">{item.memberName}</span>
                <span className="team-overview-activity-action">
                  {action.lead}
                  {action.emphasis ? (
                    <>
                      {' '}
                      <strong>{action.emphasis}</strong>
                    </>
                  ) : null}
                </span>
              </span>
              <time className="team-overview-activity-rel" dateTime={item.occurredAt}>
                {formatActivityFeedWhen(item.timeLabel)}
              </time>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
