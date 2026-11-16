/* Home canvas: team KPIs and Activity. Loaded after directory.js — exports homePage(), not rosterPage(). */
const TEAM_OVERVIEW_PERIODS = {
  'last-7': {rangeLabel: '6 Nov 2026 – 13 Nov 2026', compareLabel: 'Compared with 30 Oct 2026 – 5 Nov 2026', presetLabel: 'Last 7 days'},
  'last-30': {rangeLabel: '14 Oct 2026 – 13 Nov 2026', compareLabel: 'Compared with 13 Sept 2026 – 13 Oct 2026', presetLabel: 'Last 30 days'},
  'last-90': {rangeLabel: '15 Aug 2026 – 13 Nov 2026', compareLabel: 'Compared with 17 May 2026 – 14 Aug 2026', presetLabel: 'Last 90 days'}
};

function teamOverviewUI() {
  const store = directoryUI();
  store.home ??= {period: 'last-30'};
  const ui = store.home;
  if (!TEAM_OVERVIEW_PERIODS[ui.period]) ui.period = 'last-30';
  return ui;
}

function visitHome() {
  if (state.actor !== 'coach') return;
  state.nav = 'home';
  state.personId = null;
  state.pendingSetup = null;
  state.memberOrigin = 'home';
  render();
  window.scrollTo(0, 0);
}

function teamForceLabel(kg) {
  if (kg == null || !Number.isFinite(kg)) return null;
  const unit = teamSettings().forceUnit;
  return exportForce(kg, unit) + ' ' + exportForceUnits[unit].label;
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

function teamOverviewKpis(roster) {
  const activeUsers = roster.filter(member => teamOverviewRecords(member.id).length > 0).length;
  const analyses = roster.reduce((total, member) => total + teamOverviewRecords(member.id).length, 0);
  const programs = roster.filter(member => memberPrograms(member.id).some(plan => plan.completed < plan.total)).length;
  const previous = value => value <= 0 ? 0 : Math.max(0, value - Math.max(1, Math.round(value * 0.14)));
  return [
    {id: 'activeUsers', label: 'Active users', value: activeUsers, footnote: 'Completed an analysis in the period', previous: previous(activeUsers)},
    {id: 'analyses', label: 'Analyses', value: analyses, footnote: 'Completed during period', previous: previous(analyses)},
    {id: 'programs', label: 'Active programs', value: programs, footnote: 'Member assignments at period end', previous: previous(programs)}
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
  const color = last > first ? 'var(--signal)' : last < first ? 'var(--red)' : 'var(--muted)';
  return `<svg class="team-kpi-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`;
}

function teamOverviewActivity(roster) {
  const rows = [];
  for (const member of roster) {
    for (const record of teamOverviewRecords(member.id)) {
      rows.push({
        id: `${member.id}:${record.id}`,
        memberId: member.id,
        memberName: member.name,
        kindLabel: `${protocols[record.type]?.name || 'Session'} ${record.purpose === 'training' ? 'training' : 'assessment'}`,
        timeLabel: record.date || sessionStamp(record),
        at: record.completedAt || 0
      });
    }
  }
  rows.sort((a, b) => b.at - a.at);
  return rows.slice(0, 36);
}

function homePage() {
  if (state.actor !== 'coach') return peopleView();
  const ui = teamOverviewUI();
  const roster = visiblePeople();
  const period = TEAM_OVERVIEW_PERIODS[ui.period];
  const kpis = teamOverviewKpis(roster);
  const activity = teamOverviewActivity(roster);
  const team = teamSettings();
  return `<main class="team-overview team-overview-home templates-hub staff-single-pane">
    <div class="settings-hub-pane" aria-label="Home">
    <header class="directory-heading team-overview-head team-overview-head--with-period">
      <div class="team-overview-head-main">
        <div class="team-overview-title-block">
          <h1>Home</h1>
          <p>${escapeHTML(team.name)}. Team KPIs and activity for the selected period.</p>
        </div>
        <section class="team-overview-head-period" aria-label="Reporting period">
        <div>
          <p class="team-overview-period-range">${period.rangeLabel}</p>
          <p class="muted small team-overview-compare-label">${period.compareLabel}</p>
        </div>
        <label class="team-overview-period-select"><span class="sr-only">Reporting period</span>
          <select id="team-overview-period">${Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
            `<option value="${value}" ${ui.period === value ? 'selected' : ''}>${item.presetLabel}</option>`
          ).join('')}</select>
        </label>
        </section>
      </div>
    </header>
    <div class="team-overview-kpis" aria-label="Team summary">
      ${kpis.map(kpi => {
        const deltaClass = kpi.deltaLabel.startsWith('+') ? 'is-positive' : kpi.deltaLabel.startsWith('-') ? 'is-negative' : '';
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
      <header class="team-overview-activity-head"><h2>Activity</h2></header>
      ${activity.length ? `<ul class="team-overview-activity-list">${activity.map(item =>
        `<li><button type="button" class="team-overview-activity-row" data-action="open-roster-person" data-id="${item.memberId}">
          ${avatar(people.find(p => p.id === item.memberId) || {initials: '•', color: ''}, 'mini')}
          <span class="team-overview-activity-main"><strong>${escapeHTML(item.memberName)}</strong><small>${escapeHTML(item.kindLabel)}</small></span>
          <span class="team-overview-activity-rel">${escapeHTML(item.timeLabel)}</span>
        </button></li>`
      ).join('')}</ul>` : '<p class="muted">No sessions yet.</p>'}
    </section>
    </div>
  </main>`;
}

const teamOverviewActions = {'nav-home': () => visitHome()};

document.addEventListener('change', event => {
  if (event.target.id !== 'team-overview-period') return;
  const value = event.target.value;
  if (!TEAM_OVERVIEW_PERIODS[value]) return;
  teamOverviewUI().period = value;
  render();
});