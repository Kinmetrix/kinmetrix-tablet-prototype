/** Shared rules for KMScreen ↔ `.wire-toolbar` parity checks and fixes. */

/** Routes whose RN UI has no KMScreen header bar (or equivalent stack chrome). */
export const NO_KMSCREEN_TOOLBAR_ROUTES = new Set([
  'Login',
  'PasswordLogin',
  'Loading',
  'Feedback',
]);

export function routeFromHtml(htmlText) {
  const m = htmlText.match(/\bdata-route=["']([^"']+)["']/);
  return m ? m[1] : null;
}

export function isEnrichedHtml(htmlText) {
  return /\bdata-enriched=["']true["']/.test(htmlText);
}

export function hasWireToolbar(htmlText) {
  return /class=["'][^"']*\bwire-toolbar\b/.test(htmlText);
}

export function needsWireToolbar(route, htmlText) {
  if (!isEnrichedHtml(htmlText)) return false;
  if (!route) return false;
  if (NO_KMSCREEN_TOOLBAR_ROUTES.has(route)) return false;
  return true;
}
