/* Team settings page. Station Settings is a directory page, not a dialog. */
const TEAM_ONBOARDING_FIELDS = [
  {id: 'height', label: 'Height', on: true},
  {id: 'weight', label: 'Weight', on: true},
  {id: 'dob', label: 'Date of birth', on: false},
  {id: 'team', label: 'Current team', on: true},
  {id: 'sport', label: 'Sport', on: true},
  {id: 'position', label: 'Position', on: true},
  {id: 'hand', label: 'Hand', on: false},
  {id: 'competition', label: 'Competition level', on: false},
  {id: 'email', label: 'Email', on: true},
  {id: 'waiver', label: 'Waiver', on: true}
];
const TEAM_WAIVER_POLICIES = [
  {id: 'before-session', label: 'Before a session', description: 'Members should sign before assessment or training.'},
  {id: 'optional', label: 'Optional', description: 'Show the waiver. Do not block the session.'},
  {id: 'off', label: 'Off', description: 'Do not ask for a waiver on this team.'}
];
const SETTINGS_RAIL_SECTIONS = [
  {id: 'station', label: 'Station', description: 'Team and station preferences for this clinic.'},
  {id: 'onboarding', label: 'Onboarding', description: 'Fields collected for a new person.'},
  {id: 'waiver', label: 'Waiver', description: 'When members should sign a waiver.'},
  {id: 'session-plan', label: 'Session plan', description: 'Default follow-up cadence after an assessment.'}
];

function teamSettings() {
  const defaults = {
    name: 'Northside clinic',
    forceUnit: 'kg',
    onboarding: Object.fromEntries(TEAM_ONBOARDING_FIELDS.map(field => [field.id, field.on])),
    waiverPolicy: 'before-session',
    sessionPlan: {sessionsPerWeek: 2, weeks: 6, templateId: 'light'}
  };
  if (!state.team) state.team = defaults;
  const team = state.team;
  team.name ??= defaults.name;
  team.forceUnit = exportForceUnits[team.forceUnit] ? team.forceUnit : 'kg';
  team.onboarding = {...defaults.onboarding, ...team.onboarding};
  if (!TEAM_WAIVER_POLICIES.some(item => item.id === team.waiverPolicy)) team.waiverPolicy = defaults.waiverPolicy;
  team.sessionPlan = {...defaults.sessionPlan, ...team.sessionPlan};
  if (!clinicSessionTemplates().some(item => item.id === team.sessionPlan.templateId)) team.sessionPlan.templateId = 'light';
  return team;
}

function sessionPlanTemplate(id) {
  return clinicSessionTemplates().find(item => item.id === id) || clinicSessionTemplates()[0];
}

function sessionPlanLine(plan) {
  const template = sessionPlanTemplate(plan.templateId);
  return `${plan.sessionsPerWeek}× weekly · ${plan.weeks} weeks · ${template.name}`;
}

function settingsActiveSection() {
  const active = state.settingsHubSection ?? 'station';
  return SETTINGS_RAIL_SECTIONS.some(item => item.id === active) ? active : 'station';
}

function visitSettings(section = null) {
  if (state.actor !== 'coach') return;
  state.nav = 'settings';
  state.settingsSection = null;
  if (section) {
    state.settingsHubSection = SETTINGS_RAIL_SECTIONS.some(item => item.id === section) ? section : 'station';
  } else if (!state.settingsHubSection || !SETTINGS_RAIL_SECTIONS.some(item => item.id === state.settingsHubSection)) {
    state.settingsHubSection = 'station';
  }
  state.personId = null;
  state.pendingSetup = null;
  state.memberOrigin = 'find';
  render();
  window.scrollTo(0, 0);
}

function settingsTeamRail(activeSectionId) {
  return `<nav class="settings-hub-rail" aria-label="Settings">
    <p class="settings-rail-caption" aria-hidden="true">Settings</p>
    ${SETTINGS_RAIL_SECTIONS.map(item => `<button type="button" class="settings-hub-rail-item ${item.id === activeSectionId ? 'is-active' : ''}" data-action="settings-hub-section" data-section="${item.id}" ${item.id === activeSectionId ? 'aria-current="true"' : ''}>${item.label}</button>`).join('')}
  </nav>`;
}

function settingsPaneHead(activeItem, section) {
  const actions = section === 'station' ? button('Save settings', 'save-settings', 'primary') : '';
  const desc = activeItem.description ? `<p class="settings-pane-desc">${escapeHTML(activeItem.description)}</p>` : '';
  return `<header class="settings-pane-head">
    <div class="settings-pane-head-row">
      <div class="settings-pane-head-text">
        <h1>${escapeHTML(activeItem.label)}</h1>
        ${desc}
      </div>
      ${actions ? `<div class="settings-pane-head-actions">${actions}</div>` : ''}
    </div>
  </header>`;
}

function settingsPaneSubnav(activeSectionId) {
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--sections" aria-label="Settings sections">
    ${SETTINGS_RAIL_SECTIONS.map(item => `<button type="button" data-action="settings-hub-section" data-section="${item.id}" ${item.id === activeSectionId ? 'aria-current="page"' : ''}>${item.label}</button>`).join('')}
  </nav>`;
}

function teamStationBlocks() {
  const team = teamSettings();
  return `<section class="settings-block settings-hub-station" aria-label="Station">
      <label class="field-label" for="team-name">Team name</label>
      <input id="team-name" type="text" maxlength="80" value="${escapeHTML(team.name)}" autocomplete="off">
      <p class="field-label">Preferred unit</p>
      <div class="segmented" role="group" aria-label="Preferred force unit">
        ${[['kg', 'Kilograms (kg)'], ['n', 'Newtons (N)'], ['lb', 'Pounds (lb)']].map(([value, label]) =>
          `<button type="button" data-action="settings-unit" data-unit="${value}" class="${team.forceUnit === value ? 'active' : ''}" aria-pressed="${team.forceUnit === value}">${label}</button>`
        ).join('')}
      </div>
      <p class="directory-footnote">Roster force uses this unit. Reports still choose a unit at export.</p>
    </section>
    <section class="settings-block" aria-labelledby="settings-appearance-title">
      <h2 id="settings-appearance-title">Appearance</h2>
      <label class="field-label" for="settings-theme">Theme</label>
      <select id="settings-theme">
        <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
        <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
      </select>
    </section>
    ${isAdmin() ? `<section class="settings-block" aria-labelledby="settings-access-title">
      <h2 id="settings-access-title">Clinician roster visibility</h2>
      ${[['all', 'Whole clinic roster', 'Clinicians can find any clinic member.'], ['assigned', 'Assigned members only', 'Each clinician sees their assigned people.']].map(([value, label, desc]) =>
        `<label class="radio-row"><input type="radio" name="roster-policy" value="${value}" ${state.rosterPolicy === value ? 'checked' : ''}><span><strong>${label}</strong><small>${desc}</small></span></label>`
      ).join('')}
      <h2>Default station entry</h2>
      ${[['coach', 'Clinician access'], ['member', 'Member self-service']].map(([value, label]) =>
        `<label class="radio-row"><input type="radio" name="default-entry" value="${value}" ${state.defaultEntry === value ? 'checked' : ''}><span><strong>${label}</strong></span></label>`
      ).join('')}
      <p class="directory-footnote">Clinic admins retain access to the full roster. Access policies are simulated.</p>
    </section>` : `<section class="settings-block"><h2>Clinic access</h2><p class="directory-footnote">Roster visibility: ${state.rosterPolicy === 'all' ? 'Whole clinic' : 'Assigned members'}. Managed by a clinic admin.</p></section>`}`;
}

function teamOnboardingBody() {
  const team = teamSettings();
  return `<section class="settings-block" aria-label="New user fields">
      <div class="settings-hub-pane-toolbar">
        <div><p class="muted small">First and last name stay required. Other fields can be collected later.</p></div>
        ${button('Save', 'save-onboarding', 'primary')}
      </div>
      <ul class="settings-toggle-list">
        ${TEAM_ONBOARDING_FIELDS.map(field => `<li><label class="check-label"><input type="checkbox" name="onboarding-field" value="${field.id}" ${team.onboarding[field.id] ? 'checked' : ''}>${field.label}</label></li>`).join('')}
      </ul>
    </section>`;
}

function teamWaiverBody() {
  const team = teamSettings();
  return `<section class="settings-block" aria-label="Waiver policy">
      <div class="settings-hub-pane-toolbar">
        <div><p class="muted small">When this team asks members to sign. This does not block Start yet.</p></div>
        ${button('Save', 'save-waiver', 'primary')}
      </div>
      ${TEAM_WAIVER_POLICIES.map(item =>
        `<label class="radio-row"><input type="radio" name="waiver-policy" value="${item.id}" ${team.waiverPolicy === item.id ? 'checked' : ''}><span><strong>${item.label}</strong><small>${item.description}</small></span></label>`
      ).join('')}
    </section>`;
}

function teamSessionPlanBody() {
  const plan = teamSettings().sessionPlan;
  return `<section class="settings-block settings-plan-fields" aria-label="Session plan defaults">
      <div class="settings-hub-pane-toolbar">
        <div><p class="muted small">Defaults for the follow-up plan after an assessment.</p></div>
        ${button('Save', 'save-session-plan-defaults', 'primary')}
      </div>
      <label class="field-label" for="plan-sessions">Sessions / week</label>
      <select id="plan-sessions">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${plan.sessionsPerWeek === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-weeks">Weeks</label>
      <select id="plan-weeks">${[4, 5, 6, 7, 8].map(n => `<option value="${n}" ${plan.weeks === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-template">Session template</label>
      <select id="plan-template">${clinicSessionTemplates().map(item => `<option value="${item.id}" ${plan.templateId === item.id ? 'selected' : ''}>${item.name} · ${item.detail}</option>`).join('')}</select>
      <p class="directory-footnote">New plans start from ${escapeHTML(sessionPlanLine(plan))}.</p>
    </section>`;
}

function settingsRailPane(section) {
  if (section === 'onboarding') return teamOnboardingBody();
  if (section === 'waiver') return teamWaiverBody();
  if (section === 'session-plan') return teamSessionPlanBody();
  return teamStationBlocks();
}

function settingsPage() {
  if (state.actor !== 'coach') return peopleView();
  const section = settingsActiveSection();
  const activeItem = SETTINGS_RAIL_SECTIONS.find(item => item.id === section) || SETTINGS_RAIL_SECTIONS[0];
  return `<main class="directory-page settings-page settings-hub settings-workspace settings-hub-layout settings-workspace-layout templates-hub">
    ${settingsTeamRail(section)}
    <div class="settings-hub-pane" aria-label="${escapeHTML(activeItem.label)}">
      ${settingsPaneHead(activeItem, section)}
      ${settingsPaneSubnav(section)}
      ${settingsRailPane(section)}
    </div>
  </main>`;
}

function saveTeamSettingsHome() {
  if (state.actor !== 'coach' || state.nav !== 'settings') return;
  const team = teamSettings();
  const name = ($('#team-name')?.value || '').trim().replace(/\s+/g, ' ');
  if (!name) {
    $('#team-name')?.setCustomValidity('Enter a team name.');
    $('#team-name')?.reportValidity();
    return;
  }
  team.name = name;
  theme = $('#settings-theme').value === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem('kinmetrix-theme', theme); } catch {}
  applyTheme();
  if (isAdmin()) {
    const policy = $('input[name="roster-policy"]:checked')?.value;
    const entry = $('input[name="default-entry"]:checked')?.value;
    if (policy === 'all' || policy === 'assigned') state.rosterPolicy = policy;
    if (entry === 'coach' || entry === 'member') state.defaultEntry = entry;
  }
  render();
  toast('Settings saved.');
}

const teamSettingsActions = {
  'settings-hub-section': el => {
    if (!SETTINGS_RAIL_SECTIONS.some(item => item.id === el.dataset.section)) return;
    state.settingsHubSection = el.dataset.section;
    render();
    $(`[data-action="settings-hub-section"][data-section="${el.dataset.section}"]`)?.focus();
  },
  'settings-unit': el => {
    if (!exportForceUnits[el.dataset.unit] || state.nav !== 'settings') return;
    const typed = ($('#team-name')?.value || '').trim().replace(/\s+/g, ' ');
    if (typed) teamSettings().name = typed;
    teamSettings().forceUnit = el.dataset.unit;
    render();
  },
  'save-onboarding': () => {
    if (state.actor !== 'coach' || state.nav !== 'settings' || state.settingsHubSection !== 'onboarding') return;
    const selected = new Set($$('input[name="onboarding-field"]:checked').map(input => input.value));
    const team = teamSettings();
    TEAM_ONBOARDING_FIELDS.forEach(field => { team.onboarding[field.id] = selected.has(field.id); });
    toast('Onboarding preferences saved.');
  },
  'save-waiver': () => {
    if (state.actor !== 'coach' || state.nav !== 'settings' || state.settingsHubSection !== 'waiver') return;
    const value = $('input[name="waiver-policy"]:checked')?.value;
    if (!TEAM_WAIVER_POLICIES.some(item => item.id === value)) return;
    teamSettings().waiverPolicy = value;
    toast('Waiver policy saved.');
  },
  'save-session-plan-defaults': () => {
    if (state.actor !== 'coach' || state.nav !== 'settings' || state.settingsHubSection !== 'session-plan') return;
    const sessions = Number($('#plan-sessions').value);
    const weeks = Number($('#plan-weeks').value);
    const templateId = $('#plan-template').value;
    if (![1, 2, 3, 4, 5].includes(sessions) || ![4, 5, 6, 7, 8].includes(weeks) || !sessionPlanTemplate(templateId)) return;
    teamSettings().sessionPlan = {sessionsPerWeek: sessions, weeks, templateId};
    render();
    toast('Session plan defaults saved.');
  }
};