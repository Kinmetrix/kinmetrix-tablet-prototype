import './system-status-bar.css'

export function SystemStatusBar() {
  return (
    <div className="system-status-bar" aria-hidden="true">
      <span className="system-status-bar__time">9:41</span>
      <span className="system-status-bar__trailing">
        <svg
          className="system-status-bar__icon"
          width="16"
          height="12"
          viewBox="0 0 16 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 2.4c2.1 0 3.9 1 5.1 2.5l1.2-1.2C12.7 1.6 10.5.5 8 .5S3.3 1.6 1.7 3.7l1.2 1.2C4.1 3.4 5.9 2.4 8 2.4zm0 3.6c1.3 0 2.4.5 3.3 1.4l1.2-1.2C11.1 4.8 9.6 4.2 8 4.2s-3.1.6-4.5 1.6l1.2 1.2c.9-.9 2-1.4 3.3-1.4zm0 3.6c.7 0 1.3.3 1.8.7l1.8-1.8A4.2 4.2 0 0 0 8 7.8a4.2 4.2 0 0 0-2.6.9l1.8 1.8c.5-.4 1.1-.7 1.8-.7zM1.2 8.4l1.8 1.8a4.2 4.2 0 0 0 5 0l1.8-1.8A6.6 6.6 0 0 1 8 11.5 6.6 6.6 0 0 1 1.2 8.4z"
          />
        </svg>
        <svg
          className="system-status-bar__icon system-status-bar__battery"
          width="25"
          height="12"
          viewBox="0 0 25 12"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="2.5"
            stroke="currentColor"
          />
          <path
            d="M23 4v4a2 2 0 0 0 0-4z"
            fill="currentColor"
          />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
        </svg>
      </span>
    </div>
  )
}
