import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  computePreviewLayout,
  readPreviewLayoutInput,
} from '../theme/previewViewportFit'
import {
  TABLET_STATUS_BAR_HEIGHT,
  TABLET_VIEWPORT,
} from '../theme/tabletViewport'
import { SystemStatusBar } from './SystemStatusBar'

const TABLET_WIDTH = TABLET_VIEWPORT.width
const TABLET_HEIGHT = TABLET_VIEWPORT.height

type Props = {
  children: ReactNode
  isHome?: boolean
}

export function DeviceFrame({ children, isHome = false }: Props) {
  const [scale, setScale] = useState(1)
  const [showHint, setShowHint] = useState(false)

  const fitPreview = useCallback(() => {
    const input = readPreviewLayoutInput()
    const layout = computePreviewLayout(input)
    const root = document.documentElement
    root.style.setProperty('--preview-scale', String(layout.scale))
    root.style.setProperty('--preview-top', `${layout.top}px`)
    root.style.setProperty('--preview-left', `${layout.left}px`)
    if (layout.fit === 'tablet') {
      root.dataset.previewFit = 'tablet'
    } else {
      delete root.dataset.previewFit
    }
    setScale(layout.scale)
    setShowHint(
      layout.fit === 'centered' &&
        layout.scale < 1 &&
        input.viewportHeight - TABLET_HEIGHT * layout.scale >= 70,
    )
  }, [])

  useEffect(() => {
    fitPreview()
    window.addEventListener('resize', fitPreview)
    const vv = window.visualViewport
    vv?.addEventListener('resize', fitPreview)
    vv?.addEventListener('scroll', fitPreview)
    return () => {
      window.removeEventListener('resize', fitPreview)
      vv?.removeEventListener('resize', fitPreview)
      vv?.removeEventListener('scroll', fitPreview)
      const root = document.documentElement
      root.style.removeProperty('--preview-scale')
      root.style.removeProperty('--preview-top')
      root.style.removeProperty('--preview-left')
      delete root.dataset.previewFit
    }
  }, [fitPreview])

  return (
    <>
      <div
        className="device"
        data-tablet-width={TABLET_WIDTH}
        data-tablet-height={TABLET_HEIGHT}
        style={{ width: TABLET_WIDTH * scale, height: TABLET_HEIGHT * scale }}
      >
        <div
          className={isHome ? 'app is-home' : 'app'}
          data-tablet-canvas=""
          style={{
            ['--preview-scale' as string]: scale,
            ['--tablet-status-bar-height' as string]: `${TABLET_STATUS_BAR_HEIGHT}px`,
          }}
        >
          <SystemStatusBar />
          <div className="app__content">{children}</div>
        </div>
      </div>
      {showHint ? (
        <div className="fit-hint">
          iPad mini landscape preview · Expand the pane for a larger view
        </div>
      ) : null}
    </>
  )
}
