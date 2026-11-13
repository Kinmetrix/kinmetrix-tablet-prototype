import { TABLET_VIEWPORT } from './tabletViewport'

export type PreviewFitMode = 'centered' | 'tablet'

export type PreviewLayout = {
  scale: number
  top: number
  left: number
  fit: PreviewFitMode
}

export type PreviewLayoutInput = {
  viewportWidth: number
  viewportHeight: number
  offsetTop: number
  offsetLeft: number
  coarsePointer: boolean
  hoverNone: boolean
}

const TABLET_WIDTH = TABLET_VIEWPORT.width
const TABLET_HEIGHT = TABLET_VIEWPORT.height

/** iPad landscape Safari: 1:1 canvas, top-left aligned (no letterboxing). Desktop: centered scale-to-fit. */
export function computePreviewLayout(input: PreviewLayoutInput): PreviewLayout {
  const tabletLandscapeFit =
    input.hoverNone && input.coarsePointer && input.viewportWidth >= TABLET_WIDTH

  if (tabletLandscapeFit) {
    return {
      scale: 1,
      top: input.offsetTop,
      left: input.offsetLeft,
      fit: 'tablet',
    }
  }

  const scale = Math.min(
    1,
    input.viewportWidth / TABLET_WIDTH,
    input.viewportHeight / TABLET_HEIGHT,
  )

  return {
    scale,
    top: (input.viewportHeight - TABLET_HEIGHT * scale) / 2 + input.offsetTop,
    left: (input.viewportWidth - TABLET_WIDTH * scale) / 2 + input.offsetLeft,
    fit: 'centered',
  }
}

export function readPreviewLayoutInput(): PreviewLayoutInput {
  const vv = window.visualViewport
  return {
    viewportWidth: vv?.width ?? window.innerWidth,
    viewportHeight: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    hoverNone: window.matchMedia('(hover: none)').matches,
  }
}
