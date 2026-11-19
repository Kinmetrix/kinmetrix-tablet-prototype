/* Pulse: team KPIs and activity. Loaded after directory.js — exports pulsePage(). */
const TEAM_OVERVIEW_PERIODS = {
  'last-7': {rangeLabel: '6 Nov 2026 – 13 Nov 2026', compareLabel: 'Compared with 30 Oct 2026 – 5 Nov 2026', presetLabel: 'Last 7 days'},
  'last-30': {rangeLabel: '14 Oct 2026 – 13 Nov 2026', compareLabel: 'Compared with 13 Sept 2026 – 13 Oct 2026', presetLabel: 'Last 30 days'},
  'last-90': {rangeLabel: '15 Aug 2026 – 13 Nov 2026', compareLabel: 'Compared with 17 May 2026 – 14 Aug 2026', presetLabel: 'Last 90 days'}
};

const PULSE_REPORTING_END = Date.UTC(2026, 10, 13, 23, 59, 59, 999);
const PULSE_PERIOD_DAY_COUNT = {'last-7': 7, 'last-30': 30, 'last-90': 90};
const PULSE_ACTIVITY_FILTERS = {all: 'All', assessment: 'Assessments', training: 'Training'};
const PULSE_ACTIVITY_SORTS = {newest: 'Newest first', oldest: 'Oldest first', member: 'Member A–Z'};

function teamOverviewUI() {
  const store = directoryUI();
  store.pulse ??= store.home ?? {period: 'last-30'};
  const ui = store.pulse;
  if (!TEAM_OVERVIEW_PERIODS[ui.period]) ui.period = 'last-30';
  if (!PULSE_ACTIVITY_FILTERS[ui.activityFilter]) ui.activityFilter = 'all';
  if (!PULSE_ACTIVITY_SORTS[ui.activitySort]) ui.activitySort = 'newest';
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

function pulsePeriodWindow(periodKey) {
  const days = PULSE_PERIOD_DAY_COUNT[periodKey] ?? 30;
  const end = PULSE_REPORTING_END;
  const start = end - days * 86_400_000 + 1;
  return {start, end, priorStart: start - days * 86_400_000, priorEnd: start - 1};
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
  if (current === previous) return `Unchanged from ${previous}`;
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  const pct = previous === 0 ? 100 : (diff / previous) * 100;
  return `${sign}${diff} (${sign}${pct.toFixed(1)}%) from ${previous}`;
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
      purpose: 'training',
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
      purpose: 'training',
      badge: {label: 'Training', tone: 'training'},
      kindLabel: `${programName} · session ${sessionNum}`
    };
  }
  if (purpose === 'training') {
    return {
      purpose: 'training',
      badge: {label: 'Training', tone: 'training'},
      kindLabel: `${proto} training`
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
  const trainingSessions = rows.filter(row => row.purpose === 'training').length;
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
    {id: 'trainingSessions', label: 'Training sessions', value: current.trainingSessions, footnote: 'Training sessions in the period', previous: previous.trainingSessions}
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
  if (filter === 'training') return row.purpose === 'training';
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

function pulsePage() {
  if (state.actor !== 'coach') return peopleView();
  const ui = teamOverviewUI();
  const roster = visiblePeople();
  const period = TEAM_OVERVIEW_PERIODS[ui.period];
  const kpis = teamOverviewKpis(roster, ui.period);
  const activityAll = teamOverviewActivityRows(roster, ui.period);
  const activity = sortPulseActivity(
    activityAll.filter(row => pulseActivityMatchesFilter(row, ui.activityFilter)),
    ui.activitySort
  );
  const team = teamSettings();
  const filterChips = `<div class="segmented team-overview-activity-filters" role="group" aria-label="Filter activity">${Object.entries(PULSE_ACTIVITY_FILTERS).map(([value, label]) =>
    `<button type="button" class="${ui.activityFilter === value ? 'active' : ''}" data-action="pulse-activity-filter" data-value="${value}" aria-pressed="${ui.activityFilter === value}">${label}</button>`
  ).join('')}</div>`;
  const sortControl = `<label class="team-overview-activity-sort"><span class="sr-only">Sort activity</span>
    <select id="team-overview-activity-sort">${Object.entries(PULSE_ACTIVITY_SORTS).map(([value, label]) =>
      `<option value="${value}" ${ui.activitySort === value ? 'selected' : ''}>${label}</option>`
    ).join('')}</select></label>`;
  return `<main class="team-overview team-overview-home templates-hub staff-single-pane">
    <div class="settings-hub-pane" aria-label="Pulse">
    <header class="settings-pane-head team-overview-head">
      <div class="settings-pane-head-row team-overview-head-row">
        <div class="settings-pane-head-text">
          <h1>Pulse</h1>
          <p class="settings-pane-desc">${escapeHTML(team.name)}. Team KPIs and activity for the selected period.</p>
        </div>
        <div class="team-overview-period-inline" aria-label="Reporting period">
          <label class="team-overview-period-select"><span class="sr-only">Reporting period</span>
            <select id="team-overview-period">${Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
              `<option value="${value}" ${ui.period === value ? 'selected' : ''}>${item.presetLabel}</option>`
            ).join('')}</select>
          </label>
          <p class="muted small team-overview-period-range-inline">${period.rangeLabel}</p>
        </div>
      </div>
    </header>
    <div class="team-overview-kpis" aria-label="Team summary">
      ${kpis.map(kpi => {
        const deltaClass = kpi.deltaLabel.startsWith('+') ? 'is-up' : kpi.deltaLabel.startsWith('-') ? 'is-down' : '';
        return `<article class="team-overview-kpi">
          <p class="muted small">${kpi.label}</p>
          <div class="team-overview-kpi-main">
            <p class="team-overview-kpi-value">${kpi.value}</p>
            ${teamKpiSparkline(kpi.id, kpi.trend)}
          </div>
          <p class="team-overview-kpi-delta ${deltaClass}">${escapeHTML(kpi.deltaLabel)}</p>
          <p class="muted small">${kpi.footnote}</p>
        </article>`;
      }).join('')}
    </div>
    <section class="team-overview-activity team-overview-activity--expanded" aria-label="Activity">
      <header class="team-overview-activity-head">
        <h2>Activity</h2>
        <div class="team-overview-activity-toolbar">${filterChips}${sortControl}</div>
      </header>
      ${activity.length ? `<ul class="team-overview-activity-list">${activity.map(item =>
        `<li><button type="button" class="team-overview-activity-row" data-action="open-roster-person" data-id="${item.memberId}">
          ${avatar(people.find(p => p.id === item.memberId) || {initials: '•', color: ''}, 'mini')}
          <span class="team-overview-activity-main"><strong>${escapeHTML(item.memberName)}</strong>
            <span class="team-overview-activity-detail">${teamActivityBadgeMarkup(item.badge)}<small>${escapeHTML(item.kindLabel)}</small></span>
            ${item.resultSummary ? `<small class="team-overview-activity-result">${escapeHTML(item.resultSummary)}</small>` : ''}
          </span>
          <span class="team-overview-activity-rel">${escapeHTML(item.timeLabel)}</span>
        </button></li>`
      ).join('')}</ul>` : `<p class="muted team-overview-activity-empty">${activityAll.length ? 'No sessions match this filter.' : 'No sessions in this period.'}</p>`}
    </section>
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
  }
};

document.addEventListener('change', event => {
  if (event.target.id === 'team-overview-period') {
    const value = event.target.value;
    if (!TEAM_OVERVIEW_PERIODS[value]) return;
    teamOverviewUI().period = value;
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