import { useCallback } from 'react'
import { SegmentedControl, SegmentedOption } from '../../../shared/primitives/form/SegmentedControl'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { useSessionReport } from './SessionReportContext'
import { formatForce, getUnitLabel } from '../model/sessionReportModel'
import type { MapView } from '../model/sessionReportTypes'
import { ReportDirectionBarList } from './ReportDirectionBarList'
import { ReportMapLegend } from './ReportMapLegend'
import { ReportRadarMap } from './ReportRadarMap'

export function ReportDirectionVisual() {
  const { state, setMapView } = useSessionReport()
  const unit = getUnitLabel(state)

  const handleMapView = useCallback(
    (mapView: MapView) => {
      setMapView(mapView)
    },
    [setMapView],
  )

  const subtitle =
    state.mapView === 'map'
      ? 'Top view · tap a direction for reps'
      : `Strength 0–${formatForce(state, 50)} ${unit} · Stability 0–100%`

  return (
    <section className="direction-visual" aria-label="Directional strength and stability">
      <div className="section-head">
        <div>
          <Typography variant="title">Strength &amp; stability</Typography>
          <Typography variant="label" as="p">
            {subtitle}
          </Typography>
        </div>
        <SegmentedControl aria-label="Direction view">
          <SegmentedOption
            pressed={state.mapView === 'map'}
            onClick={() => handleMapView('map')}
          >
            Map
          </SegmentedOption>
          <SegmentedOption
            pressed={state.mapView === 'list'}
            onClick={() => handleMapView('list')}
          >
            List
          </SegmentedOption>
        </SegmentedControl>
      </div>
      {state.mapView === 'map' ? <ReportRadarMap /> : <ReportDirectionBarList />}
      <ReportMapLegend />
    </section>
  )
}
