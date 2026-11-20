(function () {
  const LOGICAL_WIDTH = 1180;
  const LOGICAL_HEIGHT = 820;
  /** Wider than typical iPad preset — gray letterbox presentation only above this. */
  const PRESENTATION_MIN_WIDTH = 1580;

  function usePresentationFrame() {
    if (window.matchMedia('print').matches) return false;
    if (window.matchMedia('(pointer: coarse)').matches) return false;
    return window.innerWidth > PRESENTATION_MIN_WIDTH;
  }

  /**
   * Use iPad logical height (820px) for layout so 100dvh-based CSS matches a landscape
   * station. Portrait and print stay on real viewport units.
   */
  function useIpadViewport() {
    if (window.matchMedia('print').matches) return false;
    if (usePresentationFrame()) return true;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (h > w) return false;
    return w <= PRESENTATION_MIN_WIDTH;
  }

  function syncPresentation() {
    const presentation = usePresentationFrame();
    const ipad = useIpadViewport();
    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle('experience-presentation', presentation);
    body.classList.toggle('experience-presentation', presentation);
    root.classList.toggle('experience-ipad-viewport', ipad);
    root.classList.toggle('experience-staged', ipad);
  }

  window.addEventListener('resize', syncPresentation);
  window.addEventListener('orientationchange', syncPresentation);
  syncPresentation();

  window.KinExperienceStage = {
    usePresentationFrame,
    useIpadViewport,
    sync: syncPresentation,
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
  };
})();