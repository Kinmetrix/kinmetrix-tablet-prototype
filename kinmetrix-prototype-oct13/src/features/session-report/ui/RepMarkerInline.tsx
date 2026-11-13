import { REP_STYLES } from '../model/repRecordingModel'

type Props = {
  rep: number
}

export function RepMarker({ rep }: Props) {
  const style = REP_STYLES[rep - 1]!
  return (
    <svg className="rep-marker" viewBox="0 0 22 12" aria-hidden="true">
      <path
        d="M1 6H21"
        fill="none"
        stroke={style.color}
        strokeWidth={2}
        strokeDasharray={style.dash}
      />
    </svg>
  )
}
