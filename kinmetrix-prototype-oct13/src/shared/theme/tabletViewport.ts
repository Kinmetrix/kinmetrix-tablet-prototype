/** iPad mini (6th/7th gen) landscape logical window. Must match `.app` in session-report.css and DeviceFrame. */
export const TABLET_VIEWPORT = {
  width: 1133,
  height: 744,
} as const

/** Landscape top safe area on iPad mini (status bar). */
export const TABLET_STATUS_BAR_HEIGHT = 24

export type TabletViewport = typeof TABLET_VIEWPORT
