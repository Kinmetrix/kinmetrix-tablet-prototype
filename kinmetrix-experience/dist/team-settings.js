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

function visitSettings(section = null) {
  if (state.actor !== 'coach') return;
  state.nav = 'settings';
  state.settingsSection = section;
  state.personId = null;
  state.pendingSetup = null;
  state.memberOrigin = 'find';
  render();
  window.scrollTo(0, 0);
}

function settingsBack() {
  return `<button class="text-button settings-back" data-action="settings-home">${icon('back', 'icon-sm')} Settings</button>`;
}

function settingsPage() {
  if (state.actor !== 'coach') return peopleView();
  const section = state.settingsSection;
  if (section === 'onboarding') return teamOnboardingPage();
  if (section === 'waiver') return teamWaiverPage();
  if (section === 'session-plan') return teamSessionPlanDefaultsPage();
  return teamSettingsHome();
}

function teamSettingsHome() {
  const team = teamSettings();
  const rows = [
    {id: 'onboarding', label: 'Onboarding', description: 'Fields collected for a new person.'},
    {id: 'waiver', label: 'Waiver', description: 'When members should sign a waiver.'},
    {id: 'session-plan', label: 'Session plan', description: 'Default follow-up cadence after an assessment.'}
  ];
  return `<main class="directory-page settings-page">
    <header class="directory-heading">
      <div><h1>Settings</h1><p>Team and station preferences for this clinic.</p></div>
      <div class="directory-heading-actions">${button('Save settings', 'save-settings', 'primary')}</div>
    </header>
    <section class="settings-block" aria-labelledby="settings-team-title">
      <h2 id="settings-team-title">Team</h2>
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
    <nav class="settings-links" aria-label="Team settings">
      ${rows.map(row => `<button type="button" class="settings-link" data-action="settings-section" data-section="${row.id}">
        <span><strong>${row.label}</strong><small>${row.description}</small></span>${icon('chevron')}
      </button>`).join('')}
    </nav>
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
    </section>` : `<section class="settings-block"><h2>Clinic access</h2><p class="directory-footnote">Roster visibility: ${state.rosterPolicy === 'all' ? 'Whole clinic' : 'Assigned members'}. Managed by a clinic admin.</p></section>`}
  </main>`;
}

function teamOnboardingPage() {
  const team = teamSettings();
  return `<main class="directory-page settings-page">
    <header class="directory-heading">
      <div>${settingsBack()}<h1>Onboarding</h1><p>First and last name stay required. Other fields can be collected later.</p></div>
      <div class="directory-heading-actions">${button('Save', 'save-onboarding', 'primary')}</div>
    </header>
    <section class="settings-block" aria-label="New user fields">
      <h2>New user fields</h2>
      <ul class="settings-toggle-list">
        ${TEAM_ONBOARDING_FIELDS.map(field => `<li><label class="check-label"><input type="checkbox" name="onboarding-field" value="${field.id}" ${team.onboarding[field.id] ? 'checked' : ''}>${field.label}</label></li>`).join('')}
      </ul>
    </section>
  </main>`;
}

function teamWaiverPage() {
  const team = teamSettings();
  return `<main class="directory-page settings-page">
    <header class="directory-heading">
      <div>${settingsBack()}<h1>Waiver</h1><p>When this team asks members to sign. This does not block Start yet.</p></div>
      <div class="directory-heading-actions">${button('Save', 'save-waiver', 'primary')}</div>
    </header>
    <section class="settings-block" aria-label="Waiver policy">
      ${TEAM_WAIVER_POLICIES.map(item =>
        `<label class="radio-row"><input type="radio" name="waiver-policy" value="${item.id}" ${team.waiverPolicy === item.id ? 'checked' : ''}><span><strong>${item.label}</strong><small>${item.description}</small></span></label>`
      ).join('')}
    </section>
  </main>`;
}

function teamSessionPlanDefaultsPage() {
  const plan = teamSettings().sessionPlan;
  return `<main class="directory-page settings-page">
    <header class="directory-heading">
      <div>${settingsBack()}<h1>Session plan</h1><p>Defaults for the follow-up plan after an assessment.</p></div>
      <div class="directory-heading-actions">${button('Save', 'save-session-plan-defaults', 'primary')}</div>
    </header>
    <section class="settings-block settings-plan-fields" aria-label="Session plan defaults">
      <label class="field-label" for="plan-sessions">Sessions / week</label>
      <select id="plan-sessions">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${plan.sessionsPerWeek === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-weeks">Weeks</label>
      <select id="plan-weeks">${[4, 5, 6, 7, 8].map(n => `<option value="${n}" ${plan.weeks === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-template">Session template</label>
      <select id="plan-template">${clinicSessionTemplates().map(item => `<option value="${item.id}" ${plan.templateId === item.id ? 'selected' : ''}>${item.name} · ${item.detail}</option>`).join('')}</select>
      <p class="directory-footnote">New plans start from ${escapeHTML(sessionPlanLine(plan))}.</p>
    </section>
  </main>`;
}

function saveTeamSettingsHome() {
  if (state.actor !== 'coach' || state.nav !== 'settings' || state.settingsSection) return;
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
  'settings-home': () => visitSettings(),
  'settings-section': el => {
    if (!['onboarding', 'waiver', 'session-plan'].includes(el.dataset.section)) return;
    visitSettings(el.dataset.section);
  },
  'settings-unit': el => {
    if (!exportForceUnits[el.dataset.unit] || state.nav !== 'settings') return;
    const typed = ($('#team-name')?.value || '').trim().replace(/\s+/g, ' ');
    if (typed) teamSettings().name = typed;
    teamSettings().forceUnit = el.dataset.unit;
    render();
  },
  'save-onboarding': () => {
    if (state.actor !== 'coach' || state.settingsSection !== 'onboarding') return;
    const selected = new Set($$('input[name="onboarding-field"]:checked').map(input => input.value));
    const team = teamSettings();
    TEAM_ONBOARDING_FIELDS.forEach(field => { team.onboarding[field.id] = selected.has(field.id); });
    toast('Onboarding preferences saved.');
  },
  'save-waiver': () => {
    if (state.actor !== 'coach' || state.settingsSection !== 'waiver') return;
    const value = $('input[name="waiver-policy"]:checked')?.value;
    if (!TEAM_WAIVER_POLICIES.some(item => item.id === value)) return;
    teamSettings().waiverPolicy = value;
    toast('Waiver policy saved.');
  },
  'save-session-plan-defaults': () => {
    if (state.actor !== 'coach' || state.settingsSection !== 'session-plan') return;
    const sessions = Number($('#plan-sessions').value);
    const weeks = Number($('#plan-weeks').value);
    const templateId = $('#plan-template').value;
    if (![1, 2, 3, 4, 5].includes(sessions) || ![4, 5, 6, 7, 8].includes(weeks) || !sessionPlanTemplate(templateId)) return;
    teamSettings().sessionPlan = {sessionsPerWeek: sessions, weeks, templateId};
    render();
    toast('Session plan defaults saved.');
  }
};
