const POLICY_SECTIONS = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'waiver', label: 'Waiver' }
];
const LIBRARY_SECTIONS = [
  { id: 'assessments', label: 'Assessment' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'programs', label: 'Programs' }
];

const DIR2_SECTIONS = [
  { id: 'station', label: 'Station' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'waiver', label: 'Waiver' }
];

const redesignState = {
  dir1: { policy: 'onboarding' },
  dir2: { section: 'station' },
  dir3: { rail: 'team', policy: 'onboarding', library: 'assessments' }
};

function mockSegmented(active) {
  return `<div class="segmented" role="group" aria-label="Preferred force unit">
    ${['Kilograms (kg)', 'Newtons (N)', 'Pounds (lb)'].map((label, i) =>
      `<button type="button" class="${(active === 'kg' && i === 0) || (active !== 'kg' && i === 0) ? 'active' : ''}" ${i === 0 ? 'aria-pressed="true"' : ''}>${label}</button>`
    ).join('')}
  </div>`;
}

function mockStationFieldsFull() {
  return `<label class="field-label">Team name</label>
    <input type="text" value="Northside clinic" readonly tabindex="-1">
    <p class="field-label">Preferred unit</p>
    ${mockSegmented('kg')}
    <section class="settings-block settings-redesign-flat-nested"><h3 class="settings-redesign-flat-subtitle">Appearance</h3>
      <label class="field-label">Theme</label>
      <select tabindex="-1"><option>Light</option><option>Dark</option></select>
    </section>
    <section class="settings-block settings-redesign-flat-nested settings-block--last"><h3 class="settings-redesign-flat-subtitle">Clinician roster visibility</h3>
      <label class="radio-row"><input type="radio" checked disabled> <span><strong>Whole clinic roster</strong><small>Clinicians can find any clinic member.</small></span></label>
    </section>`;
}

function mockStationBlock(compact) {
  return `<section class="settings-block settings-hub-station">
    <h2>Team</h2>
    <label class="field-label">Team name</label>
    <input type="text" value="Northside clinic" readonly tabindex="-1">
    <p class="field-label">Preferred unit</p>
    ${mockSegmented('kg')}
    ${compact ? '' : `<section class="settings-block"><h2>Appearance</h2>
      <label class="field-label">Theme</label>
      <select tabindex="-1"><option>Light</option><option>Dark</option></select>
    </section>
    <section class="settings-block settings-block--last"><h2>Clinician roster visibility</h2>
      <label class="radio-row"><input type="radio" checked disabled> <span><strong>Whole clinic roster</strong><small>Clinicians can find any clinic member.</small></span></label>
    </section>`}
  </section>`;
}

function mockPolicySubnav(panel, active, prefix) {
  return `<nav class="settings-hub-subnav" aria-label="Policies">
    ${POLICY_SECTIONS.map(s => `<button type="button" class="settings-redesign-btn" data-panel="${panel}" data-kind="${prefix}-policy" data-value="${s.id}" ${s.id === active ? 'aria-current="page"' : ''}>${s.label}</button>`).join('')}
  </nav>`;
}

function mockOnboardingFields() {
  const fields = ['Height', 'Weight', 'Current team', 'Sport', 'Email', 'Waiver'];
  return `<section class="settings-block settings-block--last">
    <h2>New user fields</h2>
    <ul class="settings-toggle-list">${fields.map(f => `<li><label class="check-label"><input type="checkbox" checked disabled> ${f}</label></li>`).join('')}</ul>
  </section>`;
}

function mockWaiverFields() {
  return `<section class="settings-block settings-block--last">
    <label class="radio-row"><input type="radio" checked disabled> <span><strong>Before a session</strong><small>Members should sign before assessment or training.</small></span></label>
    <label class="radio-row"><input type="radio" disabled> <span><strong>Optional</strong><small>Show the waiver. Do not block the session.</small></span></label>
  </section>`;
}

function mockPolicyBody(section) {
  if (section === 'waiver') return mockWaiverFields();
  return mockOnboardingFields();
}

function mockDir2SectionContent(section) {
  const fields = ['Height', 'Weight', 'Current team', 'Sport', 'Email', 'Waiver'];
  if (section === 'station') {
    return `<div class="settings-hub-station settings-redesign-split-station">${mockStationFieldsFull()}</div>`;
  }
  if (section === 'waiver') {
    return `<ul class="settings-redesign-choice-list">
      <li><label class="radio-row"><input type="radio" checked disabled> <span><strong>Before a session</strong><small>Members should sign before assessment or training.</small></span></label></li>
      <li><label class="radio-row"><input type="radio" disabled> <span><strong>Optional</strong><small>Show the waiver. Do not block the session.</small></span></label></li>
    </ul>`;
  }
  return `<p class="field-label settings-redesign-policy-lead">New user fields</p>
    <ul class="settings-toggle-list">${fields.map(f => `<li><label class="check-label"><input type="checkbox" checked disabled> ${f}</label></li>`).join('')}</ul>`;
}

function mockDir2PaneBody(sectionId) {
  const item = DIR2_SECTIONS.find(s => s.id === sectionId) || DIR2_SECTIONS[0];
  return `<div class="settings-redesign-pane-body" aria-label="${item.label}">${mockDir2SectionContent(item.id)}</div>`;
}

function mockAssessmentWorkspace() {
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Assessment views">
    <button type="button" aria-current="page">Protocol</button>
    <button type="button">Session plan</button>
  </nav>
  <p class="muted small">Team defaults for session setup.</p>
  <section class="assessment-protocol-panel">
    <p><strong>Isometric</strong></p>
    <label class="field-label">Start tilt</label>
    <input type="number" tabindex="-1" value="5" disabled>
    <label class="field-label">Directions</label>
    <label class="field-label">Reps / direction</label>
    <label class="field-label">Target force</label>
  </section>`;
}

function mockSessionsTable() {
  return `<div class="directory-table-scroll" tabindex="-1">
    <table class="data-table directory-table">
      <thead><tr><th>Session</th><th>Load</th></tr></thead>
      <tbody>
        <tr><th scope="row">Light</th><td>50% · 10 reps</td></tr>
        <tr><th scope="row">Strength</th><td>65% · 8 reps</td></tr>
      </tbody>
    </table>
  </div>`;
}

function mockProgramsFlat() {
  return `<section class="settings-block settings-block--last">
    <div class="settings-hub-pane-toolbar">
      <div><h2 class="settings-hub-pane-title">Programs</h2><p class="muted small">Reusable templates · assign copies to members</p></div>
      <button type="button" class="button primary small-button" disabled aria-label="New program template">New template</button>
    </div>
    <div class="directory-table-scroll" tabindex="-1">
      <table class="data-table directory-table program-grid">
        <thead><tr><th>Program</th><th>Mode</th><th>Sessions</th></tr></thead>
        <tbody><tr><th scope="row">Endurance practice</th><td>Endurance</td><td>6</td></tr></tbody>
      </table>
    </div>
    <h3 class="settings-redesign-subheading">Assigned programs</h3>
    <p class="muted small">Active member copies — same pane, no Templates/Assigned tabs.</p>
    <div class="directory-table-scroll" tabindex="-1">
      <table class="data-table directory-table">
        <thead><tr><th>Person</th><th>Program</th><th>Progress</th></tr></thead>
        <tbody><tr><th scope="row">Angele Test</th><td>Endurance practice</td><td>2 / 6</td></tr></tbody>
      </table>
    </div>
  </section>`;
}

function mockLibrarySubnav(panel, active) {
  return `<nav class="settings-hub-subnav" aria-label="Template libraries">
    ${LIBRARY_SECTIONS.map(s => `<button type="button" class="settings-redesign-btn" data-panel="${panel}" data-kind="library" data-value="${s.id}" ${s.id === active ? 'aria-current="page"' : ''}>${s.label}</button>`).join('')}
  </nav>`;
}

function mockLibraryBody(library) {
  if (library === 'sessions') return mockSessionsTable();
  if (library === 'programs') return mockProgramsFlat();
  return mockAssessmentWorkspace();
}

function mockHubHeader(title, save) {
  return `<header class="directory-heading settings-redesign-heading">
    <div><h1>${title}</h1><p>Interactive prototype · click tabs and rail items</p></div>
    ${save ? '<button type="button" class="button primary" disabled>Save settings</button>' : ''}
  </header>`;
}

function renderDir1() {
  const s = redesignState.dir1;
  return `${mockHubHeader('Settings', true)}
    <p class="settings-redesign-callout muted small"><strong>Templates</strong> live only under sidebar <strong>Templates</strong> — not in Settings.</p>
    <div class="settings-hub-layout settings-redesign-layout">
      <nav class="settings-hub-rail settings-redesign-rail-single" aria-label="Settings categories">
        <button type="button" class="settings-hub-rail-item is-active" aria-current="true">Team settings</button>
      </nav>
      <div class="settings-hub-pane">
        ${mockStationBlock(false)}
        <h2 class="settings-redesign-subheading">Policies</h2>
        ${mockPolicySubnav('dir1', s.policy, 'dir1')}
        ${mockPolicyBody(s.policy)}
      </div>
    </div>`;
}

function renderDir2() {
  const section = redesignState.dir2.section || 'station';
  const save = section === 'station';
  return `${mockHubHeader('Settings', save)}
    <div class="settings-hub-layout settings-redesign-layout">
      <nav class="settings-hub-rail" aria-label="Settings categories">
        ${DIR2_SECTIONS.map(s => `<button type="button" class="settings-hub-rail-item settings-redesign-btn ${s.id === section ? 'is-active' : ''}" data-panel="dir2" data-kind="section" data-value="${s.id}" ${s.id === section ? 'aria-current="true"' : ''}>${s.label}</button>`).join('')}
      </nav>
      <div class="settings-hub-pane settings-redesign-pane-body-wrap">
        ${mockDir2PaneBody(section)}
      </div>
    </div>`;
}

function renderDir3() {
  const s = redesignState.dir3;
  const templates = s.rail === 'templates';
  return `${mockHubHeader('Settings', !templates)}
    <div class="settings-hub-layout settings-redesign-layout">
      <nav class="settings-hub-rail" aria-label="Settings categories">
        <button type="button" class="settings-hub-rail-item settings-redesign-btn ${templates ? 'is-active' : ''}" data-panel="dir3" data-kind="rail" data-value="templates" ${templates ? 'aria-current="true"' : ''}>Template libraries</button>
        <button type="button" class="settings-hub-rail-item settings-redesign-btn ${!templates ? 'is-active' : ''}" data-panel="dir3" data-kind="rail" data-value="team" ${!templates ? 'aria-current="true"' : ''}>Team settings</button>
      </nav>
      <div class="settings-hub-pane">
        ${templates
          ? `${mockLibrarySubnav('dir3', s.library)}${mockLibraryBody(s.library)}`
          : `${mockPolicySubnav('dir3', s.policy, 'dir3')}${mockPolicyBody(s.policy)}`}
      </div>
    </div>`;
}

const REDESIGN_DIRECTIONS = [
  {
    id: 'dir1',
    number: 1,
    title: 'Single home for templates',
    note: 'Settings rail = Team settings only. Template libraries removed from Settings; sidebar Templates is the only entry.'
  },
  {
    id: 'dir2',
    number: 2,
    title: 'Split nav · full-width pane',
    note: 'Left rail: Station, Onboarding, Waiver. Session plan defaults live under Templates → Assessment. Save in header on Station.'
  },
  {
    id: 'dir3',
    number: 3,
    title: 'Flatten Programs',
    note: 'Assessment is a single workspace (protocol + session plan defaults), not a template table. Sessions and Programs keep library patterns.'
  }
];

function renderRedesignPanel(d) {
  const render = d.id === 'dir1' ? renderDir1 : d.id === 'dir2' ? renderDir2 : renderDir3;
  return `<article class="compare-panel settings-redesign-panel" data-redesign="${d.id}">
    <header class="compare-panel-head">
      <div>
        <h2>Direction ${d.number}: ${d.title}</h2>
        <p>${d.note}</p>
      </div>
    </header>
    <div class="compare-frame settings-redesign-frame directory-page settings-page settings-hub" data-panel-root="${d.id}">
      ${render()}
    </div>
  </article>`;
}

function renderRedesignSection() {
  const root = document.getElementById('compare-grid-redesign');
  if (!root) return;
  root.innerHTML = REDESIGN_DIRECTIONS.map(renderRedesignPanel).join('');
}

function onRedesignClick(event) {
  const btn = event.target.closest('.settings-redesign-btn');
  if (!btn) return;
  const panel = btn.dataset.panel;
  const kind = btn.dataset.kind;
  const value = btn.dataset.value;
  const s = redesignState[panel];
  if (!s) return;
  if (kind.endsWith('-policy')) s.policy = value;
  else if (kind === 'section') s.section = value;
  else if (kind === 'rail') s.rail = value;
  else if (kind === 'library') s.library = value;
  renderRedesignSection();
}

document.addEventListener('click', onRedesignClick);
renderRedesignSection();