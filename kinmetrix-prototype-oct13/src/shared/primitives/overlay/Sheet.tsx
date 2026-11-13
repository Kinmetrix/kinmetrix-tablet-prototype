import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { classNames } from '../classNames'

type SheetProps = {
  className?: string
  children?: ReactNode
} & HTMLAttributes<HTMLDialogElement>

export const Sheet = forwardRef<HTMLDialogElement, SheetProps>(function Sheet(
  { className, children, ...rest },
  ref,
) {
  return (
    <dialog ref={ref} className={classNames('sheet', className)} {...rest}>
      {children}
    </dialog>
  )
})

type SheetRegionProps = {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

export function SheetHead({ className, children, ...rest }: SheetRegionProps) {
  return (
    <div className={classNames('sheet-head', className)} {...rest}>
      {children}
    </div>
  )
}

export function SheetContent({ className, children, ...rest }: SheetRegionProps) {
  return (
    <div className={classNames('sheet-content', className)} {...rest}>
      {children}
    </div>
  )
}

export function SheetActions({ className, children, ...rest }: SheetRegionProps) {
  return (
    <div className={classNames('sheet-actions', className)} {...rest}>
      {children}
    </div>
  )
}
