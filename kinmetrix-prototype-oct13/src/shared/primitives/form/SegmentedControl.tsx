import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type SegmentedControlProps = {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

export function SegmentedControl({
  className,
  children,
  role = 'group',
  ...rest
}: SegmentedControlProps) {
  return (
    <div className={classNames('segmented', className)} role={role} {...rest}>
      {children}
    </div>
  )
}

type SegmentedOptionProps = {
  pressed: boolean
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function SegmentedOption({
  pressed,
  className,
  children,
  type = 'button',
  ...rest
}: SegmentedOptionProps) {
  return (
    <button type={type} className={className} aria-pressed={pressed} {...rest}>
      {children}
    </button>
  )
}
