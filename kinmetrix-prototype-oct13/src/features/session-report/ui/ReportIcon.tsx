type ReportIconName =
  | 'arrow'
  | 'back'
  | 'chevron'
  | 'share'
  | 'sliders'
  | 'info'
  | 'check'
  | 'close'
  | 'expand'
  | 'print'
  | 'download'

type Props = {
  name: ReportIconName
  className?: string
}

export function ReportIcon({ name, className }: Props) {
  const iconClass = className ?? 'icon'
  switch (name) {
    case 'chevron':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      )
    case 'share':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9" />
        </svg>
      )
    case 'sliders':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h6m4 0h6M4 17h10m4 0h2" />
          <circle cx="12" cy="7" r="2" />
          <circle cx="16" cy="17" r="2" />
        </svg>
      )
    case 'info':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6m0-10v.1" />
        </svg>
      )
    case 'check':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'back':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
      )
    case 'close':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      )
    case 'expand':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 3h7v7m0-7-8 8M10 21H3v-7m0 7 8-8" />
        </svg>
      )
    case 'print':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 8V3h10v5M6 17H3V8h18v9h-3M7 14h10v7H7zM17 11h1" />
        </svg>
      )
    case 'download':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )
  }
}
