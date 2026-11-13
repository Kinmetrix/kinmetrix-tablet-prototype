import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type Props = {
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function TextLink({ className, type = 'button', children, ...rest }: Props) {
  return (
    <button type={type} className={classNames('text-link', className)} {...rest}>
      {children}
    </button>
  )
}
