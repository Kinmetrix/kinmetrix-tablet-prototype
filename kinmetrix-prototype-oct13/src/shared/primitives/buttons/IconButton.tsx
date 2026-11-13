import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type Props = {
  className?: string
  children: ReactNode
  'aria-label': string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>

export function IconButton({ className, type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} className={classNames('icon-btn', className)} {...rest}>
      {children}
    </button>
  )
}
