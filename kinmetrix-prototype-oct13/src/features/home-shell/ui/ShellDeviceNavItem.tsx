import { useCallback } from 'react'
import { ShellNavIcon, type ShellNavIconName } from './ShellNavIcon'
import { ShellNavItem } from './ShellNavItem'

type Props = {
  label: string
  icon: ShellNavIconName
  active: boolean
  status: string
  onSelect: () => void
}

export function ShellDeviceNavItem({ label, icon, active, status, onSelect }: Props) {
  const handleSelect = useCallback(() => {
    onSelect()
  }, [onSelect])

  return (
    <div className="shell-nav-pin">
      <ShellNavItem
        label={label}
        active={active}
        status={status}
        icon={<ShellNavIcon name={icon} />}
        onSelect={handleSelect}
      />
    </div>
  )
}
