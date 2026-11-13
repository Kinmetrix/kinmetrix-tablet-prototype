import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { classNames } from '../classNames'

/** Closed scale — add variants here only after design review. */
export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'muted'
  | 'label'
  | 'metric'
  | 'metricCompact'
  | 'helper'

const VARIANT_CLASS: Record<TypographyVariant, string> = {
  display: 'typo-display',
  title: 'typo-title',
  heading: 'typo-heading',
  body: 'typo-body',
  muted: 'typo-muted',
  label: 'typo-label',
  metric: 'typo-metric',
  metricCompact: 'typo-metric-compact',
  helper: 'typo-helper',
}

const DEFAULT_ELEMENT: Record<TypographyVariant, ElementType> = {
  display: 'h1',
  title: 'h2',
  heading: 'h3',
  body: 'p',
  muted: 'p',
  label: 'span',
  metric: 'span',
  metricCompact: 'span',
  helper: 'p',
}

type Props = {
  variant: TypographyVariant
  as?: ElementType
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLElement>

export function Typography({
  variant,
  as,
  className,
  children,
  ...rest
}: Props) {
  const Component = as ?? DEFAULT_ELEMENT[variant]
  return (
    <Component className={classNames(VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </Component>
  )
}
