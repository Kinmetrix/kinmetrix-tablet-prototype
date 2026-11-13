import { useCallback, type ReactNode } from 'react'

type BreadcrumbsProps = {
  label?: string
  children: ReactNode
}

export function Breadcrumbs({ label = 'Breadcrumbs', children }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label={label}>
      <ol className="breadcrumbs-list">{children}</ol>
    </nav>
  )
}

type ItemProps = {
  children: ReactNode
  current?: boolean
  onSelect?: () => void
}

export function BreadcrumbItem({ children, current = false, onSelect }: ItemProps) {
  const handleSelect = useCallback(() => {
    onSelect?.()
  }, [onSelect])

  return (
    <li className="breadcrumbs-item">
      {current ? (
        <span className="breadcrumbs-current" aria-current="page">
          {children}
        </span>
      ) : (
        <button type="button" className="breadcrumbs-link" onClick={handleSelect}>
          {children}
        </button>
      )}
    </li>
  )
}
