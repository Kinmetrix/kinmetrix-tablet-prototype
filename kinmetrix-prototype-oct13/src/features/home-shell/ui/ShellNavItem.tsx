import { useCallback, type ReactNode } from 'react'
import { classNames } from '../../../shared/primitives/classNames'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { ShellNavIcon, type ShellNavIconName } from './ShellNavIcon'

type Props = {
  label: string
  active: boolean
  onSelect: () => void
  icon?: ReactNode
  status?: string
}

export function ShellNavItem({ label, active, onSelect, icon, status }: Props) {
  const handleClick = useCallback(() => {
    onSelect()
  }, [onSelect])

  return (
    <button
      type="button"
      className={classNames('shell-nav-item', active && 'is-active')}
      aria-current={active ? 'page' : undefined}
      onClick={handleClick}
    >
      {icon}
      <span className="shell-nav-label">{label}</span>
      {status ? (
        <Typography variant="label" className="shell-nav-status">
          {status}
        </Typography>
      ) : null}
    </button>
  )
}

type ShellNavLeafProps<D extends string> = {
  destination: D
  label: string
  icon: ShellNavIconName
  active: boolean
  status?: string
  onSelect: (destination: D) => void
}

export function ShellNavLeaf<D extends string>({
  destination,
  label,
  icon,
  active,
  status,
  onSelect,
}: ShellNavLeafProps<D>) {
  const handleSelect = useCallback(() => {
    onSelect(destination)
  }, [destination, onSelect])

  return (
    <ShellNavItem
      label={label}
      active={active}
      status={status}
      icon={<ShellNavIcon name={icon} />}
      onSelect={handleSelect}
    />
  )
}
