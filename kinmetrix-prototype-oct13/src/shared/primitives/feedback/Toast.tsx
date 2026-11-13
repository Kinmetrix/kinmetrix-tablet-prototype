import type { HTMLAttributes } from 'react'
import { classNames } from '../classNames'

type Props = {
  message: string
  className?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export function Toast({ message, className, ...rest }: Props) {
  return (
    <div className={classNames('toast', className)} role="status" aria-live="polite" {...rest}>
      {message}
    </div>
  )
}
