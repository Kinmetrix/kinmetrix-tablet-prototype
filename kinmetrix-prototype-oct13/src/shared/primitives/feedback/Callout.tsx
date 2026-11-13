import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

export type CalloutTone = 'info' | 'warning' | 'success' | 'critical'

type Props = {
  tone?: CalloutTone
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

export function Callout({
  tone = 'info',
  className,
  role = 'status',
  children,
  ...rest
}: Props) {
  return (
    <div
      className={classNames('callout', className)}
      data-tone={tone}
      role={role}
      {...rest}
    >
      {children}
    </div>
  )
}
