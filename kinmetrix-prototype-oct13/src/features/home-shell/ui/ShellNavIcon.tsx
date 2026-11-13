import type { ReactElement } from 'react'
import type { MemberNavIcon } from '../model/appShellTypes'
import type { TeamNavIcon } from '../model/teamWorkspaceCatalog'

export type ShellNavIconName = TeamNavIcon | MemberNavIcon

type Props = {
  name: ShellNavIconName
}

export function ShellNavIcon({ name }: Props) {
  return (
    <svg className="shell-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <ShellNavIconShape name={name} />
    </svg>
  )
}

function assertNever(value: never): never {
  throw new Error(`Unhandled shell nav icon: ${String(value)}`)
}

function ShellNavIconShape({ name }: Props): ReactElement {
  switch (name) {
    case 'overview':
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      )
    case 'activity':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 2" />
        </>
      )
    case 'members':
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.4" />
          <path d="M3.5 19c.7-3 2.8-4.5 5.5-4.5S14 16 14.7 19" />
          <path d="M14 14.6c1.5 0 2.8.7 3.5 2.4" />
        </>
      )
    case 'templates':
      return (
        <>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M6 16V6.5A1.5 1.5 0 0 1 7.5 5H16" />
        </>
      )
    case 'settings':
      return (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="8" cy="7" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="10" cy="17" r="2" />
        </>
      )
    case 'device':
      return (
        <>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M10 18h4" />
        </>
      )
    case 'assessments':
      return (
        <>
          <rect x="6" y="5" width="12" height="15" rx="2" />
          <path d="M9 4.5h6V8H9zM9 12h6M9 16h4" />
        </>
      )
    case 'smart-sessions':
      return <path d="M3 12h4l2.2-5 3.6 10L15 12h6" />
    case 'programs':
      return (
        <>
          <path d="M9 7h11M9 12h11M9 17h11" />
          <circle cx="5" cy="7" r="1.2" />
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="5" cy="17" r="1.2" />
        </>
      )
    case 'home':
      return (
        <>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 10.5V20h12v-9.5" />
          <path d="M10 20v-6h4v6" />
        </>
      )
    case 'history':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 2" />
        </>
      )
    case 'start':
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M10 8.5v7l6-3.5z" />
        </>
      )
    default:
      return assertNever(name)
  }
}

export function ShellChevron() {
  return (
    <svg className="team-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
