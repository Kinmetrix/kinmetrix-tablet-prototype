/* Pulse: team KPIs and activity. Loaded after directory.js — exports pulsePage(). */
const TEAM_OVERVIEW_PERIODS = {
  'last-7': {rangeLabel: '6 Nov 2026 – 13 Nov 2026', compareLabel: 'Compared with 30 Oct 2026 – 5 Nov 2026', presetLabel: 'Last 7 days'},
  'last-30': {rangeLabel: '14 Oct 2026 – 13 Nov 2026', compareLabel: 'Compared with 13 Sept 2026 – 13 Oct 2026', presetLabel: 'Last 30 days'},
  'last-90': {rangeLabel: '15 Aug 2026 – 13 Nov 2026', compareLabel: 'Compared with 17 May 2026 – 14 Aug 2026', presetLabel: 'Last 90 days'}
};

const PULSE_REPORTING_END = Date.UTC(2026, 10, 13, 23, 59, 59, 999);
const PULSE_PERIOD_DAY_COUNT = {'last-7': 7, 'last-30': 30, 'last-90': 90};
const PULSE_BRUSH_DAYS = 90;
let pulseBrushDrag = null;
const PULSE_ACTIVITY_FILTERS = {all: 'All', assessment: 'Assessments', session: 'Sessions'};
const PULSE_ACTIVITY_SORTS = {newest: 'Newest first', oldest: 'Oldest first', member: 'Member A–Z'};

function teamOverviewUI() {
  const store = directoryUI();
  store.pulse ??= store.home ?? {period: 'last-30'};
  const ui = store.pulse;
  if (!TEAM_OVERVIEW_PERIODS[ui.period] && ui.period !== 'custom') ui.period = 'last-30';
  if (!PULSE_ACTIVITY_FILTERS[ui.activityFilter]) ui.activityFilter = 'all';
  if (!PULSE_ACTIVITY_SORTS[ui.activitySort]) ui.activitySort = 'newest';
  if (ui.pulseGrouping !== 'members') ui.pulseGrouping = 'visits';
  if (ui.activitySearch == null) ui.activitySearch = '';
  if (ui.activityTypeOpen == null) ui.activityTypeOpen = false;
  if (ui.activitySortOpen == null) ui.activitySortOpen = false;
  if (ui.rangePickerOpen == null) ui.rangePickerOpen = false;
  pulseEnsureRange(ui);
  return ui;
}

function visitPulse() {
  if (state.actor !== 'coach') return;
  const ui = teamOverviewUI();
  ui.activityTypeOpen = false;
  ui.activitySortOpen = false;
  ui.rangePickerOpen = false;
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

function pulseEnsureRange(ui) {
  if (Number.isFinite(ui.rangeStart) && Number.isFinite(ui.rangeEnd)) return;
  const preset = pulseWindowFromDays(PULSE_PERIOD_DAY_COUNT[ui.period] ?? 30);
  ui.rangeStart = preset.start;
  ui.rangeEnd = preset.end;
}

function pulsePresetMatching(start, end) {
  const chosen = pulseWindowFromRange(start, end);
  for (const [key, days] of Object.entries(PULSE_PERIOD_DAY_COUNT)) {
    const preset = pulseWindowFromDays(days);
    if (pulseMidnight(preset.start) === chosen.start && pulseMidnight(preset.end) === pulseMidnight(chosen.end)) return key;
  }
  return 'custom';
}

function pulsePeriodWindow(ui) {
  pulseEnsureRange(ui);
  return pulseWindowFromRange(ui.rangeStart, ui.rangeEnd);
}

function pulseBrushDomain() {
  const end = pulseMidnight(PULSE_REPORTING_END);
  const start = end - (PULSE_BRUSH_DAYS - 1) * 86_400_000;
  return {start, end, days: PULSE_BRUSH_DAYS};
}

function pulseDayIndex(at, domainStart) {
  return Math.max(0, Math.min(PULSE_BRUSH_DAYS - 1, Math.round((pulseMidnight(at) - domainStart) / 86_400_000)));
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

function teamKpiDelta(current, previous) {
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
  const trainingSessions = rows.filter(row => row.purpose === 'session').length;
  const assessments = rows.filter(row => row.purpose === 'assessment').length;
  const membersActive = new Set(rows.map(row => row.memberId)).size;
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
    {id: 'membersActive', label: 'Active members', value: current.membersActive, footnote: 'Members with at least one session', previous: previous.membersActive},
    {id: 'trainingSessions', label: 'Sessions', value: current.trainingSessions, footnote: 'Non-assessment sessions in the period', previous: previous.trainingSessions}
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

function pulseActivityMatchesFilter(row, filter) {
  if (filter === 'assessment') return row.purpose === 'assessment';
  if (filter === 'session') return row.purpose === 'session';
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

function teamActivityBadgeMarkup(badge) {
  if (!badge) return '';
  return `<span class="team-overview-activity-badge team-overview-activity-badge--${badge.tone}">${escapeHTML(badge.label)}</span>`;
}

const PULSE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pulseHistoryExtras(personId) {
  const person = people.find(item => item.id === personId);
  if (!person?.baseline) return [];
  return [
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 8, 22, 14, 30), date: '22 Sept'},
    {type: 'strength', purpose: 'session', at: Date.UTC(2026, 8, 28, 10, 30), date: '28 Sept'},
    {type: 'rom', purpose: 'assessment', at: Date.UTC(2026, 9, 5, 11, 30), date: '5 Oct'},
    {type: 'strength', purpose: 'session', at: Date.UTC(2026, 9, 8, 15, 30), date: '8 Oct'},
    {type: 'strength', purpose: 'assessment', at: Date.UTC(2026, 9, 18, 9, 30), date: '18 Oct'},
    {type: 'strength', purpose: 'session', at: Date.UTC(2026, 9, 22, 10, 30), date: '22 Oct'}
  ].map((item, index) => {
    const record = historyFixture(item.type, item.date, personId);
    record.id = `pulse-extra-${personId}-${index}`;
    record.purpose = item.purpose;
    record.completedAt = item.at;
    record.date = item.date;
    return record;
  });
}

function pulseRecords(personId) {
  return [...teamOverviewRecords(personId), ...pulseHistoryExtras(personId)]
    .sort((a, b) => recordCompletedAt(b) - recordCompletedAt(a));
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
  return rows;
}

function pulseBrushSeries(roster) {
  const domain = pulseBrushDomain();
  const rows = pulseRowsInWindow(roster, domain.start, domain.end + 86_400_000 - 1);
  const counts = Array(domain.days).fill(0);
  for (const row of rows) {
    counts[pulseDayIndex(row.at, domain.start)]++;
  }
  return {domain, counts, max: Math.max(1, ...counts)};
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
  const kpis = [
    {id: 'totalActivity', label: 'Total activity', value: current.totalActivity, previous: previous.totalActivity},
    {id: 'membersActive', label: 'Active members', value: current.membersActive, previous: previous.membersActive},
    {id: 'trainingSessions', label: 'Sessions', value: current.trainingSessions, previous: previous.trainingSessions},
    {id: 'assessments', label: 'Assessments', value: current.assessments, previous: previous.assessments}
  ].map(kpi => ({...kpi, deltaLabel: teamKpiDelta(kpi.value, kpi.previous)}));
  const activity = sortPulseActivity(
    currentRows.filter(row => pulseActivityMatchesFilter(row, ui.activityFilter) && pulseActivityMatchesSearch(row, ui.activitySearch.trim().toLowerCase())),
    ui.activitySort
  );
  return {
    ui, roster, period, window, kpis, activityAll: currentRows, activity,
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

function pulseBrushLayout(startI, endI) {
  const a = Math.min(startI, endI);
  const b = Math.max(startI, endI);
  const domain = pulseBrushDomain();
  const start = domain.start + a * 86_400_000;
  const end = domain.start + b * 86_400_000 + 86_400_000 - 1;
  const span = b - a + 1;
  return {
    a, b,
    left: (a / PULSE_BRUSH_DAYS) * 100,
    width: ((b - a + 1) / PULSE_BRUSH_DAYS) * 100,
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

function pulseRangeControl(model) {
  const domain = model.brush.domain;
  const startI = pulseDayIndex(model.window.start, domain.start);
  const endI = pulseDayIndex(model.window.end, domain.start);
  const layout = pulseBrushLayout(startI, endI);
  return `<div class="pulse-range-row" aria-label="Date range for this stretch">
    <div class="pulse-range-label-anchor">
      <button type="button" class="pulse-range-label-button tabular" id="pulse-brush-label" data-action="pulse-range-picker-toggle" aria-haspopup="dialog" aria-expanded="${model.ui.rangePickerOpen}" aria-label="Date range, ${escapeHTML(layout.label)}. Choose dates"${model.ui.rangePickerOpen ? ' aria-controls="pulse-range-picker"' : ''}>
        <span class="pulse-range-label-text">${escapeHTML(layout.label)}</span>
        ${icon('calendar', 'icon-sm')}
      </button>
      ${pulseRangePickerPanel(model)}
    </div>
    <div class="pulse-brush-track pulse-brush-track--inline" role="group" aria-labelledby="pulse-brush-label" title="Drag to set a custom date range">
      <div class="pulse-brush-stage">
        ${pulseBrushLineMarkup(model.brush.counts, model.brush.max, layout)}
      </div>
      <div class="pulse-brush-window${pulseBrushWindowFlushClass(layout)}" data-brush="move" style="left:${layout.left}%;width:${Math.min(layout.width, 100 - layout.left)}%"></div>
      <button type="button" class="pulse-brush-handle is-start" data-brush="start" style="left:${layout.left}%" aria-label="Start of range"></button>
      <button type="button" class="pulse-brush-handle is-end" data-brush="end" style="left:${layout.left + layout.width}%" aria-label="End of range"></button>
    </div>
    <div class="pulse-brush-presets segmented" role="group" aria-label="Snap to a recent stretch">
      ${Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
        `<button type="button" class="${model.ui.period === value ? 'active' : ''}" data-action="pulse-period" data-value="${value}" aria-pressed="${model.ui.period === value}">${item.presetLabel.replace('Last ', '')}</button>`
      ).join('')}
    </div>
  </div>`;
}

function pulseHead() {
  return `<header class="settings-pane-head team-overview-head pulse-head-compact">
    <div class="settings-pane-head-row team-overview-head-row">
      <div class="settings-pane-head-text">
        <h1>Pulse</h1>
      </div>
    </div>
  </header>`;
}

function pulseKpiDeltaClass(label) {
  return label.startsWith('+') ? 'is-up' : label.startsWith('-') ? 'is-down' : '';
}

function pulseMetricLabel(id) {
  if (id === 'totalActivity') return 'Activity';
  if (id === 'membersActive') return 'Active members';
  if (id === 'assessments') return 'Assessments';
  return 'Sessions';
}

function pulseKpiIsSelected(ui, id) {
  if (id === 'totalActivity') return ui.pulseGrouping === 'visits';
  if (id === 'membersActive') return ui.pulseGrouping === 'members';
  if (id === 'trainingSessions') return ui.activityFilter === 'session';
  if (id === 'assessments') return ui.activityFilter === 'assessment';
  return false;
}

function pulseKpiStrip(kpis, ui) {
  return `<div class="pulse-kpi-strip" aria-label="Summary for this stretch">${kpis.map(kpi => {
    const selected = pulseKpiIsSelected(ui, kpi.id);
    return `<button type="button" class="team-overview-kpi pulse-kpi-strip-card pulse-kpi-strip-button${selected ? ' is-selected' : ''}" data-action="pulse-kpi" data-value="${kpi.id}" aria-pressed="${selected}">
      <span class="pulse-kpi-strip-label">${pulseMetricLabel(kpi.id)}</span>
      <span class="team-overview-kpi-value tabular">${kpi.value}</span>
      <p class="team-overview-kpi-delta ${pulseKpiDeltaClass(kpi.deltaLabel)}">${escapeHTML(kpi.deltaLabel)}</p>
    </button>`;
  }).join('')}</div>`;
}

function pulseMemberGroups(activity, sortKey) {
  const buckets = new Map();
  for (const row of activity) {
    if (!buckets.has(row.memberId)) buckets.set(row.memberId, []);
    buckets.get(row.memberId).push(row);
  }
  let memberIds = [...buckets.keys()];
  if (sortKey === 'member') {
    memberIds.sort((a, b) => buckets.get(a)[0].memberName.localeCompare(buckets.get(b)[0].memberName));
  } else {
    const firstIndex = new Map();
    activity.forEach((row, index) => {
      if (!firstIndex.has(row.memberId)) firstIndex.set(row.memberId, index);
    });
    memberIds.sort((a, b) => firstIndex.get(a) - firstIndex.get(b));
  }
  return memberIds.map(id => ({
    memberId: id,
    memberName: buckets.get(id)[0].memberName,
    visits: buckets.get(id)
  }));
}

function pulseActivityFilterButtonLabel(ui) {
  return ui.activityFilter === 'all' ? 'All' : PULSE_ACTIVITY_FILTERS[ui.activityFilter];
}

function pulseActivitySortButtonLabel(ui) {
  if (ui.activitySort === 'newest') return 'Newest';
  if (ui.activitySort === 'oldest') return 'Oldest';
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
  const options = Object.entries(PULSE_ACTIVITY_SORTS).map(([value, label]) =>
    `<button type="button" class="pulse-activity-filter-option${ui.activitySort === value ? ' is-selected' : ''}" data-action="pulse-activity-sort" data-value="${value}" role="menuitemradio" aria-checked="${ui.activitySort === value}">${escapeHTML(label)}</button>`
  ).join('');
  return `<div class="pulse-activity-filter-popover" id="pulse-activity-sort-popover" role="menu" aria-label="Sort visits">${options}</div>`;
}

function pulseActivityToolbar(ui) {
  const typeControl = `<div class="pulse-activity-filter-anchor">
    <button type="button" class="pulse-activity-bar-button${ui.activityFilter !== 'all' ? ' is-active' : ''}" data-action="pulse-activity-type-toggle" aria-haspopup="menu" aria-expanded="${ui.activityTypeOpen}" aria-label="Visit type, ${pulseActivityFilterButtonLabel(ui)}"${ui.activityTypeOpen ? ' aria-controls="pulse-activity-type-popover"' : ''}>
      <span class="muted">Type</span> ${escapeHTML(pulseActivityFilterButtonLabel(ui))}
    </button>
    ${pulseActivityTypePopover(ui)}
  </div>`;
  const sortControl = `<div class="pulse-activity-filter-anchor">
    <button type="button" class="pulse-activity-bar-button${ui.activitySort !== 'newest' ? ' is-active' : ''}" data-action="pulse-activity-sort-toggle" aria-haspopup="menu" aria-expanded="${ui.activitySortOpen}" aria-label="Sort, ${escapeHTML(PULSE_ACTIVITY_SORTS[ui.activitySort])}"${ui.activitySortOpen ? ' aria-controls="pulse-activity-sort-popover"' : ''}>
      <span class="muted">Sort</span> ${escapeHTML(pulseActivitySortButtonLabel(ui))}
    </button>
    ${pulseActivitySortPopover(ui)}
  </div>`;
  const search = `<label class="team-overview-search pulse-activity-bar-search">
    <span class="sr-only">Search by name</span>
    ${icon('search')}
    <input id="team-overview-pulse-search" type="search" inputmode="search" autocomplete="off" placeholder="Search" value="${escapeHTML(ui.activitySearch)}">
  </label>`;
  return `<header class="pulse-activity-head team-overview-activity-head"><h2>Activity</h2></header>
    <div class="pulse-activity-bar team-overview-activity-toolbar">${typeControl}${sortControl}${search}</div>`;
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
  const {nested = false, avatarMarkup = ''} = options;
  const outcome = pulseTableOutcomeLabel(item);
  const visit = nested ? pulseActivityVisitBlockNested(item) : pulseActivityVisitBlock(item, avatarMarkup);
  return `<li class="pulse-activity-row${nested ? ' pulse-activity-row--nested' : ''}" data-action="open-pulse-person" data-id="${item.memberId}" data-member-name="${escapeHTML(item.memberName)}" title="${escapeHTML(item.kindLabel)}" tabindex="0" role="link">
    ${visit}
    <span class="pulse-outcome tabular">${outcome === '—' ? '<span class="muted">—</span>' : escapeHTML(outcome)}</span>
    <span class="pulse-when muted tabular">${escapeHTML(item.timeLabel)}</span>
  </li>`;
}

function pulseOperationsTable(model) {
  const {ui, activity, activityAll, roster} = model;
  const face = id => roster.find(person => person.id === id) || {initials: '•', name: ''};
  const empty = `<li class="pulse-activity-empty muted">${activityAll.length ? 'No visits match this filter.' : 'No visits in this period.'}</li>`;
  let list;
  if (!activity.length) {
    list = empty;
  } else if (ui.pulseGrouping === 'members') {
    const groups = pulseMemberGroups(activity, ui.activitySort);
    list = groups.map(group => {
      const av = avatar(face(group.memberId), 'mini');
      const countLabel = group.visits.length === 1 ? '1 visit' : `${group.visits.length} visits`;
      const head = `<div class="pulse-member-head" data-action="open-pulse-person" data-id="${group.memberId}" data-member-name="${escapeHTML(group.memberName)}" tabindex="0" role="link">
        ${av}
        <span class="pulse-member-head-text">
          <strong>${escapeHTML(group.memberName)}</strong>
          <span class="muted">${countLabel}</span>
        </span>
      </div>`;
      const visits = group.visits.map(item => pulseActivityRowMarkup(item, {nested: true})).join('');
      return `<li class="pulse-member-group">
        ${head}
        <ul class="pulse-member-visits" aria-label="Visits for ${escapeHTML(group.memberName)}">${visits}</ul>
      </li>`;
    }).join('');
  } else {
    list = activity.map(item => {
      const av = avatar(face(item.memberId), 'mini');
      return pulseActivityRowMarkup(item, {avatarMarkup: av});
    }).join('');
  }
  return `<section class="pulse-operations pulse-operations--trail" aria-label="Station visits">
    ${pulseActivityToolbar(ui)}
    <div class="pulse-activity-scroll team-overview-table-wrap">
      <div class="pulse-activity-cols" role="row"><span class="pulse-col-visit">Visit</span><span class="pulse-col-outcome">Outcome</span><span class="pulse-col-when">When</span></div>
      <ul class="pulse-activity-list">${list}</ul>
    </div>
  </section>`;
}

function pulsePage() {
  if (state.actor !== 'coach') return peopleView();
  const model = pulseModel();
  return `<main class="team-overview team-overview-home templates-hub staff-single-pane pulse-proto">
    <div class="settings-hub-pane pulse-layout pulse-layout-table-first" aria-label="Pulse">
      ${pulseHead()}
      ${pulseRangeControl(model)}
      ${pulseKpiStrip(model.kpis, model.ui)}
      ${pulseOperationsTable(model)}
    </div>
  </main>`;
}

const teamOverviewActions = {
  'nav-pulse': () => visitPulse(),
  'pulse-kpi': el => {
    const value = el.dataset.value;
    const ui = teamOverviewUI();
    if (value === 'totalActivity') ui.pulseGrouping = 'visits';
    else if (value === 'membersActive') ui.pulseGrouping = 'members';
    else if (value === 'trainingSessions') ui.activityFilter = 'session';
    else if (value === 'assessments') ui.activityFilter = 'assessment';
    else return;
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    render();
    document.querySelector(`[data-action="pulse-kpi"][data-value="${value}"]`)?.focus({preventScroll: true});
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
    if (!PULSE_ACTIVITY_SORTS[value]) return;
    const ui = teamOverviewUI();
    ui.activitySort = value;
    ui.activitySortOpen = false;
    render();
    document.querySelector('[data-action="pulse-activity-sort-toggle"]')?.focus({preventScroll: true});
  },
  'open-pulse-person': el => openDirectoryPerson(el.dataset.id, 'pulse'),
  'pulse-period': el => {
    const value = el.dataset.value;
    if (!TEAM_OVERVIEW_PERIODS[value]) return;
    const ui = teamOverviewUI();
    const preset = pulseWindowFromDays(PULSE_PERIOD_DAY_COUNT[value]);
    ui.period = value;
    ui.rangeStart = preset.start;
    ui.rangeEnd = preset.end;
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
  const ratio = (clientX - rect.left) / Math.max(1, rect.width);
  return Math.max(0, Math.min(PULSE_BRUSH_DAYS - 1, Math.floor(ratio * PULSE_BRUSH_DAYS)));
}

function pulseBrushPaint(startI, endI) {
  const layout = pulseBrushLayout(startI, endI);
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
  const layout = pulseBrushLayout(startI, endI);
  const ui = teamOverviewUI();
  ui.rangeStart = layout.start;
  ui.rangeEnd = layout.end;
  ui.period = pulsePresetMatching(layout.start, layout.end);
  ui.rangePickerOpen = false;
  pulseBrushDrag = null;
  render();
}

function pulseBrushNudge(mode, step) {
  const ui = teamOverviewUI();
  const domain = pulseBrushDomain();
  let startI = pulseDayIndex(ui.rangeStart, domain.start);
  let endI = pulseDayIndex(ui.rangeEnd, domain.start);
  if (mode === 'start') startI = Math.max(0, Math.min(endI, startI + step));
  else if (mode === 'end') endI = Math.min(PULSE_BRUSH_DAYS - 1, Math.max(startI, endI + step));
  else {
    const span = endI - startI;
    startI = Math.max(0, Math.min(PULSE_BRUSH_DAYS - 1 - span, startI + step));
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
  const startI = pulseDayIndex(ui.rangeStart, domain.start);
  const endI = pulseDayIndex(ui.rangeEnd, domain.start);
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
    let startI = drag.startI + (index - drag.origin);
    startI = Math.max(0, Math.min(PULSE_BRUSH_DAYS - 1 - span, startI));
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
    startI = Math.max(0, Math.min(PULSE_BRUSH_DAYS - 1 - span, drag.startI + (index - drag.origin)));
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
  if (ui.activityTypeOpen || ui.activitySortOpen) {
    if (!event.target.closest('.pulse-activity-filter-anchor')) {
      ui.activityTypeOpen = false;
      ui.activitySortOpen = false;
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
  render();
});

document.addEventListener('change', event => {
  if (event.target.id === 'team-overview-period') {
    const value = event.target.value;
    if (!TEAM_OVERVIEW_PERIODS[value]) return;
    const ui = teamOverviewUI();
    const preset = pulseWindowFromDays(PULSE_PERIOD_DAY_COUNT[value]);
    ui.period = value;
    ui.rangeStart = preset.start;
    ui.rangeEnd = preset.end;
    render();
    return;
  }
});

document.addEventListener('keydown', event => {
  const ui = teamOverviewUI();
  if (event.key === 'Escape' && state.nav === 'pulse' && !state.stage && !state.overlay && (ui.activityTypeOpen || ui.activitySortOpen || ui.rangePickerOpen)) {
    ui.activityTypeOpen = false;
    ui.activitySortOpen = false;
    ui.rangePickerOpen = false;
    pulseRangePickerTeardown();
    render();
    document.querySelector('[data-action="pulse-activity-type-toggle"], [data-action="pulse-activity-sort-toggle"], [data-action="pulse-range-picker-toggle"]')?.focus({preventScroll: true});
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