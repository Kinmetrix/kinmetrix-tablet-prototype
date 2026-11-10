#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CHART_REPLACEMENTS = [
  { pattern: /<p><strong>Radial multi chart<\/strong><\/p>/gi, chart: 'radial-multi' },
  { pattern: /<p><strong>Multi-metric chart<\/strong><\/p>/gi, chart: 'line' },
  { pattern: /<p><strong>Line chart<\/strong><\/p>/gi, chart: 'line' },
  { pattern: /<p><strong>Bar chart<\/strong><\/p>/gi, chart: 'bar' },
  { pattern: /<p><strong>Radial chart<\/strong><\/p>/gi, chart: 'radial' },
  { pattern: /<p><strong>TestMultiChart<\/strong><\/p>/gi, chart: 'line' },
  { pattern: /<p><strong>Test chart<\/strong><\/p>/gi, chart: 'line' },
];

const CHART_HOST_OPEN =
  '<div class="proto-chart" data-chart="CHART" data-chart-label="CHART label"></div>';

function chartDiv(kind) {
  return CHART_HOST_OPEN.replace(/CHART/g, kind);
}

function patchLogos(html) {
  let next = html;
  next = next.replace(
    /<div class="wire-logo"([^>]*)>\s*KINMETRIX\s*<\/div>/gi,
    '<img class="kin-logo kin-logo--full" src="assets/kinmetrix-logo-full.png" alt="Kinmetrix"$1 />'
  );
  next = next.replace(
    /<div class="wire-logo"([^>]*)>\s*KM\s*<\/div>/gi,
    '<img class="kin-logo kin-logo--mark" src="assets/kinmetrix-logo.svg" alt=""$1 />'
  );
  return next;
}

function patchAvatars(html) {
  let next = html.replace(
    /<span class="wire-logo"([^>]*)>\s*AM\s*<\/span>/gis,
    '<span class="proto-avatar proto-avatar--fixture" data-default-avatar="Alex Morgan" data-avatar-size="48"$1></span>'
  );
  next = next.replace(
    /<div class="wire-logo"([^>]*)>\s*AM\s*<\/div>/gi,
    '<span class="proto-avatar proto-avatar--fixture" data-default-avatar="Alex Morgan" data-avatar-size="40"$1 style="width:40px;height:40px"></span>'
  );
  return next;
}

function patchCharts(html) {
  let next = html;
  for (const { pattern, chart } of CHART_REPLACEMENTS) {
    next = next.replace(pattern, chartDiv(chart));
  }
  next = next.replace(
    /<svg width="420" height="140" viewBox="0 0 420 140"[\s\S]*?<\/svg>/g,
    '<div class="proto-chart" data-chart="line" data-chart-label="Force curves"></div>'
  );
  return next;
}

let touched = 0;
for (const name of fs.readdirSync(prototypeRoot)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(prototypeRoot, name);
  const before = fs.readFileSync(file, 'utf8');
  let after = patchLogos(before);
  after = patchAvatars(after);
  after = patchCharts(after);
  if (after !== before) {
    fs.writeFileSync(file, after);
    touched += 1;
  }
}
console.log(`apply-prototype-assets: updated ${touched} html files`);
