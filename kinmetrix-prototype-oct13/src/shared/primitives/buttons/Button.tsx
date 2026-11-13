import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

export type ButtonVariant = 'primary' | 'outline'

type Props = {
  variant?: ButtonVariant
  fullWidth?: boolean
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={classNames('btn', variant, fullWidth && 'full', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
