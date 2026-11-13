/* Roster canvas: team dashboard. Uses the same sidebar Roster item. */
const TEAM_OVERVIEW_PAGE_SIZE = 6;
const TEAM_OVERVIEW_PERIODS = {
  'last-7': {rangeLabel: '6 Nov 2026 – 13 Nov 2026', compareLabel: 'Compared with 30 Oct 2026 – 5 Nov 2026', presetLabel: 'Last 7 days'},
  'last-30': {rangeLabel: '14 Oct 2026 – 13 Nov 2026', compareLabel: 'Compared with 13 Sept 2026 – 13 Oct 2026', presetLabel: 'Last 30 days'},
  'last-90': {rangeLabel: '15 Aug 2026 – 13 Nov 2026', compareLabel: 'Compared with 17 May 2026 – 14 Aug 2026', presetLabel: 'Last 90 days'}
};

function teamOverviewUI() {
  const ui = directoryUI().roster;
  ui.dashboardQuery ??= '';
  ui.dashboardPage ??= 0;
  ui.period ??= 'last-30';
  if (!TEAM_OVERVIEW_PERIODS[ui.period]) ui.period = 'last-30';
  return ui;
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

function teamOverviewMemberRow(member) {
  const summary = directoryPersonSummary(member);
  const records = teamOverviewRecords(member.id);
  const latest = records[0];
  return {
    member,
    analysesCount: records.length,
    forceLabel: summary.force == null ? null : teamForceLabel(summary.force),
    stabilityLabel: summary.stability == null ? null : Math.round(summary.stability) + '%',
    measuredLabel: latest ? (latest.date || sessionStamp(latest)) : 'No data',
    assessment: summary.assessment
  };
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
  return rows.slice(0, 12);
}

function rosterPage() {
  if (state.actor !== 'coach') return peopleView();
  const ui = teamOverviewUI();
  const roster = visiblePeople();
  const period = TEAM_OVERVIEW_PERIODS[ui.period];
  const kpis = teamOverviewKpis(roster);
  const query = ui.dashboardQuery.trim().toLowerCase();
  const rows = roster.map(teamOverviewMemberRow).filter(row => !query || row.member.name.toLowerCase().includes(query));
  const pageCount = Math.max(1, Math.ceil(rows.length / TEAM_OVERVIEW_PAGE_SIZE));
  const page = Math.min(ui.dashboardPage, pageCount - 1);
  ui.dashboardPage = page;
  const pageRows = rows.slice(page * TEAM_OVERVIEW_PAGE_SIZE, page * TEAM_OVERVIEW_PAGE_SIZE + TEAM_OVERVIEW_PAGE_SIZE);
  const rangeStart = rows.length === 0 ? 0 : page * TEAM_OVERVIEW_PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, page * TEAM_OVERVIEW_PAGE_SIZE + TEAM_OVERVIEW_PAGE_SIZE);
  const selected = rosterCompareSelection();
  const activity = teamOverviewActivity(roster);
  const team = teamSettings();
  return `<main class="directory-page team-overview">
    <header class="directory-heading team-overview-head">
      <div>
        <h1>Team overview</h1>
        <p>${escapeHTML(team.name)}. Members, measurements, and activity in one place.</p>
      </div>
    </header>
    <section class="team-overview-period" aria-label="Reporting period">
      <div>
        <p class="team-overview-period-range">${period.rangeLabel}</p>
        <p class="muted small">${period.compareLabel}</p>
      </div>
      <label class="team-overview-period-select"><span class="sr-only">Reporting period</span>
        <select id="team-overview-period">${Object.entries(TEAM_OVERVIEW_PERIODS).map(([value, item]) =>
          `<option value="${value}" ${ui.period === value ? 'selected' : ''}>${item.presetLabel}</option>`
        ).join('')}</select>
      </label>
    </section>
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
    <div class="team-overview-split">
      <section class="team-overview-members" aria-label="Members">
        <div class="team-overview-members-head">
          <div class="team-overview-members-title">
            <h2>Members</h2>
            <span class="team-overview-members-count">${roster.length}</span>
          </div>
          <div class="team-overview-members-actions">
            ${button('Compare', 'comparison-open', 'small-button', `data-source="roster" aria-haspopup="dialog" ${selected.length < 2 ? 'disabled' : ''}`)}
            ${button(icon('plus', 'icon-sm') + ' Add person', 'add-person', 'small-button', 'aria-haspopup="dialog"')}
          </div>
        </div>
        <label class="team-overview-search">${icon('search')}<input id="team-overview-search" type="search" placeholder="Find a member…" aria-label="Find a member" value="${escapeHTML(ui.dashboardQuery)}" autocomplete="off"></label>
        <div class="directory-table-scroll team-overview-table-wrap" tabindex="0" role="region" aria-label="Team members">
          <table class="data-table directory-table team-overview-table">
            <thead>
              <tr>
                <th scope="col" class="comparison-select-column"><span class="sr-only">Compare</span></th>
                <th scope="col">Member</th>
                <th scope="col">Analyses</th>
                <th scope="col">Current force</th>
                <th scope="col">Stability</th>
                <th scope="col">Measured</th>
              </tr>
            </thead>
            <tbody>
              ${pageRows.map(row => `<tr class="${selected.includes(row.member.id) ? 'is-selected' : ''}">
                <td class="comparison-select-column">${comparisonCheckbox('roster', row.member.id, row.assessment, row.member.name)}</td>
                <th scope="row"><div class="directory-identity">${photoAvatar(row.member, 'mini')}<button class="directory-person" data-action="open-roster-person" data-id="${row.member.id}"><span>${escapeHTML(row.member.name)}</span></button></div></th>
                <td class="numeric">${row.analysesCount}</td>
                <td class="numeric">${row.forceLabel ? `<strong>${row.forceLabel}</strong>` : '<span class="muted">Not measured</span>'}</td>
                <td class="numeric">${row.stabilityLabel ? `<strong>${row.stabilityLabel}</strong>` : '<span class="muted">Not measured</span>'}</td>
                <td>${row.measuredLabel === 'No data' ? '<span class="muted">No data</span>' : escapeHTML(row.measuredLabel)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <footer class="team-overview-pagination">
          <p class="muted small">${rangeStart}–${rangeEnd} of ${rows.length} members</p>
          <div class="team-overview-pagination-controls">
            ${button('Previous', 'team-overview-page', 'small-button', `data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}`)}
            ${Array.from({length: pageCount}, (_, index) =>
              button(String(index + 1), 'team-overview-page', 'small-button' + (index === page ? ' is-current-page' : ''), `data-page="${index}" ${index === page ? 'aria-current="page"' : ''}`)
            ).join('')}
            ${button('Next', 'team-overview-page', 'small-button', `data-page="${page + 1}" ${page >= pageCount - 1 ? 'disabled' : ''}`)}
          </div>
        </footer>
      </section>
      <section class="team-overview-activity" aria-label="Recent activity">
        <header class="team-overview-activity-head"><h2>Recent activity</h2></header>
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

function refreshRoster() {
  if (state.nav === 'roster') {
    const active = document.activeElement;
    const compareValue = active?.dataset?.compareSource === 'roster' ? active.value : null;
    const search = active?.id === 'team-overview-search';
    render();
    if (compareValue) $(`input[data-compare-source="roster"][value="${CSS.escape(compareValue)}"]`)?.focus({preventScroll: true});
    else if (search) $('#team-overview-search')?.focus();
    return;
  }
  const slot = $('#roster-results');
  if (slot) slot.innerHTML = rosterResults();
}

const teamOverviewActions = {
  'team-overview-page': el => {
    const page = Number(el.dataset.page);
    if (!Number.isInteger(page) || page < 0) return;
    teamOverviewUI().dashboardPage = page;
    render();
  }
};

document.addEventListener('input', event => {
  if (event.target.id !== 'team-overview-search') return;
  const ui = teamOverviewUI();
  ui.dashboardQuery = event.target.value;
  ui.dashboardPage = 0;
  render();
  const field = $('#team-overview-search');
  if (field) {
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }
});

document.addEventListener('change', event => {
  if (event.target.id !== 'team-overview-period') return;
  const value = event.target.value;
  if (!TEAM_OVERVIEW_PERIODS[value]) return;
  teamOverviewUI().period = value;
  render();
});
