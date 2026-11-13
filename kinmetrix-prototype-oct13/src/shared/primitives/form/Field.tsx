import type { LabelHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

type FieldProps = {
  label: ReactNode
  className?: string
  children: ReactNode
} & Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'>

export function Field({ label, className, children, ...rest }: FieldProps) {
  return (
    <label className={classNames('field', className)} {...rest}>
      {typeof label === 'string' ? <span>{label}</span> : label}
      {children}
    </label>
  )
}

type FieldGridProps = {
  className?: string
  children: ReactNode
}

export function FieldGrid({ className, children }: FieldGridProps) {
  return <div className={classNames('field-grid', className)}>{children}</div>
}
