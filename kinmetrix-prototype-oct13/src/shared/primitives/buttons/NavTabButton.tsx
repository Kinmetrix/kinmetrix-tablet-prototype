import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type Props = {
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function NavTabButton({ type = 'button', className, children, ...rest }: Props) {
  return (
    <button type={type} className={classNames('nav-tab', className)} {...rest}>
      {children}
    </button>
  )
}
