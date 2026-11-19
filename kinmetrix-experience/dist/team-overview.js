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
  pulseEnsureRange(ui);
  return ui;
}

function visitPulse() {
  if (state.actor !== 'coach') return;
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
  const membersActive = new Set(rows.map(row => row.memberId)).size;
  return {totalActivity: rows.length, membersActive, trainingSessions};
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
    {id: 'membersActive', label: 'Members active', value: current.membersActive, footnote: 'Members with at least one session', previous: previous.membersActive},
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
    {id: 'membersActive', label: 'Members active', value: current.membersActive, previous: previous.membersActive},
    {id: 'trainingSessions', label: 'Sessions', value: current.trainingSessions, previous: previous.trainingSessions}
  ].map(kpi => ({...kpi, deltaLabel: teamKpiDelta(kpi.value, kpi.previous)}));
  const activity = sortPulseActivity(
    currentRows.filter(row => pulseActivityMatchesFilter(row, ui.activityFilter)),
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
  const fmt = date => `${date.getUTCDate()} ${PULSE_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return `${fmt(from)} – ${fmt(to)}`;
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
    label: `${pulseDateRange(start, end)} · ${span} ${span === 1 ? 'day' : 'days'}`
  };
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

function pulseRangeControl(model) {
  const domain = model.brush.domain;
  const startI = pulseDayIndex(model.window.start, domain.start);
  const endI = pulseDayIndex(model.window.end, domain.start);
  const layout = pulseBrushLayout(startI, endI);
  const max = model.brush.max;
  const bars = model.brush.counts.map((count, index) => {
    const height = count ? Math.max(36, (count / max) * 100) : 16;
    const on = index >= layout.a && index <= layout.b;
    return `<span class="${on ? 'is-in' : ''}" style="height:${height}%"></span>`;
  }).join('');
  return `<div class="pulse-brush">
    <div class="pulse-brush-head">
      <p class="pulse-brush-label tabular" id="pulse-brush-label">${escapeHTML(layout.label)}</p>
      <div class="segmented" role="group" aria-label="Snap to a recent stretch">
        ${Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
          `<button type="button" class="${model.ui.period === value ? 'active' : ''}" data-action="pulse-period" data-value="${value}" aria-pressed="${model.ui.period === value}">${item.presetLabel.replace('Last ', '')}</button>`
        ).join('')}
      </div>
    </div>
    <div class="pulse-brush-track" role="group" aria-labelledby="pulse-brush-label">
      <div class="pulse-brush-bars" aria-hidden="true">${bars}</div>
      <div class="pulse-brush-window" data-brush="move" style="left:${layout.left}%;width:${layout.width}%"></div>
      <button type="button" class="pulse-brush-handle is-start" data-brush="start" style="left:${layout.left}%" aria-label="Start of range"></button>
      <button type="button" class="pulse-brush-handle is-end" data-brush="end" style="left:${layout.left + layout.width}%" aria-label="End of range"></button>
    </div>
    <div class="pulse-brush-months" aria-hidden="true">${pulseBrushMonthMarks(domain)}</div>
  </div>`;
}

function pulseHead(model, desc) {
  return `<header class="settings-pane-head team-overview-head">
    <div class="settings-pane-head-row team-overview-head-row">
      <div class="settings-pane-head-text">
        <h1>Pulse</h1>
        <p class="settings-pane-desc">${escapeHTML(model.team.name)}. ${escapeHTML(desc)}</p>
      </div>
    </div>
    ${pulseRangeControl(model)}
  </header>`;
}

function pulseKpiDeltaClass(label) {
  return label.startsWith('+') ? 'is-up' : label.startsWith('-') ? 'is-down' : '';
}

function pulseMetricLabel(id) {
  if (id === 'totalActivity') return 'Activity';
  if (id === 'membersActive') return 'Members';
  return 'Sessions';
}

function pulseMetrics(kpis) {
  return `<dl class="pulse-metrics" aria-label="Team summary">${kpis.map(kpi =>
    `<div>
      <dt>${pulseMetricLabel(kpi.id)}</dt>
      <dd class="tabular">${kpi.value}</dd>
      <p class="pulse-metrics-delta ${pulseKpiDeltaClass(kpi.deltaLabel)}">${escapeHTML(kpi.deltaLabel)}</p>
    </div>`
  ).join('')}</dl>`;
}

function pulseActivityList(model) {
  const {ui, activity, activityAll, roster} = model;
  const face = id => roster.find(person => person.id === id) || {initials: '•', name: ''};
  const filterChips = `<div class="segmented team-overview-activity-filters" role="group" aria-label="Filter activity">${Object.entries(PULSE_ACTIVITY_FILTERS).map(([value, label]) =>
    `<button type="button" class="${ui.activityFilter === value ? 'active' : ''}" data-action="pulse-activity-filter" data-value="${value}" aria-pressed="${ui.activityFilter === value}">${label}</button>`
  ).join('')}</div>`;
  const sortControl = `<label class="team-overview-activity-sort"><span class="sr-only">Sort activity</span>
    <select id="team-overview-activity-sort">${Object.entries(PULSE_ACTIVITY_SORTS).map(([value, label]) =>
      `<option value="${value}" ${ui.activitySort === value ? 'selected' : ''}>${label}</option>`
    ).join('')}</select></label>`;
  return `<section class="team-overview-activity team-overview-activity--expanded" aria-label="Activity">
    <header class="team-overview-activity-head">
      <h2>Activity</h2>
      <div class="team-overview-activity-toolbar">${filterChips}${sortControl}</div>
    </header>
    ${activity.length ? `<ul class="team-overview-activity-list">${activity.map(item =>
      `<li><button type="button" class="team-overview-activity-row" data-action="open-pulse-person" data-id="${item.memberId}">
        ${avatar(face(item.memberId), 'mini')}
        <span class="team-overview-activity-main"><strong>${escapeHTML(item.memberName)}</strong>
          <span class="team-overview-activity-detail">${teamActivityBadgeMarkup(item.badge)}<small>${escapeHTML(item.kindLabel)}</small></span>
          ${item.resultSummary ? `<small class="team-overview-activity-result">${escapeHTML(item.resultSummary)}</small>` : ''}
        </span>
        <span class="team-overview-activity-rel">${escapeHTML(item.timeLabel)}</span>
      </button></li>`
    ).join('')}</ul>` : `<p class="muted team-overview-activity-empty">${activityAll.length ? 'No sessions match this filter.' : 'No sessions in this period.'}</p>`}
  </section>`;
}

function pulsePage() {
  if (state.actor !== 'coach') return peopleView();
  const model = pulseModel();
  return `<main class="team-overview team-overview-home templates-hub staff-single-pane pulse-proto">
    <div class="settings-hub-pane" aria-label="Pulse">
      ${pulseHead(model, 'The session list for this stretch.')}
      ${pulseMetrics(model.kpis)}
      ${pulseActivityList(model)}
    </div>
  </main>`;
}

const teamOverviewActions = {
  'nav-pulse': () => visitPulse(),
  'pulse-activity-filter': el => {
    const value = el.dataset.value;
    if (!PULSE_ACTIVITY_FILTERS[value]) return;
    teamOverviewUI().activityFilter = value;
    render();
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
    render();
    document.querySelector(`[data-action="pulse-period"][data-value="${value}"]`)?.focus({preventScroll: true});
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
  if (windowEl) {
    windowEl.style.left = `${layout.left}%`;
    windowEl.style.width = `${layout.width}%`;
  }
  if (startHandle) startHandle.style.left = `${layout.left}%`;
  if (endHandle) endHandle.style.left = `${layout.left + layout.width}%`;
  if (label) label.textContent = layout.label;
  document.querySelectorAll('.pulse-brush-bars span').forEach((bar, index) => {
    bar.classList.toggle('is-in', index >= layout.a && index <= layout.b);
  });
  return layout;
}

function pulseBrushCommit(startI, endI) {
  const layout = pulseBrushLayout(startI, endI);
  const ui = teamOverviewUI();
  ui.rangeStart = layout.start;
  ui.rangeEnd = layout.end;
  ui.period = pulsePresetMatching(layout.start, layout.end);
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
  if (event.target.id === 'team-overview-activity-sort') {
    const value = event.target.value;
    if (!PULSE_ACTIVITY_SORTS[value]) return;
    teamOverviewUI().activitySort = value;
    render();
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (state.nav !== 'pulse' || state.stage || state.overlay) return;
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
  const brush = event.target.closest?.('.pulse-brush');
  if (brush) {
    event.preventDefault();
    const mode = event.target.dataset.brush || 'move';
    pulseBrushNudge(mode, event.key === 'ArrowRight' ? 1 : -1);
  }
});