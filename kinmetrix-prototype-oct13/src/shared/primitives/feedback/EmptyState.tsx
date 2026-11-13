import type { HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type Props = {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

export function EmptyState({ className, children, ...rest }: Props) {
  return (
    <div className={classNames('empty', className)} {...rest}>
      {children}
    </div>
  )
}
