import { useCallback } from 'react'
import { useSessionReport } from './SessionReportContext'
import { repNumbers } from '../model/repRecordingModel'
type Props = {
  showLabels?: boolean
}

import { RepMarker } from './RepMarkerInline'

export function RepSelector({ showLabels = true }: Props) {
  const { state, setRep } = useSessionReport()
  const reps = repNumbers(state)
  const columns = Math.min(7, state.reps + 1)

  const handleRep = useCallback(
    (rep: number) => {
      setRep(rep)
    },
    [setRep],
  )

  return (
    <div
      className="rep-tabs"
      role="group"
      aria-label="Choose a repetition"
      style={{ ['--rep-columns' as string]: columns }}
    >
      <button
        type="button"
        aria-pressed={state.rep === 0}
        onClick={() => handleRep(0)}
      >
        All reps
      </button>
      {reps.map((rep) => (
        <button
          key={rep}
          type="button"
          data-rep={rep}
          aria-pressed={state.rep === rep}
          aria-label={`Show repetition ${rep}`}
          onClick={() => handleRep(rep)}
        >
          <RepMarker rep={rep} />
          {showLabels ? <span>Rep {rep}</span> : null}
        </button>
      ))}
    </div>
  )
}
