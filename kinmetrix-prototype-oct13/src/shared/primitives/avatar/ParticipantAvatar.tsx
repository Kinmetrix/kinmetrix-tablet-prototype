import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'
import { memberAvatarThemeClass } from './memberAvatarTheme'

type Props = {
  className?: string
  memberId?: string
  children: ReactNode
} & HTMLAttributes<HTMLSpanElement>

export function ParticipantAvatar({ className, memberId, children, ...rest }: Props) {
  return (
    <span
      className={classNames(
        'participant-avatar',
        memberId ? memberAvatarThemeClass(memberId) : undefined,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
