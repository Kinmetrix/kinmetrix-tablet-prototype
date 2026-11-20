const CHEVRON =
  '<svg class="thub-d1-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const POLICY = [
  { id: 'station', label: 'Station', status: 'kg · Light theme' },
  { id: 'onboarding', label: 'Onboarding', status: '7 fields on for new members' },
  { id: 'waiver', label: 'Waiver', status: 'Required before session' }
];

const LIBRARIES = [
  {
    id: 'assessments',
    label: 'Assessment',
    blurb: 'Protocol, ROM, and session plan defaults',
    meta: 'Strength · timed 6s hold'
  },
  { id: 'sessions', label: 'Sessions', blurb: 'Reusable load presets', meta: '3 templates' },
  { id: 'programs', label: 'Programs', blurb: 'Multi-day plans for members', meta: '4 templates · 2 assigned' }
];

const hubHead = `<header class="settings-pane-head team-hub-head">
  <div class="settings-pane-head-row">
    <div class="settings-pane-head-text">
      <h1>Team</h1>
      <p class="settings-pane-desc">Northside clinic. Policy and reusable libraries for this clinic.</p>
    </div>
  </div>
</header>`;

function dir1Markup() {
  const policyRows = POLICY.map(
    item => `<button type="button" class="thub-d1-row" data-demo-focus>
      <strong>${item.label}</strong>
      <span class="thub-d1-status">${item.status}</span>
      ${CHEVRON}
    </button>`
  ).join('');
  const libraryRows = LIBRARIES.map(
    item => `<button type="button" class="thub-d1-row">
      <strong>${item.label}</strong>
      <span class="thub-d1-status">${item.meta}</span>
      ${CHEVRON}
    </button>`
  ).join('');
  return `${hubHead}
    <div class="thub-d1-surface team-hub-sections" style="margin-top:8px;gap:0">
      <div class="thub-d1-group">
        <p class="thub-d1-group-label">Team policy</p>
        ${policyRows}
      </div>
      <div class="thub-d1-group">
        <p class="thub-d1-group-label">Libraries</p>
        ${libraryRows}
      </div>
    </div>`;
}

function dir2Markup() {
  const ribbon = POLICY.map(
    item => `<button type="button" class="thub-d2-policy-chip">
      <span>${item.label}</span>
      <strong>${item.status}</strong>
    </button>`
  ).join('');
  const tiles = LIBRARIES.map(item => {
    const tone = item.id === 'assessments' ? 'assessments' : item.id === 'sessions' ? 'sessions' : 'programs';
    return `<button type="button" class="thub-d2-tile thub-d2-tile--${tone}">
      <div>
        <h3>${item.label}</h3>
        <p>${item.blurb}</p>
      </div>
      <span class="thub-d2-tile-meta">${item.meta}</span>
    </button>`;
  }).join('');
  return `${hubHead}
    <div class="team-hub-sections" style="margin-top:4px">
      <div class="thub-d2-policy-ribbon" aria-label="Team policy snapshot">${ribbon}</div>
      <p class="thub-d2-libraries-title">Libraries</p>
      <div class="thub-d2-deck">${tiles}</div>
    </div>`;
}

const PREVIEWS = {
  station: {
    title: 'Station',
    desc: 'Team and station preferences for this clinic.',
    body: `<dl class="thub-d3-kv">
      <div><dt>Force unit</dt><dd>Kilograms (kg)</dd></div>
      <div><dt>Theme</dt><dd>Light</dd></div>
      <div><dt>Roster visibility</dt><dd>Whole clinic roster</dd></div>
    </dl>`
  },
  assessments: {
    title: 'Assessment',
    desc: 'Protocol defaults for assessments at the station.',
    body: `<div class="thub-d3-table-wrap">
      <table class="thub-d3-table">
        <thead><tr><th scope="col">Default</th><th scope="col">Value</th></tr></thead>
        <tbody>
          <tr><th scope="row">Mode</th><td>Strength</td></tr>
          <tr><th scope="row">Hold</th><td>Timed · 6s</td></tr>
          <tr><th scope="row">Session plan</th><td>2× weekly · 6 weeks</td></tr>
        </tbody>
      </table>
    </div>`
  }
};

const compareState = { dir3: 'assessments' };

function dir3Preview(id) {
  const preview = PREVIEWS[id] || {
    title: LIBRARIES.find(l => l.id === id)?.label || POLICY.find(p => p.id === id)?.label || 'Team hub',
    desc: 'Open the full editor for this area.',
    body: `<p class="thub-d3-preview-desc">Prototype preview only — select another item in the rail.</p>`
  };
  return `<div class="thub-d3-preview">
    <h2>${preview.title}</h2>
    <p class="thub-d3-preview-desc">${preview.desc}</p>
    ${preview.body}
    <button type="button" class="thub-d3-open">Open ${preview.title}</button>
  </div>`;
}

function dir3Markup() {
  const policyButtons = POLICY.map(
    item => `<button type="button" data-dir3="${item.id}" ${compareState.dir3 === item.id ? 'aria-current="true"' : ''}>${item.label}</button>`
  ).join('');
  const libraryButtons = LIBRARIES.map(
    item => `<button type="button" data-dir3="${item.id}" ${compareState.dir3 === item.id ? 'aria-current="true"' : ''}>${item.label}</button>`
  ).join('');
  return `${hubHead}
    <div class="thub-d3-split" style="margin-top:10px">
      <nav class="thub-d3-rail" aria-label="Team destinations">
        <p class="thub-d3-rail-section">Policy</p>
        ${policyButtons}
        <p class="thub-d3-rail-section">Libraries</p>
        ${libraryButtons}
      </nav>
      ${dir3Preview(compareState.dir3)}
    </div>`;
}

const DIRECTIONS = [
  {
    id: 'dir1',
    title: 'Status index',
    note: 'Same two groups as today, but equal cards become scan rows: title left, live policy state right. Coaches see configuration at a glance before opening a detail screen.'
  },
  {
    id: 'dir2',
    title: 'Policy ribbon · library deck',
    note: 'Policy collapses into a three-across snapshot band under the header. Libraries take the visual weight as a deck, with Assessment slightly larger because it is edited most often.'
  },
  {
    id: 'dir3',
    title: 'Split hub with preview',
    note: 'Hub becomes an in-pane master–detail: rail lists all six destinations; the wide pane shows a read-only snapshot of the selection so opening a section is a confirmation, not a surprise.'
  }
];

function hostPane(html) {
  return `<main class="directory-page settings-page settings-hub templates-hub team-hub-layout staff-single-pane team-hub-layout-host" aria-label="Team hub prototype">
    <div class="settings-hub-pane team-hub-pane" aria-label="Team policy and libraries">${html}</div>
  </main>`;
}

function renderPanel(d) {
  const body = d.id === 'dir1' ? dir1Markup() : d.id === 'dir2' ? dir2Markup() : dir3Markup();
  return `<article class="team-hub-compare-panel" data-direction="${d.id}">
    <header class="team-hub-compare-panel-head">
      <h2>Direction ${d.id.replace('dir', '')}: ${d.title}</h2>
      <p>${d.note}</p>
    </header>
    <div class="team-hub-compare-frame templates-layered-shell">${hostPane(body)}</div>
  </article>`;
}

function renderAll() {
  const root = document.getElementById('team-hub-compare-grid');
  if (!root) return;
  root.innerHTML = DIRECTIONS.map(renderPanel).join('');
}

document.addEventListener('click', event => {
  const id = event.target.closest('[data-dir3]')?.dataset?.dir3;
  if (!id) return;
  compareState.dir3 = id;
  renderAll();
});

const themeBtn = document.getElementById('team-hub-theme');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    themeBtn.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  });
}

renderAll();