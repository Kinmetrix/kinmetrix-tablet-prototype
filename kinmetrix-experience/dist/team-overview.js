/* Pulse: team KPIs and activity. Loaded after directory.js — exports pulsePage(). */
const TEAM_OVERVIEW_PERIODS = {
  today: {presetLabel: 'Today', ariaLabel: 'Today, current calendar day', title: 'Current calendar day'},
  'last-1w': {presetLabel: '1w', ariaLabel: 'Last 7 days', title: 'Last 7 days'},
  'last-1m': {presetLabel: '1m', ariaLabel: 'Last 30 days', title: 'Last 30 days'},
  'last-3m': {presetLabel: '3m', ariaLabel: 'Last 90 days', title: 'Last 90 days'},
  all: {presetLabel: 'All', ariaLabel: 'All team activity', title: 'All team activity in the dataset'}
};

const PULSE_REPORTING_END = Date.UTC(2026, 10, 13, 23, 59, 59, 999);
const PULSE_PERIOD_DAY_COUNT = {'last-1w': 7, 'last-1m': 30, 'last-3m': 90};
const PULSE_LEGACY_PERIOD = {'last-7': 'last-1w', 'last-30': 'last-1m', 'last-90': 'last-3m'};
const PULSE_DAY_MS = 86_400_000;
let pulseBrushDrag = null;
const PULSE_ACTIVITY_FILTERS = {
  all: 'All',
  assessment: 'Assessments',
  session: 'Sessions',
  user_created: 'User created',
  user_joined: 'User joined',
  program_completed: 'Program completed'
};
const PULSE_ACTIVITY_SORTS = {newest: 'Newest first', oldest: 'Oldest first', member: 'Member A–Z'};
const PULSE_MEMBERS_SORTS = {active: 'Most active', newest: 'Newest first', oldest: 'Oldest first', member: 'Member A–Z'};
const PULSE_MEDIAN_SORTS = {largest: 'Largest Δ', newest: 'Newest first', oldest: 'Oldest first', member: 'Member A–Z'};
const PULSE_CHART_BUCKETS = {day: 'Day', week: 'Week', month: 'Month'};
const PULSE_CHART_BUCKET_LIMITS = {min: 2, max: 40};

function teamOverviewUI() {
  const store = directoryUI();
  if (!store.pulse) store.pulse = {period: 'last-1m'};
  const ui = store.pulse;
  if (PULSE_LEGACY_PERIOD[ui.period]) ui.period = PULSE_LEGACY_PERIOD[ui.period];
  if (!TEAM_OVERVIEW_PERIODS[ui.period] && ui.period !== 'custom') ui.period = 'last-1m';
  if (!PULSE_ACTIVITY_FILTERS[ui.activityFilter]) ui.activityFilter = 'all';
  if (ui.pulseScreen === 'members') {
    if (!PULSE_MEMBERS_SORTS[ui.activitySort]) ui.activitySort = 'active';
  } else if (!PULSE_ACTIVITY_SORTS[ui.activitySort]) {
    ui.activitySort = 'newest';
  }
  if (ui.pulseGrouping !== 'members') ui.pulseGrouping = 'visits';
  if (ui.activitySearch == null) ui.activitySearch = '';
  if (ui.activityTypeOpen == null) ui.activityTypeOpen = false;
  if (ui.activitySortOpen == null) ui.activitySortOpen = false;
  if (ui.rangePickerOpen == null) ui.rangePickerOpen = false;
  if (!ui.pulseScreen) ui.pulseScreen = 'hub';
  if (!PULSE_MEDIAN_SORTS[ui.medianForceSort]) ui.medianForceSort = 'largest';
  if (ui.activityChartBucketOpen == null) ui.activityChartBucketOpen = false;
  pulseEnsureRange(ui);
  const chartWindow = pulsePeriodWindow(ui);
  if (!PULSE_CHART_BUCKETS[ui.activityChartBucket]) {
    ui.activityChartBucket = pulseDefaultChartBucket(chartWindow);
  } else if (!pulseChartBucketEnabled(chartWindow, ui.activityChartBucket)) {
    if (ui.period === 'custom') pulseClampRangeForChartBucket(ui, ui.activityChartBucket);
    else ui.activityChartBucket = pulseDefaultChartBucket(chartWindow);
  }
  return ui;
}

const PULSE_KPI_SCREENS = {totalActivity: 'activity', membersTotal: 'members', medianForceChange: 'medianForce'};

function pulseKpiScreenForId(id) {
  return PULSE_KPI_SCREENS[id] || null;
}

function pulseRecordForRow(row) {
  if (!pulseIsVisitRow(row)) return null;
  const colon = row.id.indexOf(':');
  if (colon < 0) return null;
  const recordId = row.id.slice(colon + 1);
  return pulseRecords(row.memberId).find(record => record.id === recordId) || null;
}

function pulseReportPreviousSession(record) {
  if (record.partial) return null;
  const time = record.completedAt ?? Number(record.id?.replace('session-', ''));
  const hold = record.type === 'strength' ? isometricHoldStyle(record.sessionSettings || record) : '';
  return pulseRecords(record.personId)
    .filter(previous =>
      previous.id !== record.id &&
      !previous.partial &&
      previous.type === record.type &&
      previous.purpose === record.purpose &&
      previous.positions === record.positions &&
      previous.reps === record.reps &&
      (record.type !== 'strength' || isometricHoldStyle(previous.sessionSettings || previous) === hold) &&
      (previous.completedAt ?? Number(previous.id?.replace('session-', ''))) < time
    )
    .sort((a, b) =>
      (b.completedAt ?? Number(b.id.replace('session-', ''))) -
      (a.completedAt ?? Number(a.id.replace('session-', '')))
    )[0] || null;
}

function pulseRowForceDelta(row) {
  if (!pulseIsVisitRow(row)) return null;
  const record = pulseRecordForRow(row);
  if (!record || record.type !== 'strength' || record.partial) return null;
  if (reportMetric(record).field !== 'force') return null;
  const prior = pulseReportPreviousSession(record);
  if (!prior) return null;
  const currentForce = reportData(record).force;
  const priorForce = reportData(prior).force;
  if (!Number.isFinite(currentForce) || !Number.isFinite(priorForce)) return null;
  const delta = Number((currentForce - priorForce).toFixed(2));
  return Number(Math.max(-2.5, Math.min(2.5, delta)).toFixed(2));
}

function pulseComparableForceDeltas(rows) {
  const deltas = [];
  for (const row of rows) {
    const delta = pulseRowForceDelta(row);
    if (delta != null) deltas.push(delta);
  }
  return deltas;
}

function pulseMedianValue(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function teamKpiDeltaForce(current, previous, options) {
  if (options?.comparePrior === false) return 'Comparable isometric visits';
  if (current == null && previous == null) return 'No comparable visits';
  if (current == null) return 'No comparable visits this period';
  if (previous == null) return 'No comparable visits in prior period';
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return 'Unchanged vs prior';
  const sign = diff > 0 ? '+' : '−';
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;
  return `${sign}${Math.abs(diff).toFixed(1)} kg (${sign}${Math.abs(pct).toFixed(0)}%) vs prior`;
}

function pulseMedianForceDisplay(kg) {
  if (kg == null || !Number.isFinite(kg)) return '—';
  const sign = kg >= 0 ? '+' : '−';
  return `${sign}${Math.abs(kg).toFixed(1)} kg`;
}

function pulseForceDeltaLabel(kg) {
  if (kg == null || !Number.isFinite(kg)) return '—';
  if (Math.abs(kg) < 0.05) return '±0.0 kg';
  const sign = kg >= 0 ? '+' : '−';
  return `${sign}${Math.abs(kg).toFixed(1)} kg`;
}

function pulseForceDeltaClass(kg) {
  if (kg == null || Math.abs(kg) < 0.05) return 'is-flat';
  return kg > 0 ? 'is-up' : 'is-down';
}

function pulsePerformanceCounts(rows) {
  const counts = {up: 0, flat: 0, down: 0, total: 0};
  for (const row of rows) {
    const delta = pulseRowForceDelta(row);
    if (delta == null) continue;
    counts.total++;
    const bucket = pulseForceDeltaClass(delta);
    if (bucket === 'is-up') counts.up++;
    else if (bucket === 'is-down') counts.down++;
    else counts.flat++;
  }
  return counts;
}

function pulsePerformanceTrend(current, prior, comparePrior) {
  if (!comparePrior) return null;
  if (!current.total && !prior.total) return {label: 'No comparable visits', class: '', dir: 'flat'};
  if (!prior.total) return {label: 'No prior data', class: '', dir: 'flat'};
  if (!current.total) return {label: 'No visits this period', class: '', dir: 'flat'};
  const curShare = current.up / current.total;
  const priShare = prior.up / prior.total;
  const diffPp = (curShare - priShare) * 100;
  if (Math.abs(diffPp) < 0.5) return {label: '0%', class: '', dir: 'flat'};
  const up = diffPp > 0;
  const sign = up ? '+' : '−';
  return {label: `${sign}${Math.abs(diffPp).toFixed(0)}%`, class: up ? 'is-up' : 'is-down', dir: up ? 'up' : 'down'};
}

function pulseChartBucketStart(at, mode) {
  const day = pulseMidnight(at);
  if (mode === 'day') return day;
  if (mode === 'week') {
    const dow = new Date(day).getUTCDay();
    return day - ((dow + 6) % 7) * PULSE_DAY_MS;
  }
  const date = new Date(day);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function pulseChartBucketKeys(window, mode) {
  const startDay = pulseMidnight(window.start);
  const endDay = pulseMidnight(window.end);
  const keys = [];
  if (mode === 'day') {
    for (let at = startDay; at <= endDay; at += PULSE_DAY_MS) keys.push(at);
    return keys;
  }
  if (mode === 'week') {
    let at = pulseChartBucketStart(startDay, 'week');
    if (at < startDay) at += 7 * PULSE_DAY_MS;
    while (at <= endDay) {
      keys.push(at);
      at += 7 * PULSE_DAY_MS;
    }
    return keys;
  }
  let at = pulseChartBucketStart(startDay, 'month');
  while (at <= endDay) {
    keys.push(at);
    const date = new Date(at);
    at = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return keys;
}

function pulseChartBucketCount(window, mode) {
  return pulseChartBucketKeys(window, mode).length;
}

function pulseChartBucketEnabled(window, mode) {
  if (!PULSE_CHART_BUCKETS[mode]) return false;
  const count = pulseChartBucketCount(window, mode);
  return count >= PULSE_CHART_BUCKET_LIMITS.min && count <= PULSE_CHART_BUCKET_LIMITS.max;
}

function pulseClampRangeForChartBucket(ui, mode) {
  if (!PULSE_CHART_BUCKETS[mode]) return;
  pulseEnsureRange(ui);
  const roster = typeof visiblePeople === 'function' ? visiblePeople() : [];
  const domain = pulseActivityExtent(roster);
  const domainStart = domain.start;
  const domainEndDay = domain.endDay;
  const domainEnd = domainEndDay + PULSE_DAY_MS - 1;
  let start = pulseMidnight(ui.rangeStart);
  let endDay = pulseMidnight(ui.rangeEnd);
  let end = endDay + PULSE_DAY_MS - 1;
  const {min, max} = PULSE_CHART_BUCKET_LIMITS;
  const countFor = () => pulseChartBucketCount(pulseWindowFromRange(start, end), mode);
  let guard = 0;
  while (countFor() > max && guard++ < 10_000) {
    if (start < endDay) {
      start += PULSE_DAY_MS;
      continue;
    }
    if (endDay > domainStart) {
      endDay -= PULSE_DAY_MS;
      end = endDay + PULSE_DAY_MS - 1;
      continue;
    }
    break;
  }
  guard = 0;
  while (countFor() < min && guard++ < 10_000) {
    let grew = false;
    if (endDay < domainEndDay) {
      endDay += PULSE_DAY_MS;
      end = endDay + PULSE_DAY_MS - 1;
      grew = true;
    } else if (start > domainStart) {
      start -= PULSE_DAY_MS;
      grew = true;
    }
    if (!grew) break;
  }
  if (start < domainStart) start = domainStart;
  if (endDay > domainEndDay) {
    endDay = domainEndDay;
    end = domainEnd;
  }
  ui.rangeStart = start;
  ui.rangeEnd = end;
  ui.period = pulsePresetMatching(start, end, roster);
}

function pulseDefaultChartBucket(window) {
  const prefs = ['day', 'week', 'month'];
  for (const mode of prefs) {
    if (pulseChartBucketEnabled(window, mode)) return mode;
  }
  for (const mode of Object.keys(PULSE_CHART_BUCKETS)) {
    if (pulseChartBucketCount(window, mode) >= 1) return mode;
  }
  return 'day';
}

function pulseActivityChartSeries(rows, window, mode) {
  const keys = pulseChartBucketKeys(window, mode);
  const map = new Map(keys.map(key => [key, {key, session: 0, assessment: 0}]));
  for (const row of rows) {
    if (row.at < window.start || row.at > window.end) continue;
    if (!pulseIsVisitRow(row)) continue;
    const key = pulseChartBucketStart(row.at, mode);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (row.purpose === 'assessment') bucket.assessment++;
    else if (row.purpose === 'session') bucket.session++;
  }
  const buckets = keys.map(key => {
    const item = map.get(key);
    return {...item, total: item.session + item.assessment};
  });
  const maxTotal = Math.max(1, ...buckets.map(bucket => bucket.total));
  return {buckets, maxTotal, mode};
}

function pulseChartBucketTitle(key, mode) {
  const date = new Date(key);
  const month = PULSE_MONTHS[date.getUTCMonth()];
  if (mode === 'month') return `${month} ${date.getUTCFullYear()}`;
  if (mode === 'week') return `Week of ${date.getUTCDate()} ${month}`;
  return `${date.getUTCDate()} ${month}`;
}

function pulseChartAxisLabel(key, mode, index, total) {
  const date = new Date(key);
  if (mode === 'month') {
    const every = total > 24 ? 3 : total > 12 ? 2 : 1;
    if (index % every) return '';
    return PULSE_MONTHS[date.getUTCMonth()];
  }
  if (mode === 'week') {
    const every = total > 20 ? 2 : 1;
    if (index % every) return '';
    return `${date.getUTCDate()} ${PULSE_MONTHS[date.getUTCMonth()]}`;
  }
  const every = total > 20 ? Math.ceil(total / 10) : total > 14 ? 2 : 1;
  if (index % every) return '';
  return String(date.getUTCDate());
}

function pulseActivityChartBucketPopover(ui, window) {
  if (!ui.activityChartBucketOpen) return '';
  const options = Object.entries(PULSE_CHART_BUCKETS).map(([value, label]) =>
    `<button type="button" class="pulse-activity-filter-option${ui.activityChartBucket === value ? ' is-selected' : ''}" data-action="pulse-chart-bucket" data-value="${value}" role="menuitemradio" aria-checked="${ui.activityChartBucket === value}">${escapeHTML(label)}</button>`
  ).join('');
  return `<div class="pulse-activity-filter-popover" id="pulse-chart-bucket-popover" role="menu" aria-label="Group dates by">${options}</div>`;
}

function pulseActivityChartTooltipMarkup(bucket, mode) {
  const title = pulseChartBucketTitle(bucket.key, mode);
  return `<p class="pulse-activity-chart-tooltip-title">${escapeHTML(title)}</p>
    <ul class="pulse-activity-chart-tooltip-list">
      <li><span class="pulse-activity-chart-tooltip-swatch pulse-activity-chart-tooltip-swatch--session" aria-hidden="true"></span>Sessions<span class="tabular">${bucket.session}</span></li>
      <li><span class="pulse-activity-chart-tooltip-swatch pulse-activity-chart-tooltip-swatch--assessment" aria-hidden="true"></span>Assessments<span class="tabular">${bucket.assessment}</span></li>
    </ul>`;
}

function pulseChartYTicks(maxTotal) {
  if (maxTotal <= 1) return [1, 0];
  if (maxTotal <= 4) return [maxTotal, 0];
  const mid = Math.max(1, Math.round(maxTotal / 2));
  return mid === maxTotal ? [maxTotal, Math.ceil(maxTotal / 2), 0] : [maxTotal, mid, 0];
}

function pulseActivityChartCard(model) {
  const {ui, window, activityAll} = model;
  const mode = ui.activityChartBucket;
  const series = pulseActivityChartSeries(activityAll, window, mode);
  let peakIndex = -1;
  let peakTotal = 0;
  series.buckets.forEach((bucket, index) => {
    if (bucket.total > peakTotal) {
      peakTotal = bucket.total;
      peakIndex = index;
    }
  });
  const bars = series.buckets.map((bucket, index) => {
    const total = bucket.total;
    const sessionH = total ? (bucket.session / series.maxTotal) * 100 : 0;
    const assessmentH = total ? (bucket.assessment / series.maxTotal) * 100 : 0;
    const label = pulseChartAxisLabel(bucket.key, mode, index, series.buckets.length);
    const tooltip = pulseActivityChartTooltipMarkup(bucket, mode);
    const peak = index === peakIndex && total > 0;
    return `<div class="pulse-activity-chart-bar-col" role="listitem">
      <button type="button" class="pulse-activity-chart-bar${total ? '' : ' is-empty'}${peak ? ' is-peak' : ''}" data-pulse-chart-index="${index}" aria-label="${escapeHTML(pulseChartBucketTitle(bucket.key, mode))}, ${bucket.session} sessions, ${bucket.assessment} assessments">
        <span class="pulse-activity-chart-bar-stack">
          ${assessmentH > 0 ? `<span class="pulse-activity-chart-seg pulse-activity-chart-seg--assessment" style="height:${assessmentH.toFixed(2)}%"></span>` : ''}
          ${sessionH > 0 ? `<span class="pulse-activity-chart-seg pulse-activity-chart-seg--session" style="height:${sessionH.toFixed(2)}%"></span>` : ''}
        </span>
      </button>
      <span class="pulse-activity-chart-x-label tabular">${escapeHTML(label)}</span>
      <template>${tooltip}</template>
    </div>`;
  }).join('');
  const bucketControl = `<div class="pulse-activity-filter-anchor">
    <button type="button" class="pulse-activity-bar-button pulse-activity-chart-bucket-button" data-action="pulse-chart-bucket-toggle" aria-haspopup="menu" aria-expanded="${ui.activityChartBucketOpen}" aria-label="Group dates by, ${escapeHTML(PULSE_CHART_BUCKETS[mode])}"${ui.activityChartBucketOpen ? ' aria-controls="pulse-chart-bucket-popover"' : ''}>
      <span class="muted">Group by</span> ${escapeHTML(PULSE_CHART_BUCKETS[mode])}
    </button>
    ${pulseActivityChartBucketPopover(ui, window)}
  </div>`;
  const yTicks = pulseChartYTicks(series.maxTotal);
  const yMarkup = yTicks.map(tick => `<span class="tabular">${tick}</span>`).join('');
  const yClass = yTicks.length === 2 ? ' pulse-activity-chart-y--compact' : '';
  const colCount = series.buckets.length;
  const barsAttrs = colCount <= 18 ? ` data-cols="${colCount}" style="--pulse-chart-cols:${colCount}"` : '';
  const legend = `<ul class="pulse-activity-chart-legend">
    <li><span class="pulse-activity-chart-legend-swatch pulse-activity-chart-legend-swatch--session"></span>Sessions</li>
    <li><span class="pulse-activity-chart-legend-swatch pulse-activity-chart-legend-swatch--assessment"></span>Assessments</li>
  </ul>`;
  return `<section class="pulse-activity-chart-card" aria-label="Activity over time">
    <header class="pulse-activity-chart-head">
      <h2 class="pulse-activity-chart-title">Activity over time</h2>
      ${bucketControl}
    </header>
    <div class="pulse-activity-chart-body">
      <div class="pulse-activity-chart-y${yClass}" aria-hidden="true">${yMarkup}</div>
      <div class="pulse-activity-chart-plot">
        <div class="pulse-activity-chart-grid" aria-hidden="true"></div>
        <div class="pulse-activity-chart-bars"${barsAttrs}>${bars}</div>
        <div class="pulse-activity-chart-tooltip" id="pulse-activity-chart-tooltip" role="tooltip" hidden></div>
      </div>
    </div>
    <footer class="pulse-activity-chart-foot">${legend}</footer>
    ${pulseBrushRow(model)}
  </section>`;
}

let pulseActivityChartTooltipHooked = false;

function pulseActivityChartHideTooltip() {
  const tip = document.getElementById('pulse-activity-chart-tooltip');
  if (!tip) return;
  tip.hidden = true;
  tip.innerHTML = '';
}

function pulseActivityChartShowTooltip(bar, clientX, clientY) {
  const tip = document.getElementById('pulse-activity-chart-tooltip');
  const template = bar.closest('.pulse-activity-chart-bar-col')?.querySelector('template');
  if (!tip || !template) return;
  tip.innerHTML = template.innerHTML;
  tip.hidden = false;
  const plot = bar.closest('.pulse-activity-chart-plot');
  if (!plot) return;
  const plotRect = plot.getBoundingClientRect();
  let left = clientX - plotRect.left;
  let top = clientY - plotRect.top - 8;
  tip.style.left = `${Math.max(8, Math.min(plotRect.width - 8, left))}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}

function pulseActivityChartBindTooltip() {
  if (pulseActivityChartTooltipHooked) return;
  pulseActivityChartTooltipHooked = true;
  document.addEventListener('pointerover', event => {
    if (state.nav !== 'pulse' || teamOverviewUI().pulseScreen !== 'hub') return;
    const bar = event.target.closest?.('.pulse-activity-chart-bar');
    if (!bar || bar.classList.contains('is-empty')) {
      if (!event.target.closest?.('.pulse-activity-chart-bar')) pulseActivityChartHideTooltip();
      return;
    }
    pulseActivityChartShowTooltip(bar, event.clientX, event.clientY);
  });
  document.addEventListener('pointermove', event => {
    if (state.nav !== 'pulse') return;
    const bar = event.target.closest?.('.pulse-activity-chart-bar');
    if (!bar || bar.classList.contains('is-empty')) return;
    pulseActivityChartShowTooltip(bar, event.clientX, event.clientY);
  });
  document.addEventListener('pointerleave', event => {
    const plot = event.target.closest?.('.pulse-activity-chart-plot');
    if (plot && !plot.contains(event.relatedTarget)) pulseActivityChartHideTooltip();
  });
  document.addEventListener('focusin', event => {
    const bar = event.target.closest?.('.pulse-activity-chart-bar');
    if (!bar || bar.classList.contains('is-empty')) return;
    const rect = bar.getBoundingClientRect();
    pulseActivityChartShowTooltip(bar, rect.left + rect.width / 2, rect.top);
  });
  document.addEventListener('focusout', event => {
    const plot = event.target.closest?.('.pulse-activity-chart-plot');
    if (plot && !plot.contains(event.relatedTarget)) pulseActivityChartHideTooltip();
  });
}

pulseActivityChartBindTooltip();

function pulsePerformanceBarSegment(id, value) {
  if (!value) return '';
  return `<span class="pulse-perf-bar-seg pulse-perf-bar-seg--${id}" style="flex-grow:${value}"></span>`;
}

function pulsePerformanceBarMarkup(counts) {
  if (!counts.total) return '';
  return `<div class="pulse-perf-bar-track">${pulsePerformanceBarSegment('up', counts.up)}${pulsePerformanceBarSegment('flat', counts.flat)}${pulsePerformanceBarSegment('down', counts.down)}</div>`;
}

function pulsePerformanceLegendRow(id, label, count, total) {
  const value = total ? String(count) : '—';
  return `<li class="pulse-perf-legend-item">
    <div class="pulse-perf-legend-head">
      <span class="pulse-perf-legend-pill pulse-perf-legend-pill--${id}" aria-hidden="true"></span>
      <span class="pulse-perf-legend-label">${escapeHTML(label)}</span>
    </div>
    <span class="pulse-perf-legend-value tabular">${escapeHTML(value)}</span>
  </li>`;
}

function pulseMemberPerformanceCard(model) {
  const counts = model.performance?.current || pulsePerformanceCounts(model.activityAll);
  const aria = counts.total
    ? `${counts.up} gaining, ${counts.flat} flat, ${counts.down} down, of ${counts.total} comparable visits`
    : 'No comparable isometric visits in this period.';
  const meta = counts.total
    ? `<p class="pulse-perf-meta muted tabular">${counts.total} comparable visits</p>`
    : '';
  const body = counts.total
    ? `<div class="pulse-perf-body">
        <div class="pulse-perf-bar" role="img" aria-label="${escapeHTML(aria)}">
          ${pulsePerformanceBarMarkup(counts)}
        </div>
        <ul class="pulse-perf-legend" aria-label="Force change breakdown">
          ${pulsePerformanceLegendRow('up', 'Gaining', counts.up, counts.total)}
          ${pulsePerformanceLegendRow('flat', 'Flat', counts.flat, counts.total)}
          ${pulsePerformanceLegendRow('down', 'Down', counts.down, counts.total)}
        </ul>
      </div>`
    : `<p class="pulse-perf-empty muted">${escapeHTML(aria)}</p>`;
  return `<section class="pulse-perf-card" aria-label="Member performance">
    <header class="pulse-perf-head">
      <h2 class="pulse-perf-title">Member performance</h2>
      ${meta || ''}
    </header>
    ${body}
  </section>`;
}

const PULSE_MEMBER_LINEUP_MAX = 6;
const PULSE_SMALL_ROSTER_MAX = 4;

function pulseMemberFirstName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return parts[0] || name;
}

function pulseActiveMemberSummaries(rows, roster) {
  const counts = new Map();
  for (const row of rows) {
    if (!pulseIsVisitRow(row)) continue;
    counts.set(row.memberId, (counts.get(row.memberId) || 0) + 1);
  }
  const face = id => roster.find(person => person.id === id) || {id, name: '—', initials: '•'};
  return [...counts.entries()]
    .map(([memberId, sessions]) => ({memberId, sessions, person: face(memberId)}))
    .sort((a, b) => b.sessions - a.sessions || a.person.name.localeCompare(b.person.name));
}

function pulseOpenAnalysisRecord(personId, recordId) {
  const record = pulseRecords(personId).find(item => item.id === recordId);
  if (!record || state.actor !== 'coach') return;
  state.personId = personId;
  state.result = record;
  state.stage = 'review';
  state.reportReturnTab = 'overview';
  state.memberOrigin = 'pulse';
  state.showCompare = reportCanCompare(record);
  state.reportDetails = false;
  render();
  window.scrollTo(0, 0);
}

function pulseActiveMembersMeta(total, rosterSize) {
  if (!total) return '<p class="pulse-perf-meta muted">No sessions in this range</p>';
  if (rosterSize <= PULSE_SMALL_ROSTER_MAX && total < rosterSize) {
    return `<p class="pulse-perf-meta muted tabular">${total} of ${rosterSize} in range</p>`;
  }
  return `<p class="pulse-perf-meta muted tabular">${total} in range</p>`;
}

function pulseActiveMembersLineupCard(model) {
  const rosterSize = model.roster.length;
  const smallRoster = rosterSize > 0 && rosterSize <= PULSE_SMALL_ROSTER_MAX;
  const summaries = pulseActiveMemberSummaries(model.activityAll, model.roster);
  const total = summaries.length;
  const shown = smallRoster ? summaries : summaries.slice(0, PULSE_MEMBER_LINEUP_MAX);
  const activeIds = new Set(shown.map(item => item.memberId));
  const quiet = smallRoster
    ? model.roster.filter(person => !activeIds.has(person.id))
    : [];
  const chips = shown.map(({memberId, sessions, person}) => {
    const name = escapeHTML(pulseMemberFirstName(person.name));
    return `<button type="button" class="pulse-member-chip" role="listitem" data-action="open-pulse-person" data-id="${escapeHTML(memberId)}" data-member-name="${escapeHTML(person.name)}" aria-label="${escapeHTML(person.name)}, ${sessions} sessions in range">
      ${avatar(person)}
      <span class="pulse-member-chip__name">${name}</span>
    </button>`;
  }).join('');
  const quietChips = quiet.map(person => {
    const name = escapeHTML(pulseMemberFirstName(person.name));
    return `<button type="button" class="pulse-member-chip pulse-member-chip--quiet" role="listitem" data-action="open-pulse-person" data-id="${escapeHTML(person.id)}" data-member-name="${escapeHTML(person.name)}" aria-label="${escapeHTML(person.name)}, no sessions in range">
      ${avatar(person)}
      <span class="pulse-member-chip__name">${name}</span>
    </button>`;
  }).join('');
  const hasLineup = shown.length + quiet.length > 0;
  const meta = hasLineup ? pulseActiveMembersMeta(total, rosterSize) : '';
  const body = hasLineup
    ? `<div class="pulse-member-lineup" role="list">${chips}${quietChips}</div>`
    : `<p class="pulse-perf-empty muted">No members with sessions in this range.</p>`;
  return `<section class="pulse-active-members-card" aria-label="Active members">
    <header class="pulse-perf-head pulse-active-members-head">
      <h2 class="pulse-perf-title">Active members</h2>
      ${meta}
    </header>
    ${body}
  </section>`;
}

function pulseHubBottomRow(model) {
  return `<div class="pulse-bottom-row">
    ${pulseMemberPerformanceCard(model)}
    ${pulseActiveMembersLineupCard(model)}
  </div>`;
}

function pulseActivityRadarScales(items) {
  const records = items.map(item => pulseRecordForRow(item)).filter(Boolean);
  return historyRadarScales(records);
}

function pulseActivityRadarCell(item, scales) {
  const record = pulseRecordForRow(item);
  if (!record) {
    return '<span class="pulse-activity-radar pulse-activity-radar--empty muted" aria-hidden="true">—</span>';
  }
  const metric = reportMetric(record);
  const radarMax = scales[metric.field] || (metric.field === 'range' ? 45 : 5);
  const stamp = item.timeLabel || sessionStamp(record);
  return `<button type="button" class="pulse-activity-radar" data-action="pulse-open-analysis" data-person-id="${escapeHTML(item.memberId)}" data-record-id="${escapeHTML(record.id)}" aria-label="Open ${escapeHTML(item.memberName)} report, ${escapeHTML(stamp)}">${historyRadar(record, radarMax)}</button>`;
}

function visitPulse() {
  if (state.actor !== 'coach') return;
  const ui = teamOverviewUI();
  ui.activityTypeOpen = false;
  ui.activitySortOpen = false;
  ui.rangePickerOpen = false;
  ui.pulseScreen = 'hub';
  state.nav = 'pulse';
  state.personId = null;
  state.pendingSetup = null;
  state.memberOrigin = 'pulse';
  render();
  window.scrollTo(0, 0);
}

function teamForceLabel(kg) {
  if (kg == null || !Number.isFinite(kg)) return null;
  const unit = teamSettings().forceUnit;
  return exportForce(kg, unit) + ' ' + exportForceUnits[unit].label;
}

function pulseWindowFromDays(days) {
  const end = PULSE_REPORTING_END;
  const start = end - days * 86_400_000 + 1;
  return {start, end, priorStart: start - days * 86_400_000, priorEnd: start - 1, days};
}

function pulseWindowFromRange(start, end) {
  const from = pulseMidnight(start);
  const to = pulseMidnight(end);
  const days = Math.max(1, Math.round((to - from) / 86_400_000) + 1);
  const rangeEnd = to + 86_400_000 - 1;
  return {start: from, end: rangeEnd, priorStart: from - days * 86_400_000, priorEnd: from - 1, days};
}

function pulseReportingToday() {
  const dayStart = pulseMidnight(PULSE_REPORTING_END);
  return {start: dayStart, end: dayStart + PULSE_DAY_MS - 1, days: 1};
}

function pulseActivityExtent(roster) {
  let minAt = Infinity;
  let maxAt = -Infinity;
  for (const member of roster) {
    for (const record of pulseRecords(member.id)) {
      const at = recordCompletedAt(record);
      if (at > 0) {
        minAt = Math.min(minAt, at);
        maxAt = Math.max(maxAt, at);
      }
    }
  }
  if (!Number.isFinite(minAt)) {
    const endDay = pulseMidnight(PULSE_REPORTING_END);
    const start = endDay - (90 - 1) * PULSE_DAY_MS;
    return {start, endDay, days: 90};
  }
  const start = pulseMidnight(minAt);
  const endDay = pulseMidnight(maxAt);
  const days = Math.max(1, Math.round((endDay - start) / PULSE_DAY_MS) + 1);
  return {start, endDay, days};
}

function pulseWindowForPreset(period, roster) {
  const domain = pulseActivityExtent(roster);
  if (period === 'today') {
    const today = pulseReportingToday();
    return {
      start: today.start,
      end: today.end,
      priorStart: today.start - PULSE_DAY_MS,
      priorEnd: today.start - 1,
      days: 1
    };
  }
  if (period === 'all') {
    const rangeEnd = domain.endDay + PULSE_DAY_MS - 1;
    return pulseWindowFromRange(domain.start, domain.endDay);
  }
  const days = PULSE_PERIOD_DAY_COUNT[period];
  if (days) return pulseWindowFromDays(days);
  return pulseWindowFromDays(30);
}

function pulseEnsureRange(ui) {
  if (Number.isFinite(ui.rangeStart) && Number.isFinite(ui.rangeEnd)) return;
  const roster = typeof visiblePeople === 'function' ? visiblePeople() : [];
  const period = ui.period === 'custom' ? 'last-1m' : (ui.period || 'last-1m');
  const preset = pulseWindowForPreset(period, roster);
  ui.rangeStart = preset.start;
  ui.rangeEnd = preset.end;
}

function pulsePresetMatching(start, end, roster) {
  const chosen = pulseWindowFromRange(start, end);
  for (const key of Object.keys(TEAM_OVERVIEW_PERIODS)) {
    const preset = pulseWindowForPreset(key, roster);
    if (pulseMidnight(preset.start) === chosen.start && pulseMidnight(preset.end) === pulseMidnight(chosen.end)) return key;
  }
  return 'custom';
}

function pulsePeriodWindow(ui) {
  pulseEnsureRange(ui);
  return pulseWindowFromRange(ui.rangeStart, ui.rangeEnd);
}

function pulseBrushDomain(roster) {
  return pulseActivityExtent(roster || (typeof visiblePeople === 'function' ? visiblePeople() : []));
}

function pulseBrushDomainEndMs(domain) {
  return domain.endDay + PULSE_DAY_MS - 1;
}

function pulseDayIndex(at, domainStart, domainDays) {
  const days = domainDays ?? pulseBrushDomain().days;
  return Math.max(0, Math.min(days - 1, Math.round((pulseMidnight(at) - domainStart) / PULSE_DAY_MS)));
}

function recordCompletedAt(record) {
  if (Number.isFinite(record.completedAt)) return record.completedAt;
  const day = parseInt(String(record.date).trim(), 10);
  if (Number.isFinite(day)) return Date.UTC(2026, 10, day, 12);
  return 0;
}

function recordInWindow(record, start, end) {
  const at = recordCompletedAt(record);
  return at >= start && at <= end;
}

function teamOverviewRecords(personId) {
  return [...state.history.filter(record => record.personId === personId), ...reportFixtureHistory(personId)]
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
}

function teamKpiTrend(current, previous) {
  const points = 14;
  if (current === 0 && previous === 0) return Array.from({length: points}, () => 0);
  const amplitude = Math.max(0.35, (current + previous) * 0.05);
  return Array.from({length: points}, (_, index) => {
    const t = index / (points - 1);
    const linear = previous + (current - previous) * t;
    const wave = Math.sin(index * 0.72) * amplitude * (1 - t * 0.35);
    return Math.max(0, Math.round(linear + wave));
  });
}

function teamKpiDelta(current, previous, options) {
  if (options?.comparePrior === false) {
    if (current === 0) return 'No activity recorded';
    return 'All time';
  }
  if (previous === 0 && current === 0) return 'No sessions in either period';
  if (previous === 0) return `${current} this period · none prior`;
  if (current === previous) return `Unchanged from ${previous}`;
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  const pct = (diff / previous) * 100;
  return `${sign}${diff} (${sign}${pct.toFixed(0)}%) vs prior`;
}

function teamActivityTimeLabel(record) {
  const at = recordCompletedAt(record);
  return sessionStamp({...record, completedAt: at});
}

function teamActivityResultSummary(record) {
  if (record.partial) return null;
  try {
    const metric = reportMetric(record);
    const data = reportData(record);
    if (metric.field === 'force') {
      const force = teamForceLabel(data.force);
      return force ? `Avg peak force ${force}` : `Avg peak force ${data.force.toFixed(1)} kg`;
    }
    if (metric.field === 'range') return `Avg range ${Math.round(data.range)}%`;
    if (metric.field === 'duration') return `Sustained effort ${data.duration.toFixed(1)} s`;
  } catch (_) {}
  return null;
}

function teamActivityPulseMetrics(record) {
  if (record.partial) return {force: null, stability: null};
  try {
    const data = reportData(record);
    const metric = reportMetric(record);
    const force = metric.field === 'force'
      ? (teamForceLabel(data.force) || `${data.force.toFixed(1)} kg`)
      : null;
    const stability = Number.isFinite(data.stability) ? Math.round(data.stability) : null;
    return {force, stability};
  } catch (_) {
    return {force: null, stability: null};
  }
}

function teamActivityMeta(record, memberRecords) {
  const proto = protocols[record.type]?.name || 'Session';
  const programName = record.programName || record.sessionSettings?.programName;
  const sessionNum = record.programSession ?? record.sessionSettings?.programSession;
  const programTotal = record.sessionSettings?.programTotal ?? record.programTotal;
  const purpose = record.purpose || 'session';

  if (record.partial) {
    return {
      purpose,
      badge: {label: 'Ended early', tone: 'early'},
      kindLabel: `${proto} session stopped before completion`
    };
  }
  if (programName && programTotal && sessionNum === programTotal) {
    return {
      purpose: 'session',
      badge: {label: 'Program complete', tone: 'notable'},
      kindLabel: `Completed “${programName}”`
    };
  }
  if (purpose === 'assessment') {
    const earlier = memberRecords.filter(
      r => r.purpose === 'assessment' && !r.partial && recordCompletedAt(r) < recordCompletedAt(record)
    );
    if (!earlier.length) {
      return {
        purpose: 'assessment',
        badge: {label: 'First assessment', tone: 'notable'},
        kindLabel: `${proto} assessment`
      };
    }
    return {
      purpose: 'assessment',
      badge: {label: 'Assessment', tone: 'assessment'},
      kindLabel: `${proto} assessment`
    };
  }
  if (programName && sessionNum) {
    return {
      purpose: 'session',
      badge: {label: 'Session', tone: 'session'},
      kindLabel: `${programName} · session ${sessionNum}`
    };
  }
  if (purpose === 'session') {
    return {
      purpose: 'session',
      badge: {label: 'Session', tone: 'session'},
      kindLabel: `${proto} session`
    };
  }
  return {
    purpose,
    badge: null,
    kindLabel: `${proto} session`
  };
}

function teamOverviewActivityRows(roster, periodKey) {
  const {start, end} = pulsePeriodWindow(periodKey);
  const rows = [];
  for (const member of roster) {
    const memberRecords = teamOverviewRecords(member.id);
    for (const record of memberRecords) {
      if (!recordInWindow(record, start, end)) continue;
      const meta = teamActivityMeta(record, memberRecords);
      rows.push({
        id: `${member.id}:${record.id}`,
        memberId: member.id,
        memberName: member.name,
        kindLabel: meta.kindLabel,
        badge: meta.badge,
        purpose: meta.purpose,
        resultSummary: teamActivityResultSummary(record),
        timeLabel: teamActivityTimeLabel(record),
        at: recordCompletedAt(record)
      });
    }
  }
  return rows;
}

function pulseKpiSnapshot(rows) {
  const visits = rows.filter(pulseIsVisitRow);
  const trainingSessions = visits.filter(row => row.purpose === 'session').length;
  const assessments = visits.filter(row => row.purpose === 'assessment').length;
  const membersActive = new Set(visits.map(row => row.memberId)).size;
  return {totalActivity: rows.length, membersActive, trainingSessions, assessments};
}

function teamOverviewKpis(roster, periodKey) {
  const window = pulsePeriodWindow(periodKey);
  const currentRows = teamOverviewActivityRows(roster, periodKey);
  const priorRows = [];
  for (const member of roster) {
    for (const record of teamOverviewRecords(member.id)) {
      if (!recordInWindow(record, window.priorStart, window.priorEnd)) continue;
      const meta = teamActivityMeta(record, teamOverviewRecords(member.id));
      priorRows.push({purpose: meta.purpose, memberId: member.id});
    }
  }
  const current = pulseKpiSnapshot(currentRows);
  const previous = pulseKpiSnapshot(priorRows);
  return [
    {id: 'totalActivity', label: 'Total activity', value: current.totalActivity, footnote: 'Completed sessions in the period', previous: previous.totalActivity},
    {id: 'membersActive', label: 'Active members', value: current.membersActive, footnote: 'Members with at least one session', previous: previous.membersActive}
  ].map(kpi => ({
    ...kpi,
    deltaLabel: teamKpiDelta(kpi.value, kpi.previous),
    trend: teamKpiTrend(kpi.value, kpi.previous)
  }));
}

function teamKpiSparkline(id, values) {
  if (values.length < 2) return '';
  const width = 112, height = 44, pad = 3;
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = pad + ((max - value) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = values.at(-1), first = values[0];
  const color = last > first ? 'var(--kpi-up)' : last < first ? 'var(--kpi-down)' : 'var(--muted)';
  return `<svg class="team-kpi-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`;
}

function pulseIsVisitRow(row) {
  return !row.activityType;
}

function pulseActivityMatchesFilter(row, filter) {
  if (filter === 'all') return true;
  if (filter === 'assessment') return row.purpose === 'assessment' && pulseIsVisitRow(row);
  if (filter === 'session') return row.purpose === 'session' && pulseIsVisitRow(row);
  if (filter === 'user_created') return row.activityType === 'user_created';
  if (filter === 'user_joined') return row.activityType === 'user_joined';
  if (filter === 'program_completed') return row.activityType === 'program_completed';
  return true;
}

function pulseActivityMatchesSearch(row, term) {
  if (!term) return true;
  return row.memberName.toLowerCase().includes(term);
}

function sortPulseActivity(rows, sortKey) {
  const list = [...rows];
  if (sortKey === 'oldest') list.sort((a, b) => a.at - b.at || a.memberName.localeCompare(b.memberName));
  else if (sortKey === 'member') list.sort((a, b) => a.memberName.localeCompare(b.memberName) || b.at - a.at);
  else list.sort((a, b) => b.at - a.at || a.memberName.localeCompare(b.memberName));
  return list;
}

function sortPulseMedianForce(rows, sortKey) {
  const list = [...rows];
  if (sortKey === 'largest') {
    list.sort((a, b) => Math.abs(b.forceDelta) - Math.abs(a.forceDelta) || b.at - a.at || a.memberName.localeCompare(b.memberName));
  } else if (sortKey === 'oldest') {
    list.sort((a, b) => a.at - b.at || a.memberName.localeCompare(b.memberName));
  } else if (sortKey === 'member') {
    list.sort((a, b) => a.memberName.localeCompare(b.memberName) || b.at - a.at);
  } else {
    list.sort((a, b) => b.at - a.at || a.memberName.localeCompare(b.memberName));
  }
  return list;
}

function teamActivityBadgeMarkup(badge) {
  if (!badge) return '';
  return `<span class="team-overview-activity-badge team-overview-activity-badge--${badge.tone}">${escapeHTML(badge.label)}</span>`;
}

const PULSE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pulseMemberSeed(personId) {
  let n = 0;
  for (let i = 0; i < personId.length; i++) n = (n * 33 + personId.charCodeAt(i)) % 997;
  return n;
}

function pulseStampLabel(at) {
  const date = new Date(at);
  return `${date.getUTCDate()} ${PULSE_MONTHS[date.getUTCMonth()]}`;
}

function pulseHistoryExtras(personId) {
  const person = people.find(item => item.id === personId);
  if (!person?.baseline) return [];
  const offset = pulseMemberSeed(personId) % 5;
  const slots = [
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 7, 19 + offset, 14, 30)},
    {type: 'strength', purpose: 'session', at: Date.UTC(2026, 8, 6 + (offset % 3), 10, 30)},
    {type: 'rom', purpose: 'assessment', at: Date.UTC(2026, 8, 26 + (offset % 4), 11, 30)},
    {type: 'strength', purpose: 'session', at: Date.UTC(2026, 9, 10 + (offset % 2), 15, 30)},
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 9, 28 + offset, 9, 30)},
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 10, 12, 11, offset % 45)},
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 10, 13, 9, 30 + offset)}
  ];
  return slots.map((item, index) => {
    const record = historyFixture(item.type, pulseStampLabel(item.at), personId);
    record.id = `pulse-extra-${personId}-${index}`;
    record.purpose = item.purpose;
    record.completedAt = item.at;
    record.date = pulseStampLabel(item.at);
    return record;
  });
}

function pulseDemoForceDriftKg(record) {
  if (record.type !== 'strength' || record.partial) return null;
  if (reportMetric(record).field !== 'force') return null;
  const at = recordCompletedAt(record);
  if (!at) return null;
  const epoch = pulseMidnight(Date.UTC(2026, 8, 1));
  const days = Math.max(0, Math.round((pulseMidnight(at) - epoch) / PULSE_DAY_MS));
  return Number((0.15 + days * 0.21).toFixed(2));
}

function pulseRecords(personId) {
  return [...teamOverviewRecords(personId), ...pulseHistoryExtras(personId)]
    .map(record => {
      const drift = pulseDemoForceDriftKg(record);
      if (drift == null) return record;
      return {...record, pulseForceDriftKg: drift};
    })
    .sort((a, b) => recordCompletedAt(b) - recordCompletedAt(a));
}

function pulseEnsureEventStore() {
  if (!Array.isArray(state.pulseEvents)) state.pulseEvents = [];
}

function pulseMembershipKindForPerson(person) {
  if (person.existingAccount) return 'user_joined';
  if (!person.baseline || person.detail === 'New member' || person.createdInDemo) return 'user_created';
  return null;
}

function pulseEmitMembershipEvent(person, kind, at = Date.now()) {
  if (!person?.id || (kind !== 'user_created' && kind !== 'user_joined')) return;
  pulseEnsureEventStore();
  state.pulseEvents = state.pulseEvents.filter(
    event => !(event.memberId === person.id && (event.type === 'user_created' || event.type === 'user_joined'))
  );
  state.pulseEvents.push({
    id: `membership-${person.id}`,
    type: kind,
    memberId: person.id,
    at,
    actorId: state.clinicianId
  });
}

function pulseProgramCompletionAt(plan, personId) {
  if (!plan || plan.completed < plan.total) return null;
  const visits = [
    ...(plan.exampleVisits || []),
    ...state.history.filter(record => record.personId === personId && record.programId === plan.id)
  ];
  const finalVisit = visits
    .filter(record => !record.partial && record.programSession === plan.total)
    .sort((a, b) => recordCompletedAt(b) - recordCompletedAt(a))[0];
  return finalVisit ? recordCompletedAt(finalVisit) : null;
}

function pulseEmitProgramCompleted(plan, personId, at) {
  if (!plan || plan.completed < plan.total) return;
  pulseEnsureEventStore();
  const completedAt = at ?? pulseProgramCompletionAt(plan, personId) ?? Date.now();
  const id = `program-complete-${plan.id}`;
  if (state.pulseEvents.some(event => event.id === id)) return;
  state.pulseEvents.push({
    id,
    type: 'program_completed',
    memberId: personId,
    programId: plan.id,
    programName: plan.name,
    at: completedAt,
    actorId: state.clinicianId
  });
}

function pulseSeedDemoLifecycleEvents(roster) {
  pulseEnsureEventStore();
  if (state.pulseEventsSeeded) return;
  state.pulseEventsSeeded = true;
  const demoMembership = [
    {memberId: 'ella', type: 'user_created', at: Date.UTC(2026, 9, 28, 10, 0), actorId: 'sam'},
    {memberId: 'lena', type: 'user_created', at: Date.UTC(2026, 10, 5, 14, 0), actorId: 'sam'},
    {memberId: 'oliver', type: 'user_created', at: Date.UTC(2026, 10, 11, 9, 0), actorId: 'sam'},
    {memberId: 'priya', type: 'user_joined', at: Date.UTC(2026, 10, 2, 16, 0), actorId: 'sam'}
  ];
  for (const event of demoMembership) {
    if (!roster.some(person => person.id === event.memberId)) continue;
    if (state.pulseEvents.some(existing => existing.id === `membership-${event.memberId}`)) continue;
    state.pulseEvents.push({id: `membership-${event.memberId}`, ...event});
  }
  for (const member of roster) {
    for (const plan of memberPrograms(member.id)) {
      if (plan.completed < plan.total) continue;
      pulseEmitProgramCompleted(plan, member.id);
    }
  }
}

function pulseLifecycleEventCatalog(roster) {
  pulseSeedDemoLifecycleEvents(roster);
  const events = [...state.pulseEvents];
  const seenPrograms = new Set(events.filter(event => event.type === 'program_completed').map(event => event.id));
  for (const member of roster) {
    for (const plan of memberPrograms(member.id)) {
      if (plan.completed < plan.total) continue;
      const id = `program-complete-${plan.id}`;
      if (seenPrograms.has(id)) continue;
      const at = pulseProgramCompletionAt(plan, member.id);
      if (!at) continue;
      events.push({
        id,
        type: 'program_completed',
        memberId: member.id,
        programId: plan.id,
        programName: plan.name,
        at,
        actorId: member.assigned
      });
    }
  }
  return events;
}

function pulseLifecycleMeta(event) {
  const actor = clinicians.find(item => item.id === event.actorId) || clinician();
  const actorName = actor?.name || 'Staff';
  if (event.type === 'user_created') {
    return {
      activityType: 'user_created',
      purpose: 'lifecycle',
      kindLabel: `${actorName} created this account`,
      badge: {label: 'User created', tone: 'membership'}
    };
  }
  if (event.type === 'user_joined') {
    return {
      activityType: 'user_joined',
      purpose: 'lifecycle',
      kindLabel: `${actorName} added them to the team`,
      badge: {label: 'User joined', tone: 'membership'}
    };
  }
  if (event.type === 'program_completed') {
    const name = event.programName || 'Program';
    return {
      activityType: 'program_completed',
      purpose: 'lifecycle',
      kindLabel: `Completed “${name}”`,
      badge: {label: 'Program completed', tone: 'notable'}
    };
  }
  return null;
}

function pulseLifecycleRows(roster, start, end) {
  const rows = [];
  for (const event of pulseLifecycleEventCatalog(roster)) {
    if (event.at < start || event.at > end) continue;
    const member = roster.find(person => person.id === event.memberId) || people.find(person => person.id === event.memberId);
    if (!member) continue;
    const meta = pulseLifecycleMeta(event);
    if (!meta) continue;
    rows.push({
      id: `${member.id}:pulse-${event.id}`,
      memberId: member.id,
      memberName: member.name,
      activityType: meta.activityType,
      kindLabel: meta.kindLabel,
      badge: meta.badge,
      purpose: meta.purpose,
      resultSummary: null,
      metrics: {force: null, stability: null},
      timeLabel: pulseStampLabel(event.at),
      at: event.at
    });
  }
  return rows;
}

function pulseRowsInWindow(roster, start, end) {
  const rows = [];
  for (const member of roster) {
    const memberRecords = pulseRecords(member.id);
    for (const record of memberRecords) {
      if (record.partial || !recordInWindow(record, start, end)) continue;
      const meta = teamActivityMeta(record, memberRecords);
      rows.push({
        id: `${member.id}:${record.id}`,
        memberId: member.id,
        memberName: member.name,
        kindLabel: meta.kindLabel,
        badge: meta.badge,
        purpose: meta.purpose,
        resultSummary: teamActivityResultSummary(record),
        metrics: teamActivityPulseMetrics(record),
        timeLabel: teamActivityTimeLabel(record),
        at: recordCompletedAt(record)
      });
    }
  }
  return [...rows, ...pulseLifecycleRows(roster, start, end)];
}

function pulseBrushSeries(roster) {
  const domain = pulseBrushDomain(roster);
  const rows = pulseRowsInWindow(roster, domain.start, pulseBrushDomainEndMs(domain)).filter(pulseIsVisitRow);
  const counts = Array(domain.days).fill(0);
  for (const row of rows) {
    counts[pulseDayIndex(row.at, domain.start)]++;
  }
  return {domain, counts, max: Math.max(1, ...counts)};
}

function pulseTeamMembers(roster, end) {
  const joinedAt = new Map(
    pulseLifecycleEventCatalog(roster)
      .filter(event => event.type === 'user_created' || event.type === 'user_joined')
      .map(event => [event.memberId, event.at])
  );
  return roster
    .map(person => ({person, joinedAt: joinedAt.get(person.id) ?? null}))
    .filter(member => member.joinedAt == null || member.joinedAt <= end);
}

function pulseNewMembersDelta(total, added, comparePrior) {
  if (!comparePrior || !total) return {deltaLabel: null};
  if (!added) return {deltaLabel: 'No new members', deltaSpoken: 'No new members'};
  return {deltaLabel: `+${added} new`, deltaSpoken: `${added} new this period`};
}

function pulseModel() {
  const ui = teamOverviewUI();
  const roster = visiblePeople();
  const window = pulsePeriodWindow(ui);
  const period = TEAM_OVERVIEW_PERIODS[ui.period] || {presetLabel: `${window.days} days`};
  const currentRows = pulseRowsInWindow(roster, window.start, window.end);
  const priorRows = pulseRowsInWindow(roster, window.priorStart, window.priorEnd);
  const current = pulseKpiSnapshot(currentRows);
  const previous = pulseKpiSnapshot(priorRows);
  const currentForceDeltas = pulseComparableForceDeltas(currentRows);
  const priorForceDeltas = pulseComparableForceDeltas(priorRows);
  const medianForce = pulseMedianValue(currentForceDeltas);
  const medianForcePrior = pulseMedianValue(priorForceDeltas);
  const comparePrior = ui.period !== 'all';
  const members = pulseTeamMembers(roster, window.end);
  const newMembers = members.filter(member => member.joinedAt != null && member.joinedAt >= window.start).length;
  const kpis = [
    {
      id: 'totalActivity',
      label: 'Total activity',
      value: current.totalActivity,
      deltaLabel: teamKpiDelta(current.totalActivity, previous.totalActivity, {comparePrior})
    },
    {id: 'membersTotal', label: 'Total members', value: members.length, ...pulseNewMembersDelta(members.length, newMembers, comparePrior)},
    {
      id: 'medianForceChange',
      label: 'Median force change',
      value: medianForce,
      displayValue: pulseMedianForceDisplay(medianForce),
      deltaLabel: teamKpiDeltaForce(medianForce, medianForcePrior, {comparePrior})
    }
  ];
  const activity = sortPulseActivity(
    currentRows.filter(row => pulseActivityMatchesFilter(row, ui.activityFilter) && pulseActivityMatchesSearch(row, ui.activitySearch.trim().toLowerCase())),
    ui.activitySort
  );
  const performanceCurrent = pulsePerformanceCounts(currentRows);
  const performancePrior = pulsePerformanceCounts(priorRows);
  const performance = {
    current: performanceCurrent,
    prior: performancePrior,
    trend: pulsePerformanceTrend(performanceCurrent, performancePrior, comparePrior)
  };
  return {
    ui, roster, members, period, window, kpis, activityAll: currentRows, activity, performance,
    brush: pulseBrushSeries(roster),
    team: teamSettings()
  };
}

function pulseMidnight(at) {
  const date = new Date(at);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function pulseDateRange(start, end) {
  const from = new Date(pulseMidnight(start));
  const to = new Date(pulseMidnight(end));
  const day = date => date.getUTCDate();
  const month = date => PULSE_MONTHS[date.getUTCMonth()];
  const year = date => date.getUTCFullYear();
  if (year(from) === year(to) && from.getUTCMonth() === to.getUTCMonth()) {
    return `${day(from)}–${day(to)} ${month(to)} ${year(to)}`;
  }
  if (year(from) === year(to)) {
    return `${day(from)} ${month(from)} – ${day(to)} ${month(to)} ${year(to)}`;
  }
  return `${day(from)} ${month(from)} ${year(from)} – ${day(to)} ${month(to)} ${year(to)}`;
}

function pulseBrushWindowFlushClass(layout) {
  const endLeft = layout.left + layout.width;
  const flushStart = layout.left <= 0.5;
  const flushEnd = endLeft >= 99.5;
  return `${flushStart ? ' is-flush-start' : ''}${flushEnd ? ' is-flush-end' : ''}`;
}

function pulseBrushSyncWindow(windowEl, layout) {
  if (!windowEl) return;
  windowEl.style.left = `${layout.left}%`;
  windowEl.style.width = `${Math.min(layout.width, 100 - layout.left)}%`;
  windowEl.classList.toggle('is-flush-start', layout.left <= 0.5);
  windowEl.classList.toggle('is-flush-end', layout.left + layout.width >= 99.5);
}

function pulseBrushLayout(startI, endI, domain) {
  const brushDomain = domain || pulseBrushDomain();
  const brushDays = brushDomain.days;
  const a = Math.min(startI, endI);
  const b = Math.max(startI, endI);
  const start = brushDomain.start + a * PULSE_DAY_MS;
  const end = brushDomain.start + b * PULSE_DAY_MS + PULSE_DAY_MS - 1;
  const span = b - a + 1;
  return {
    a, b,
    left: (a / brushDays) * 100,
    width: ((b - a + 1) / brushDays) * 100,
    start, end, span,
    label: pulseDateRange(start, end)
  };
}

function pulseInputDate(at) {
  const date = new Date(pulseMidnight(at));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pulseParseInputDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function pulseRangePickerMonthGrid(rangeStart, rangeEnd) {
  const view = new Date(pulseMidnight(rangeEnd));
  const year = view.getUTCFullYear();
  const month = view.getUTCMonth();
  const title = `${PULSE_MONTHS[month]} ${year}`;
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const rangeStartDay = pulseMidnight(rangeStart);
  const rangeEndDay = pulseMidnight(rangeEnd);
  let cells = '';
  for (let pad = 0; pad < firstDow; pad++) cells += '<span class="pulse-cal-pad" aria-hidden="true"></span>';
  for (let day = 1; day <= daysInMonth; day++) {
    const at = Date.UTC(year, month, day);
    const inRange = at >= rangeStartDay && at <= rangeEndDay;
    const endpoint = at === rangeStartDay || at === rangeEndDay;
    cells += `<button type="button" class="pulse-cal-day${inRange ? ' is-in-range' : ''}${endpoint ? ' is-endpoint' : ''}" tabindex="-1" aria-disabled="true">${day}</button>`;
  }
  return `<div class="pulse-range-calendar" aria-hidden="true">
    <div class="pulse-range-calendar-head">
      <button type="button" class="pulse-cal-nav" tabindex="-1" aria-label="Previous month">${icon('chevron', 'icon-sm pulse-cal-prev')}</button>
      <strong>${escapeHTML(title)}</strong>
      <button type="button" class="pulse-cal-nav" tabindex="-1" aria-label="Next month">${icon('chevron', 'icon-sm pulse-cal-next')}</button>
    </div>
    <div class="pulse-cal-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
    <div class="pulse-cal-grid">${cells}</div>
  </div>`;
}

const PULSE_RANGE_PICKER_GAP = 8;
const PULSE_RANGE_PICKER_MARGIN = 12;
let pulseRangePickerLayoutHooked = false;

function pulseRangePickerBounds() {
  const shell = document.querySelector('.templates-layered-shell .shell-main') || document.querySelector('.shell-main');
  const margin = PULSE_RANGE_PICKER_MARGIN;
  if (!shell) {
    return {left: margin, top: margin, right: window.innerWidth - margin, bottom: window.innerHeight - margin};
  }
  const rect = shell.getBoundingClientRect();
  return {left: rect.left + margin, top: rect.top + margin, right: rect.right - margin, bottom: rect.bottom - margin};
}

function pulseRangePickerOverflows(picker, bounds) {
  const rect = picker.getBoundingClientRect();
  return rect.left < bounds.left - 0.5
    || rect.top < bounds.top - 0.5
    || rect.right > bounds.right + 0.5
    || rect.bottom > bounds.bottom + 0.5;
}

function pulseRangePickerTeardown() {
  document.querySelectorAll('#pulse-range-picker').forEach(node => node.remove());
}

function pulseRangePickerEnsureMounted() {
  const nodes = [...document.querySelectorAll('#pulse-range-picker')];
  if (!nodes.length) return null;
  const picker = nodes.pop();
  nodes.forEach(node => node.remove());
  if (picker.parentElement !== document.body) document.body.appendChild(picker);
  return picker;
}

function pulseRangePickerFit(picker) {
  const trigger = document.getElementById('pulse-brush-label');
  if (!picker || !trigger) return false;
  const bounds = pulseRangePickerBounds();
  const maxW = Math.max(200, bounds.right - bounds.left);
  picker.style.position = 'fixed';
  picker.style.right = 'auto';
  picker.style.bottom = 'auto';
  picker.style.width = `${Math.min(320, maxW)}px`;
  picker.style.maxHeight = `${Math.max(240, bounds.bottom - bounds.top)}px`;
  picker.style.overflow = 'auto';

  const triggerRect = trigger.getBoundingClientRect();
  const gap = PULSE_RANGE_PICKER_GAP;
  let top = triggerRect.bottom + gap;
  const pickerH = picker.offsetHeight;
  if (top + pickerH > bounds.bottom) top = triggerRect.top - gap - pickerH;
  if (top < bounds.top) top = bounds.top;

  let left = triggerRect.left;
  const pickerW = picker.offsetWidth;
  if (left + pickerW > bounds.right) left = bounds.right - pickerW;
  if (left < bounds.left) left = bounds.left;

  picker.style.top = `${Math.round(top)}px`;
  picker.style.left = `${Math.round(left)}px`;

  const rect = picker.getBoundingClientRect();
  if (rect.left < bounds.left) left += bounds.left - rect.left;
  if (rect.right > bounds.right) left -= rect.right - bounds.right;
  if (rect.top < bounds.top) top += bounds.top - rect.top;
  if (rect.bottom > bounds.bottom) top -= rect.bottom - bounds.bottom;

  picker.style.top = `${Math.round(top)}px`;
  picker.style.left = `${Math.round(left)}px`;
  return !pulseRangePickerOverflows(picker, bounds);
}

function pulseRangePickerBindLayout() {
  if (pulseRangePickerLayoutHooked) return;
  pulseRangePickerLayoutHooked = true;
  const refit = () => {
    if (!teamOverviewUI().rangePickerOpen) return;
    pulseRangePickerPosition();
  };
  window.addEventListener('resize', refit);
  window.addEventListener('scroll', refit, true);
}

function pulseRangePickerPosition() {
  pulseRangePickerBindLayout();
  const picker = pulseRangePickerEnsureMounted();
  if (!picker) return;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (pulseRangePickerFit(picker)) return;
  }
}

function pulseRangePickerAfterRender() {
  if (!teamOverviewUI().rangePickerOpen) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => pulseRangePickerPosition());
  });
}

function pulseRangePickerPanel(model) {
  if (!model.ui.rangePickerOpen) return '';
  const startVal = pulseInputDate(model.window.start);
  const endVal = pulseInputDate(model.window.end);
  return `<div class="pulse-range-picker" id="pulse-range-picker" role="dialog" aria-label="Custom date range">
    <p class="pulse-range-picker-title">Custom range</p>
    <div class="pulse-range-picker-fields">
      <label class="pulse-range-field"><span class="pulse-range-field-label">Start</span><input type="date" id="pulse-range-start" value="${startVal}"></label>
      <label class="pulse-range-field"><span class="pulse-range-field-label">End</span><input type="date" id="pulse-range-end" value="${endVal}"></label>
    </div>
    ${pulseRangePickerMonthGrid(model.window.start, model.window.end)}
    <div class="pulse-range-picker-actions">
      <button type="button" class="text-button" data-action="pulse-range-picker-cancel">Cancel</button>
      <button type="button" class="button small-button primary" data-action="pulse-range-picker-apply">Apply</button>
    </div>
  </div>`;
}

function pulseBrushMonthMarks(domain) {
  const marks = [];
  for (let index = 0; index < domain.days; index++) {
    const at = domain.start + index * 86_400_000;
    const date = new Date(at);
    if (index && date.getUTCDate() !== 1) continue;
    marks.push(`<span style="left:${(index / domain.days) * 100}%">${PULSE_MONTHS[date.getUTCMonth()]}</span>`);
  }
  return marks.join('');
}

function pulseBrushLinePoints(counts, max) {
  const n = counts.length || 1;
  const top = 14;
  const bottom = 86;
  return counts.map((count, index) => {
    const x = ((index + 0.5) / n) * 100;
    const y = bottom - (max ? count / max : 0) * (bottom - top);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function pulseBrushLineMarkup(counts, max, layout) {
  const points = pulseBrushLinePoints(counts, max);
  const width = Math.min(layout.width, 100 - layout.left);
  return `<svg class="pulse-brush-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id="pulse-brush-line-clip">
            <rect class="pulse-brush-line-clip" x="${layout.left}" y="0" width="${width}" height="100"></rect>
          </clipPath>
        </defs>
        <polyline class="pulse-brush-line-base" points="${points}"></polyline>
        <polyline class="pulse-brush-line-in" points="${points}" clip-path="url(#pulse-brush-line-clip)"></polyline>
      </svg>`;
}

function pulseBrushLayoutFromModel(model) {
  const domain = model.brush.domain;
  const startI = pulseDayIndex(model.window.start, domain.start, domain.days);
  const endI = pulseDayIndex(model.window.end, domain.start, domain.days);
  return pulseBrushLayout(startI, endI, domain);
}

function pulseBrushPresetsMarkup(model) {
  return Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
    `<button type="button" class="${model.ui.period === value ? 'active' : ''}" data-action="pulse-period" data-value="${value}" aria-pressed="${model.ui.period === value}" aria-label="${escapeHTML(item.ariaLabel)}" title="${escapeHTML(item.title)}">${escapeHTML(item.presetLabel)}</button>`
  ).join('');
}

function pulseBrushTrackMarkup(model, layout) {
  return `<div class="pulse-brush-track pulse-brush-track--inline" role="group" aria-labelledby="pulse-brush-label" title="Drag to set a custom date range">
    <div class="pulse-brush-stage">
      ${pulseBrushLineMarkup(model.brush.counts, model.brush.max, layout)}
    </div>
    <div class="pulse-brush-window${pulseBrushWindowFlushClass(layout)}" data-brush="move" style="left:${layout.left}%;width:${Math.min(layout.width, 100 - layout.left)}%"></div>
    <button type="button" class="pulse-brush-handle is-start" data-brush="start" style="left:${layout.left}%" aria-label="Start of range"></button>
    <button type="button" class="pulse-brush-handle is-end" data-brush="end" style="left:${layout.left + layout.width}%" aria-label="End of range"></button>
  </div>`;
}

function pulseRangeLabelMarkup(model, layout) {
  return `<div class="pulse-range-label-anchor">
    <button type="button" class="pulse-range-label-button tabular" id="pulse-brush-label" data-action="pulse-range-picker-toggle" aria-haspopup="dialog" aria-expanded="${model.ui.rangePickerOpen}" aria-label="Date range, ${escapeHTML(layout.label)}. Choose dates"${model.ui.rangePickerOpen ? ' aria-controls="pulse-range-picker"' : ''}>
      <span class="pulse-range-label-text">${escapeHTML(layout.label)}</span>
      ${icon('calendar', 'icon-sm')}
    </button>
    ${pulseRangePickerPanel(model)}
  </div>`;
}

function pulseRangeHeaderControls(model) {
  const layout = pulseBrushLayoutFromModel(model);
  return `<div class="pulse-range-header" aria-label="Date range for this stretch">
    <div class="pulse-brush-presets segmented" role="group" aria-label="Reporting period presets">
      ${pulseBrushPresetsMarkup(model)}
    </div>
    ${pulseRangeLabelMarkup(model, layout)}
  </div>`;
}

function pulseBrushRow(model) {
  const layout = pulseBrushLayoutFromModel(model);
  return `<div class="pulse-brush-row" aria-label="Adjust reporting period">${pulseBrushTrackMarkup(model, layout)}</div>`;
}

function pulseHead(model) {
  return `<header class="settings-pane-head team-overview-head pulse-head-compact">
    <div class="settings-pane-head-row team-overview-head-row">
      <div class="settings-pane-head-text">
        <h1>Pulse</h1>
      </div>
      ${pulseRangeHeaderControls(model)}
    </div>
  </header>`;
}

function pulseKpiDeltaClass(label) {
  if (label.startsWith('+')) return 'is-up';
  if (label.startsWith('-') || label.startsWith('−')) return 'is-down';
  return '';
}

function pulseMetricLabel(id) {
  if (id === 'totalActivity') return 'Activity';
  if (id === 'membersTotal') return 'Total members';
  if (id === 'medianForceChange') return 'Median force change';
  return id;
}

function pulseKpiShowsSelected(ui, id) {
  const screen = pulseKpiScreenForId(id);
  return screen ? (ui.pulseScreen || 'hub') === screen : false;
}

function pulseKpiDetailLabel(id) {
  const screen = pulseKpiScreenForId(id);
  if (screen === 'activity') return 'activity';
  if (screen === 'members') return 'members';
  if (screen === 'medianForce') return 'median force change';
  return 'detail';
}

function pulseKpiButtonAriaLabel(kpi) {
  const label = pulseMetricLabel(kpi.id);
  const display = kpi.displayValue ?? kpi.value;
  const detail = pulseKpiDetailLabel(kpi.id);
  const delta = kpi.deltaSpoken ?? kpi.deltaLabel;
  return `${label}, ${display}.${delta ? ` ${delta}.` : ''} View ${detail}.`;
}

function pulseKpiStrip(kpis, ui) {
  return `<div class="pulse-kpi-strip" aria-label="Summary for this stretch">${kpis.map(kpi => {
    const selected = pulseKpiShowsSelected(ui, kpi.id);
    const display = kpi.displayValue ?? kpi.value;
    return `<button type="button" class="team-overview-kpi pulse-kpi-strip-card pulse-kpi-strip-button${selected ? ' is-selected' : ''}" data-action="pulse-kpi" data-value="${kpi.id}" aria-pressed="${selected}" aria-label="${escapeHTML(pulseKpiButtonAriaLabel(kpi))}">
      <span class="pulse-kpi-strip-label">${pulseMetricLabel(kpi.id)}${icon('chevron', 'icon-sm pulse-kpi-strip-go')}</span>
      <span class="team-overview-kpi-value tabular">${escapeHTML(String(display))}</span>
      ${kpi.deltaLabel ? `<p class="team-overview-kpi-delta ${pulseKpiDeltaClass(kpi.deltaLabel)}">${escapeHTML(kpi.deltaLabel)}</p>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function pulseMemberGroups(activity, sortKey, members = []) {
  const groups = new Map(members.map(({person}) => [person.id, {memberId: person.id, memberName: person.name, events: []}]));
  for (const row of activity) {
    if (!groups.has(row.memberId)) groups.set(row.memberId, {memberId: row.memberId, memberName: row.memberName, events: []});
    groups.get(row.memberId).events.push(row);
  }
  const byName = (a, b) => a.memberName.localeCompare(b.memberName);
  const list = [...groups.values()];
  if (sortKey === 'active') return list.sort((a, b) => b.events.length - a.events.length || byName(a, b));
  if (sortKey === 'member') return list.sort(byName);
  const firstIndex = new Map();
  activity.forEach((row, index) => {
    if (!firstIndex.has(row.memberId)) firstIndex.set(row.memberId, index);
  });
  return list.sort((a, b) => (firstIndex.get(a.memberId) ?? Infinity) - (firstIndex.get(b.memberId) ?? Infinity) || byName(a, b));
}

function pulseSortCatalog(ui) {
  if (ui.pulseScreen === 'medianForce') return PULSE_MEDIAN_SORTS;
  if (ui.pulseScreen === 'members') return PULSE_MEMBERS_SORTS;
  return PULSE_ACTIVITY_SORTS;
}

function pulseSortValue(ui) {
  return ui.pulseScreen === 'medianForce' ? ui.medianForceSort : ui.activitySort;
}

function pulseActivityFiltersActive(ui) {
  if (ui.pulseScreen === 'medianForce') {
    return ui.medianForceSort !== 'largest' || ui.activitySearch.trim() !== '';
  }
  const sortDefault = ui.pulseScreen === 'members' ? 'active' : 'newest';
  return ui.activityFilter !== 'all' || ui.activitySearch.trim() !== '' || ui.activitySort !== sortDefault;
}

function pulseActivityFilterButtonLabel(ui) {
  return ui.activityFilter === 'all' ? 'All' : PULSE_ACTIVITY_FILTERS[ui.activityFilter];
}

function pulseActivitySortButtonLabel(ui) {
  const sortKey = pulseSortValue(ui);
  if (sortKey === 'largest') return 'Largest Δ';
  if (sortKey === 'active') return 'Most active';
  if (sortKey === 'newest') return 'Newest';
  if (sortKey === 'oldest') return 'Oldest';
  return 'A–Z';
}

function pulseActivityTypePopover(ui) {
  if (!ui.activityTypeOpen) return '';
  const options = Object.entries(PULSE_ACTIVITY_FILTERS).map(([value, label]) =>
    `<button type="button" class="pulse-activity-filter-option${ui.activityFilter === value ? ' is-selected' : ''}" data-action="pulse-activity-filter" data-value="${value}" role="menuitemradio" aria-checked="${ui.activityFilter === value}">${escapeHTML(label)}</button>`
  ).join('');
  return `<div class="pulse-activity-filter-popover" id="pulse-activity-type-popover" role="menu" aria-label="Visit type">${options}</div>`;
}

function pulseActivitySortPopover(ui) {
  if (!ui.activitySortOpen) return '';
  const catalog = pulseSortCatalog(ui);
  const selected = pulseSortValue(ui);
  const options = Object.entries(catalog).map(([value, label]) =>
    `<button type="button" class="pulse-activity-filter-option${selected === value ? ' is-selected' : ''}" data-action="pulse-activity-sort" data-value="${value}" role="menuitemradio" aria-checked="${selected === value}">${escapeHTML(label)}</button>`
  ).join('');
  return `<div class="pulse-activity-filter-popover" id="pulse-activity-sort-popover" role="menu" aria-label="Sort visits">${options}</div>`;
}

function pulseSubScreenHead(model, title) {
  return `<header class="settings-pane-head team-overview-head pulse-head-compact pulse-sub-screen-head">
    <div class="settings-pane-head-row team-overview-head-row pulse-sub-screen-head-row">
      <div class="settings-pane-head-text pulse-screen-head">
        <button type="button" class="icon-button pulse-scope-chip" data-action="pulse-screen-hub" aria-label="Back to Pulse" title="Back to Pulse">
          ${icon('back', 'icon-sm')}
        </button>
        <h1>${escapeHTML(title)}</h1>
      </div>
      ${pulseRangeHeaderControls(model)}
    </div>
  </header>`;
}

function pulseActivityToolbar(ui, options = {}) {
  const {showTitle = true, hideType = false} = options;
  const sortKey = pulseSortValue(ui);
  const sortDefault = ui.pulseScreen === 'medianForce' ? 'largest' : ui.pulseScreen === 'members' ? 'active' : 'newest';
  const typeControl = hideType ? '' : `<div class="pulse-activity-filter-anchor">
    <button type="button" class="pulse-activity-bar-button${ui.activityFilter !== 'all' ? ' is-active' : ''}" data-action="pulse-activity-type-toggle" aria-haspopup="menu" aria-expanded="${ui.activityTypeOpen}" aria-label="Visit type, ${pulseActivityFilterButtonLabel(ui)}"${ui.activityTypeOpen ? ' aria-controls="pulse-activity-type-popover"' : ''}>
      <span class="muted">Type</span> ${escapeHTML(pulseActivityFilterButtonLabel(ui))}
    </button>
    ${pulseActivityTypePopover(ui)}
  </div>`;
  const sortControl = `<div class="pulse-activity-filter-anchor">
    <button type="button" class="pulse-activity-bar-button${sortKey !== sortDefault ? ' is-active' : ''}" data-action="pulse-activity-sort-toggle" aria-haspopup="menu" aria-expanded="${ui.activitySortOpen}" aria-label="Sort, ${escapeHTML(pulseSortCatalog(ui)[sortKey])}"${ui.activitySortOpen ? ' aria-controls="pulse-activity-sort-popover"' : ''}>
      <span class="muted">Sort</span> ${escapeHTML(pulseActivitySortButtonLabel(ui))}
    </button>
    ${pulseActivitySortPopover(ui)}
  </div>`;
  const reset = pulseActivityFiltersActive(ui)
    ? `<button type="button" class="button tertiary pulse-activity-reset" data-action="pulse-activity-reset" aria-label="Reset filters">Reset</button>`
    : '';
  const search = `<label class="team-overview-search pulse-activity-bar-search">
    <span class="sr-only">Search by name</span>
    ${icon('search')}
    <input id="team-overview-pulse-search" type="search" inputmode="search" autocomplete="off" placeholder="Search" value="${escapeHTML(ui.activitySearch)}">
  </label>`;
  const title = showTitle ? '<h2>Activity</h2>' : '';
  return `<header class="pulse-activity-head team-overview-activity-head${showTitle ? '' : ' pulse-activity-head--toolbar-only'}">
    ${title}
    <div class="pulse-activity-bar team-overview-activity-toolbar">${typeControl}${sortControl}${reset}${search}</div>
  </header>`;
}

function pulseTableOutcomeLabel(item) {
  const {force, stability} = item.metrics || {force: null, stability: null};
  if (force == null && stability == null) return '—';
  const parts = [];
  if (force != null) parts.push(force);
  if (stability != null) parts.push(`${stability}%`);
  return parts.join(' · ');
}

function pulseActivityVisitBlock(item, avatarMarkup) {
  const badge = teamActivityBadgeMarkup(item.badge);
  return `<div class="pulse-visit">${avatarMarkup}<span class="pulse-visit-stack"><strong>${escapeHTML(item.memberName)}</strong><span class="pulse-visit-sub">${badge}<small class="muted">${escapeHTML(item.kindLabel)}</small></span></span></div>`;
}

function pulseActivityVisitBlockNested(item) {
  const badge = teamActivityBadgeMarkup(item.badge);
  return `<div class="pulse-visit pulse-visit--nested"><span class="pulse-visit-stack"><span class="pulse-visit-sub">${badge}<small class="muted">${escapeHTML(item.kindLabel)}</small></span></span></div>`;
}

function pulseActivityRowMarkup(item, options = {}) {
  const {nested = false, avatarMarkup = '', scales = null} = options;
  const outcome = pulseTableOutcomeLabel(item);
  const visit = nested ? pulseActivityVisitBlockNested(item) : pulseActivityVisitBlock(item, avatarMarkup);
  const radar = scales ? pulseActivityRadarCell(item, scales) : '';
  return `<li class="pulse-activity-row${nested ? ' pulse-activity-row--nested' : ''}${scales ? ' pulse-activity-row--with-radar' : ''}" data-action="open-pulse-person" data-id="${item.memberId}" data-member-name="${escapeHTML(item.memberName)}" title="${escapeHTML(item.kindLabel)}" tabindex="0" role="link">
    ${radar}
    ${visit}
    <span class="pulse-outcome tabular">${outcome === '—' ? '<span class="muted">—</span>' : escapeHTML(outcome)}</span>
    <span class="pulse-when muted tabular">${escapeHTML(item.timeLabel)}</span>
  </li>`;
}

function pulseActivityListGrouped(model) {
  const {ui, activity, activityAll, roster} = model;
  const face = id => roster.find(person => person.id === id) || {initials: '•', name: ''};
  const membersScreen = ui.pulseScreen === 'members';
  const term = ui.activitySearch.trim().toLowerCase();
  const members = membersScreen && ui.activityFilter === 'all'
    ? model.members.filter(({person}) => person.name.toLowerCase().includes(term))
    : [];
  const groups = pulseMemberGroups(activity, ui.activitySort, members);
  if (!groups.length) {
    const message = membersScreen && !model.members.length
      ? 'No members on the team yet.'
      : membersScreen || activityAll.length ? 'No visits match this filter.' : 'No visits in this period.';
    return `<li class="pulse-activity-empty muted">${message}</li>`;
  }
  return groups.map(group => {
    const count = group.events.length;
    const countLabel = !count ? 'No events in this range' : count === 1 ? '1 event' : `${count} events`;
    const head = `<div class="pulse-member-head" data-action="open-pulse-person" data-id="${group.memberId}" data-member-name="${escapeHTML(group.memberName)}" tabindex="0" role="link">
      ${avatar(face(group.memberId), 'mini')}
      <span class="pulse-member-head-text">
        <strong>${escapeHTML(group.memberName)}</strong>
        <span class="muted">${countLabel}</span>
      </span>
    </div>`;
    if (!count) return `<li class="pulse-member-group pulse-member-group--empty">${head}</li>`;
    const events = group.events.map(item => pulseActivityRowMarkup(item, {nested: true})).join('');
    return `<li class="pulse-member-group">
      ${head}
      <ul class="pulse-member-visits" aria-label="Events for ${escapeHTML(group.memberName)}">${events}</ul>
    </li>`;
  }).join('');
}

function pulseActivityListMarkup(model, options = {}) {
  const {ui, activity, activityAll, roster} = model;
  const groupByMembers = options.groupByMembers ?? (ui.pulseScreen === 'members' || ui.pulseGrouping === 'members');
  if (groupByMembers) return pulseActivityListGrouped(model);
  const face = id => roster.find(person => person.id === id) || {initials: '•', name: ''};
  const empty = `<li class="pulse-activity-empty muted">${activityAll.length ? 'No visits match this filter.' : 'No visits in this period.'}</li>`;
  if (!activity.length) return empty;
  const scales = pulseActivityRadarScales(activity);
  return activity.map(item => {
    const av = avatar(face(item.memberId), 'mini');
    return pulseActivityRowMarkup(item, {avatarMarkup: av, scales});
  }).join('');
}

function pulseActivityResetMarkup(ui) {
  return pulseActivityFiltersActive(ui)
    ? `<button type="button" class="button tertiary pulse-activity-reset" data-action="pulse-activity-reset" aria-label="Reset filters">Reset</button>`
    : '';
}

function refreshPulseActivity() {
  const model = pulseModel();
  const list = document.querySelector('.pulse-activity-list');
  if (list) {
    const markup = model.ui.pulseScreen === 'medianForce'
      ? pulseMedianForceListMarkup(model)
      : pulseActivityListMarkup(model);
    list.innerHTML = markup;
  }
  const toolbar = document.querySelector('.team-overview-activity-toolbar');
  if (!toolbar) return;
  const reset = toolbar.querySelector('.pulse-activity-reset');
  const wantsReset = pulseActivityFiltersActive(model.ui);
  if (wantsReset && !reset) {
    const search = toolbar.querySelector('.pulse-activity-bar-search');
    if (search) search.insertAdjacentHTML('beforebegin', pulseActivityResetMarkup(model.ui));
  } else if (!wantsReset && reset) {
    reset.remove();
  }
}

function pulseOperationsTable(model, options = {}) {
  const {ui} = model;
  const groupByMembers = !!options.groupByMembers;
  const list = pulseActivityListMarkup(model, {
    groupByMembers
  });
  const sectionLabel = groupByMembers ? 'Members and events' : 'Station visits';
  const radarCol = groupByMembers ? '' : '<span class="pulse-col-radar">Shape</span>';
  const trailClass = groupByMembers ? '' : ' pulse-operations--with-radar';
  return `<section class="pulse-operations pulse-operations--trail${groupByMembers ? ' pulse-operations--by-member' : ''}${trailClass}" aria-label="${sectionLabel}">
    ${pulseActivityToolbar(ui, options)}
    <div class="pulse-activity-scroll team-overview-table-wrap">
      <div class="pulse-activity-cols" role="row">${radarCol}<span class="pulse-col-visit">Visit</span><span class="pulse-col-outcome">Outcome</span><span class="pulse-col-when">When</span></div>
      <ul class="pulse-activity-list">${list}</ul>
    </div>
  </section>`;
}

function pulseMedianForceRows(model) {
  const {ui, activityAll} = model;
  const term = ui.activitySearch.trim().toLowerCase();
  const rows = activityAll
    .map(row => ({...row, forceDelta: pulseRowForceDelta(row)}))
    .filter(row => row.forceDelta != null && pulseActivityMatchesSearch(row, term));
  return sortPulseMedianForce(rows, ui.medianForceSort);
}

function pulseMedianForceRowMarkup(item, avatarMarkup) {
  const outcome = pulseTableOutcomeLabel(item);
  const visit = pulseActivityVisitBlock(item, avatarMarkup);
  const delta = pulseForceDeltaLabel(item.forceDelta);
  const deltaClass = pulseForceDeltaClass(item.forceDelta);
  return `<li class="pulse-activity-row" data-action="open-pulse-person" data-id="${item.memberId}" data-member-name="${escapeHTML(item.memberName)}" title="${escapeHTML(item.kindLabel)}" tabindex="0" role="link">
    ${visit}
    <span class="pulse-outcome tabular">${outcome === '—' ? '<span class="muted">—</span>' : escapeHTML(outcome)}</span>
    <span class="pulse-force-delta tabular ${deltaClass}">${escapeHTML(delta)}</span>
    <span class="pulse-when muted tabular">${escapeHTML(item.timeLabel)}</span>
  </li>`;
}

function pulseMedianForceListMarkup(model) {
  const {roster} = model;
  const rows = pulseMedianForceRows(model);
  const face = id => roster.find(person => person.id === id) || {initials: '•', name: ''};
  if (!rows.length) {
    return `<li class="pulse-activity-empty muted">${model.activityAll.length ? 'No comparable isometric visits match this filter.' : 'No comparable visits in this period.'}</li>`;
  }
  return rows.map(item => {
    const av = avatar(face(item.memberId), 'mini');
    return pulseMedianForceRowMarkup(item, av);
  }).join('');
}

function pulseMedianForceTable(model) {
  const {ui} = model;
  const list = pulseMedianForceListMarkup(model);
  return `<section class="pulse-operations pulse-operations--trail pulse-operations--median-force" aria-label="Comparable isometric visits">
    ${pulseActivityToolbar(ui, {showTitle: false, hideType: true})}
    <div class="pulse-activity-scroll team-overview-table-wrap">
      <div class="pulse-activity-cols" role="row"><span class="pulse-col-visit">Visit</span><span class="pulse-col-outcome">Outcome</span><span class="pulse-col-delta">Δ force</span><span class="pulse-col-when">When</span></div>
      <ul class="pulse-activity-list">${list}</ul>
    </div>
  </section>`;
}

function pulseActivityScreen(model) {
  return `${pulseSubScreenHead(model, 'Activity')}${pulseOperationsTable(model, {showTitle: false})}`;
}

function pulseMembersScreen(model) {
  return `${pulseSubScreenHead(model, 'Members')}${pulseOperationsTable(model, {showTitle: false, groupByMembers: true})}`;
}

function pulseMedianForceScreen(model) {
  return `${pulseSubScreenHead(model, 'Median force change')}${pulseMedianForceTable(model)}`;
}

function pulseScreenBody(model) {
  const screen = model.ui.pulseScreen || 'hub';
  if (screen === 'activity') return pulseActivityScreen(model);
  if (screen === 'members') return pulseMembersScreen(model);
  if (screen === 'medianForce') return pulseMedianForceScreen(model);
  return '';
}

function pulsePage() {
  if (state.actor !== 'coach') return peopleView();
  const model = pulseModel();
  const screen = model.ui.pulseScreen || 'hub';
  if (screen === 'activity' || screen === 'members' || screen === 'medianForce') {
    const paneLabel = screen === 'members' ? 'Members' : screen === 'medianForce' ? 'Median force change' : 'Activity';
    return `<main class="team-overview team-overview-home templates-hub staff-single-pane pulse-proto pulse-proto--activity-screen">
      <div class="settings-hub-pane pulse-layout pulse-layout-table-first" aria-label="${paneLabel}">
        ${pulseScreenBody(model)}
      </div>
    </main>`;
  }
  return `<main class="team-overview team-overview-home templates-hub staff-single-pane pulse-proto">
    <div class="settings-hub-pane pulse-layout" aria-label="Pulse">
      ${pulseHead(model)}
      <div class="pulse-hub-card">
        ${pulseKpiStrip(model.kpis, model.ui)}
        ${pulseActivityChartCard(model)}
        ${pulseHubBottomRow(model)}
      </div>
      ${pulseScreenBody(model)}
    </div>
  </main>`;
}

const teamOverviewActions = {
  'nav-pulse': () => visitPulse(),
  'pulse-kpi': el => {
    const value = el.dataset.value;
    const screen = pulseKpiScreenForId(value);
    if (!screen) return;
    const ui = teamOverviewUI();
    ui.pulseScreen = screen;
    if (screen === 'members') ui.activitySort = 'active';
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    ui.activityChartBucketOpen = false;
    render();
    document.querySelector(`[data-action="pulse-kpi"][data-value="${value}"]`)?.focus({preventScroll: true});
  },
  'pulse-screen-hub': () => {
    const ui = teamOverviewUI();
    ui.pulseScreen = 'hub';
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    ui.activityChartBucketOpen = false;
    render();
    document.querySelector('[data-action="pulse-kpi"]')?.focus({preventScroll: true});
  },
  'pulse-activity-type-toggle': () => {
    const ui = teamOverviewUI();
    ui.activityTypeOpen = !ui.activityTypeOpen;
    if (ui.activityTypeOpen) ui.activitySortOpen = false;
    render();
    (ui.activityTypeOpen
      ? document.querySelector('#pulse-activity-type-popover .pulse-activity-filter-option.is-selected, #pulse-activity-type-popover .pulse-activity-filter-option')
      : document.querySelector('[data-action="pulse-activity-type-toggle"]'))?.focus({preventScroll: true});
  },
  'pulse-activity-sort-toggle': () => {
    const ui = teamOverviewUI();
    ui.activitySortOpen = !ui.activitySortOpen;
    if (ui.activitySortOpen) ui.activityTypeOpen = false;
    render();
    (ui.activitySortOpen
      ? document.querySelector('#pulse-activity-sort-popover .pulse-activity-filter-option.is-selected, #pulse-activity-sort-popover .pulse-activity-filter-option')
      : document.querySelector('[data-action="pulse-activity-sort-toggle"]'))?.focus({preventScroll: true});
  },
  'pulse-activity-reset': () => {
    const ui = teamOverviewUI();
    ui.pulseGrouping = 'visits';
    ui.activityFilter = 'all';
    ui.activitySort = ui.pulseScreen === 'members' ? 'active' : 'newest';
    ui.medianForceSort = 'largest';
    ui.activitySearch = '';
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    render();
    document.querySelector('[data-action="pulse-activity-type-toggle"], [data-action="pulse-activity-sort-toggle"]')?.focus({preventScroll: true});
  },
  'pulse-activity-filter': el => {
    const value = el.dataset.value;
    if (!PULSE_ACTIVITY_FILTERS[value]) return;
    const ui = teamOverviewUI();
    ui.activityFilter = value;
    ui.activityTypeOpen = false;
    render();
    document.querySelector('[data-action="pulse-activity-type-toggle"]')?.focus({preventScroll: true});
  },
  'pulse-activity-sort': el => {
    const value = el.dataset.value;
    const ui = teamOverviewUI();
    const catalog = pulseSortCatalog(ui);
    if (!catalog[value]) return;
    if (ui.pulseScreen === 'medianForce') ui.medianForceSort = value;
    else ui.activitySort = value;
    ui.activitySortOpen = false;
    render();
    document.querySelector('[data-action="pulse-activity-sort-toggle"]')?.focus({preventScroll: true});
  },
  'pulse-chart-bucket-toggle': () => {
    const ui = teamOverviewUI();
    ui.activityChartBucketOpen = !ui.activityChartBucketOpen;
    if (ui.activityChartBucketOpen) {
      ui.activityTypeOpen = false;
      ui.activitySortOpen = false;
    }
    render();
    (ui.activityChartBucketOpen
      ? document.querySelector('#pulse-chart-bucket-popover .pulse-activity-filter-option')
      : document.querySelector('[data-action="pulse-chart-bucket-toggle"]'))?.focus({preventScroll: true});
  },
  'pulse-chart-bucket': el => {
    const value = el.dataset.value;
    if (!PULSE_CHART_BUCKETS[value]) return;
    const ui = teamOverviewUI();
    ui.activityChartBucket = value;
    pulseClampRangeForChartBucket(ui, value);
    ui.activityChartBucketOpen = false;
    render();
    document.querySelector('[data-action="pulse-chart-bucket-toggle"]')?.focus({preventScroll: true});
  },
  'open-pulse-person': el => openDirectoryPerson(el.dataset.id, 'pulse'),
  'pulse-open-analysis': el => pulseOpenAnalysisRecord(el.dataset.personId, el.dataset.recordId),
  'pulse-period': el => {
    const value = el.dataset.value;
    if (!TEAM_OVERVIEW_PERIODS[value]) return;
    const ui = teamOverviewUI();
    const preset = pulseWindowForPreset(value, visiblePeople());
    ui.period = value;
    ui.rangeStart = preset.start;
    ui.rangeEnd = preset.end;
    const window = pulseWindowFromRange(ui.rangeStart, ui.rangeEnd);
    if (!pulseChartBucketEnabled(window, ui.activityChartBucket)) {
      ui.activityChartBucket = pulseDefaultChartBucket(window);
    }
    ui.rangePickerOpen = false;
    render();
    document.querySelector(`[data-action="pulse-period"][data-value="${value}"]`)?.focus({preventScroll: true});
  },
  'pulse-range-picker-toggle': () => {
    const ui = teamOverviewUI();
    ui.rangePickerOpen = !ui.rangePickerOpen;
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    if (!ui.rangePickerOpen) pulseRangePickerTeardown();
    render();
    pulseRangePickerAfterRender();
    (ui.rangePickerOpen ? document.getElementById('pulse-range-start') : document.querySelector('[data-action="pulse-range-picker-toggle"]'))?.focus({preventScroll: true});
  },
  'pulse-range-picker-cancel': () => {
    teamOverviewUI().rangePickerOpen = false;
    pulseRangePickerTeardown();
    render();
    document.querySelector('[data-action="pulse-range-picker-toggle"]')?.focus({preventScroll: true});
  },
  'pulse-range-picker-apply': () => {
    const ui = teamOverviewUI();
    let start = pulseParseInputDate(document.getElementById('pulse-range-start')?.value);
    let end = pulseParseInputDate(document.getElementById('pulse-range-end')?.value);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (start > end) {
        const swap = start;
        start = end;
        end = swap;
      }
      ui.rangeStart = start;
      ui.rangeEnd = end + 86_400_000 - 1;
    }
    ui.rangePickerOpen = false;
    ui.period = 'custom';
    pulseRangePickerTeardown();
    render();
    document.querySelector('[data-action="pulse-range-picker-toggle"]')?.focus({preventScroll: true});
  }
};

function pulseBrushIndexFromX(clientX, track) {
  const rect = track.getBoundingClientRect();
  const brushDays = pulseBrushDomain().days;
  const ratio = (clientX - rect.left) / Math.max(1, rect.width);
  return Math.max(0, Math.min(brushDays - 1, Math.floor(ratio * brushDays)));
}

function pulseBrushPaint(startI, endI) {
  const domain = pulseBrushDomain();
  const layout = pulseBrushLayout(startI, endI, domain);
  const windowEl = document.querySelector('.pulse-brush-window');
  const startHandle = document.querySelector('.pulse-brush-handle.is-start');
  const endHandle = document.querySelector('.pulse-brush-handle.is-end');
  const label = document.getElementById('pulse-brush-label');
  const endLeft = layout.left + layout.width;
  pulseBrushSyncWindow(windowEl, layout);
  if (startHandle) startHandle.style.left = `${layout.left}%`;
  if (endHandle) endHandle.style.left = `${endLeft}%`;
  const labelText = label?.querySelector('.pulse-range-label-text');
  if (labelText) labelText.textContent = layout.label;
  const clip = document.querySelector('.pulse-brush-line-clip');
  if (clip) {
    clip.setAttribute('x', String(layout.left));
    clip.setAttribute('width', String(Math.min(layout.width, 100 - layout.left)));
  }
  return layout;
}

function pulseBrushCommit(startI, endI) {
  const domain = pulseBrushDomain();
  const layout = pulseBrushLayout(startI, endI, domain);
  const ui = teamOverviewUI();
  ui.rangeStart = layout.start;
  ui.rangeEnd = layout.end;
  ui.period = pulsePresetMatching(layout.start, layout.end, visiblePeople());
  ui.rangePickerOpen = false;
  pulseBrushDrag = null;
  render();
}

function pulseBrushNudge(mode, step) {
  const ui = teamOverviewUI();
  const domain = pulseBrushDomain();
  const brushDays = domain.days;
  let startI = pulseDayIndex(ui.rangeStart, domain.start, brushDays);
  let endI = pulseDayIndex(ui.rangeEnd, domain.start, brushDays);
  if (mode === 'start') startI = Math.max(0, Math.min(endI, startI + step));
  else if (mode === 'end') endI = Math.min(brushDays - 1, Math.max(startI, endI + step));
  else {
    const span = endI - startI;
    startI = Math.max(0, Math.min(brushDays - 1 - span, startI + step));
    endI = startI + span;
  }
  pulseBrushCommit(startI, endI);
}

document.addEventListener('pointerdown', event => {
  if (state.nav !== 'pulse' || state.stage || state.overlay) return;
  const track = event.target.closest('.pulse-brush-track');
  if (!track) return;
  event.preventDefault();
  try { track.setPointerCapture(event.pointerId); } catch (_) {}
  const index = pulseBrushIndexFromX(event.clientX, track);
  const handle = event.target.closest('[data-brush]');
  const domain = pulseBrushDomain();
  const ui = teamOverviewUI();
  const startI = pulseDayIndex(ui.rangeStart, domain.start, domain.days);
  const endI = pulseDayIndex(ui.rangeEnd, domain.start, domain.days);
  const mode = handle?.dataset.brush || 'select';
  pulseBrushDrag = {pointerId: event.pointerId, mode, origin: index, startI, endI};
  track.classList.add('is-dragging');
  if (mode === 'select') pulseBrushPaint(index, index);
});

document.addEventListener('pointermove', event => {
  if (!pulseBrushDrag || event.pointerId !== pulseBrushDrag.pointerId) return;
  const track = document.querySelector('.pulse-brush-track');
  if (!track) return;
  const index = pulseBrushIndexFromX(event.clientX, track);
  const drag = pulseBrushDrag;
  if (drag.mode === 'start') pulseBrushPaint(index, drag.endI);
  else if (drag.mode === 'end') pulseBrushPaint(drag.startI, index);
  else if (drag.mode === 'select') pulseBrushPaint(drag.origin, index);
  else {
    const span = drag.endI - drag.startI;
    const brushDays = pulseBrushDomain().days;
    let startI = drag.startI + (index - drag.origin);
    startI = Math.max(0, Math.min(brushDays - 1 - span, startI));
    pulseBrushPaint(startI, startI + span);
  }
});

document.addEventListener('pointerup', event => {
  if (!pulseBrushDrag || event.pointerId !== pulseBrushDrag.pointerId) return;
  const track = document.querySelector('.pulse-brush-track');
  const index = pulseBrushIndexFromX(event.clientX, track || event.target);
  const drag = pulseBrushDrag;
  let startI = drag.startI;
  let endI = drag.endI;
  if (drag.mode === 'start') startI = index;
  else if (drag.mode === 'end') endI = index;
  else if (drag.mode === 'select') {
    startI = drag.origin;
    endI = index;
  } else {
    const span = drag.endI - drag.startI;
    const brushDays = pulseBrushDomain().days;
    startI = Math.max(0, Math.min(brushDays - 1 - span, drag.startI + (index - drag.origin)));
    endI = startI + span;
  }
  track?.classList.remove('is-dragging');
  pulseBrushCommit(startI, endI);
});

document.addEventListener('pointercancel', () => {
  if (!pulseBrushDrag) return;
  document.querySelector('.pulse-brush-track')?.classList.remove('is-dragging');
  pulseBrushDrag = null;
});

document.addEventListener('click', event => {
  const ui = teamOverviewUI();
  if (state.nav !== 'pulse') return;
  if (ui.activityTypeOpen || ui.activitySortOpen || ui.activityChartBucketOpen) {
    if (!event.target.closest('.pulse-activity-filter-anchor')) {
      ui.activityTypeOpen = false;
      ui.activitySortOpen = false;
      ui.activityChartBucketOpen = false;
      render();
    }
  }
  if (ui.rangePickerOpen && !event.target.closest('.pulse-range-label-anchor') && !event.target.closest('#pulse-range-picker')) {
    ui.rangePickerOpen = false;
    pulseRangePickerTeardown();
    render();
  }
});

document.addEventListener('click', event => {
  if (state.nav !== 'pulse' || state.stage || state.overlay) return;
  const el = event.target.closest('#pulse-range-picker [data-action]');
  if (!el || el.disabled) return;
  const action = el.dataset.action;
  if (action !== 'pulse-range-picker-cancel' && action !== 'pulse-range-picker-apply') return;
  event.stopPropagation();
  teamOverviewActions[action](el);
}, true);

document.addEventListener('input', event => {
  if (event.target.id !== 'team-overview-pulse-search') return;
  teamOverviewUI().activitySearch = event.target.value;
  refreshPulseActivity();
});

document.addEventListener('change', event => {
  if (event.target.id === 'team-overview-period') {
    const value = event.target.value;
    if (!TEAM_OVERVIEW_PERIODS[value]) return;
    const ui = teamOverviewUI();
    const preset = pulseWindowForPreset(value, visiblePeople());
    ui.period = value;
    ui.rangeStart = preset.start;
    ui.rangeEnd = preset.end;
    const window = pulseWindowFromRange(ui.rangeStart, ui.rangeEnd);
    if (!pulseChartBucketEnabled(window, ui.activityChartBucket)) {
      ui.activityChartBucket = pulseDefaultChartBucket(window);
    }
    render();
    return;
  }
});

document.addEventListener('keydown', event => {
  const ui = teamOverviewUI();
  if (event.key === 'Escape' && state.nav === 'pulse' && !state.stage && !state.overlay && (ui.activityTypeOpen || ui.activitySortOpen || ui.activityChartBucketOpen || ui.rangePickerOpen)) {
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    ui.activityChartBucketOpen = false;
    ui.rangePickerOpen = false;
    pulseRangePickerTeardown();
    render();
    document.querySelector('[data-action="pulse-activity-type-toggle"], [data-action="pulse-activity-sort-toggle"], [data-action="pulse-chart-bucket-toggle"], [data-action="pulse-range-picker-toggle"]')?.focus({preventScroll: true});
    event.preventDefault();
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && state.nav === 'pulse' && !state.stage && !state.overlay) {
    const row = event.target.closest?.('.pulse-activity-row');
    if (row) {
      event.preventDefault();
      openDirectoryPerson(row.dataset.id, 'pulse');
      return;
    }
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (state.nav !== 'pulse' || state.stage || state.overlay) return;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
  const brush = event.target.closest?.('.pulse-range-row, .pulse-brush-track');
  if (brush) {
    event.preventDefault();
    const mode = event.target.dataset.brush || 'move';
    pulseBrushNudge(mode, event.key === 'ArrowRight' ? 1 : -1);
  }
});