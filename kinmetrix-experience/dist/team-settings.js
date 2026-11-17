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
  {id: 'waiver', label: 'Waiver', description: 'When members should sign a waiver.'}
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
  team.assessment = normalizeTeamAssessment(team.assessment);
  return team;
}

const TEAM_ASSESSMENT_DEFAULTS = {
  activeMode: 'strength',
  holdStyle: 'timed',
  holdSeconds: 6,
  positions: 4,
  reps: 3,
  weight: 12,
  tiltStart: 5,
  tiltEnd: 33,
  romStart: 0,
  romMax: 45
};

function normalizeTeamAssessment(raw) {
  const assessment = {...TEAM_ASSESSMENT_DEFAULTS, ...raw};
  if (!sessionModeKeys('assessment').includes(assessment.activeMode)) assessment.activeMode = TEAM_ASSESSMENT_DEFAULTS.activeMode;
  assessment.holdStyle = assessment.activeMode === 'strength' && assessment.holdStyle === 'endurance' ? 'endurance' : 'timed';
  if (assessment.activeMode === 'strength' && assessment.holdStyle !== 'endurance') {
    const seconds = Number(assessment.holdSeconds);
    assessment.holdSeconds = Number.isFinite(seconds) ? Math.min(15, Math.max(2, Math.round(seconds))) : TEAM_ASSESSMENT_DEFAULTS.holdSeconds;
  } else delete assessment.holdSeconds;
  assessment.positions = assessment.positions === 8 ? 8 : 4;
  assessment.reps = [1, 2, 3, 4, 5].includes(assessment.reps) ? assessment.reps : 3;
  assessment.weight = Math.min(50, Math.max(1, Number(assessment.weight) || TEAM_ASSESSMENT_DEFAULTS.weight));
  assessment.tiltStart = Math.min(SETUP_MAX_TILT, Math.max(0, Number(assessment.tiltStart) ?? TEAM_ASSESSMENT_DEFAULTS.tiltStart));
  assessment.tiltEnd = Math.min(SETUP_MAX_TILT, Math.max(assessment.tiltStart + 1, Number(assessment.tiltEnd) ?? TEAM_ASSESSMENT_DEFAULTS.tiltEnd));
  assessment.romStart = Math.min(assessment.romMax - 1, Math.max(0, Number(assessment.romStart) ?? 0));
  assessment.romMax = Math.min(SETUP_MAX_TILT, Math.max(assessment.romStart + 1, Number(assessment.romMax) ?? TEAM_ASSESSMENT_DEFAULTS.romMax));
  return assessment;
}

function teamAssessmentConfig() {
  return teamSettings().assessment;
}

function teamAssessmentArcLabel(modeKey) {
  const kind = setupTiltKind(modeKey);
  return ({fixed: 'Fixed pad', travel: 'Controlled travel', return: 'Resisted return', limit: 'Range limit'})[kind] || 'Pad motion';
}

function assessmentProtocolRow(label, control, detail = '') {
  return `<div class="assessment-protocol-row">
    <div class="assessment-protocol-row__text">
      <span class="field-label">${label}</span>
      ${detail ? `<p class="muted small">${detail}</p>` : ''}
    </div>
    <div class="assessment-protocol-row__control">${control}</div>
  </div>`;
}

function assessmentDegreesInput(id, {min, max, value, ariaLabel}) {
  return `<div class="weight-input assessment-weight-input"><input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${value}" inputmode="numeric" aria-label="${ariaLabel}"><span>°</span></div>`;
}

function teamAssessmentArcFieldsMarkup(assessment) {
  const kind = setupTiltKind(assessment.activeMode);
  if (kind === 'limit') {
    return assessmentProtocolRow('Start tilt', assessmentDegreesInput('team-rom-start', {min: 0, max: assessment.romMax - 1, value: assessment.romStart, ariaLabel: 'Start tilt degrees'}), 'ROM assessments start here.')
      + assessmentProtocolRow('Max tilt', assessmentDegreesInput('team-rom-max', {min: assessment.romStart + 1, max: SETUP_MAX_TILT, value: assessment.romMax, ariaLabel: 'Max tilt degrees'}), 'Safety limit the pad never passes.');
  }
  const endRow = kind === 'fixed' ? '' : assessmentProtocolRow(kind === 'return' ? 'End tilt' : 'End travel', assessmentDegreesInput('team-tilt-end', {min: 0, max: SETUP_MAX_TILT, value: assessment.tiltEnd, ariaLabel: 'End tilt degrees'}), kind === 'return' ? 'Pad returns toward this tilt.' : 'Pad travels to this tilt each rep.');
  const startDetail = kind === 'fixed' ? 'Same tilt for every direction until session setup.' : 'Default start for each direction.';
  return assessmentProtocolRow('Start tilt', assessmentDegreesInput('team-tilt-start', {min: 0, max: SETUP_MAX_TILT, value: assessment.tiltStart, ariaLabel: 'Start tilt degrees'}), startDetail) + endRow;
}

function assessmentWorkspaceTab() {
  const ui = directoryUI().programs;
  const tab = ui.assessmentTab ?? 'protocol';
  ui.assessmentTab = tab === 'session-plan' ? 'session-plan' : 'protocol';
  return ui.assessmentTab;
}

function assessmentWorkspaceSubnav() {
  const tab = assessmentWorkspaceTab();
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Assessment views">${[['protocol', 'Protocol'], ['session-plan', 'Session plan']].map(([key, label]) => `<button type="button" data-action="assessment-tab" data-tab="${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>`;
}

function teamAssessmentProtocolMarkup() {
  const assessment = teamAssessmentConfig();
  const modeKey = assessment.activeMode;
  const mode = sessionModes[modeKey];
  const arcHint = `${teamAssessmentArcLabel(modeKey)} · ${setupModeLine[modeKey]}`;
  const unit = exportForceUnits[teamSettings().forceUnit]?.short || 'kg';
  const directions = `<div class="segmented" role="group" aria-label="Directions">${[4, 8].map(n => `<button type="button" class="${assessment.positions === n ? 'active' : ''}" data-action="team-assessment-positions" data-value="${n}" aria-pressed="${assessment.positions === n}">${n}</button>`).join('')}</div>`;
  const reps = `<select id="team-assessment-reps" aria-label="Reps per direction">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${assessment.reps === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const weight = modeKey === 'rom'
    ? `<span class="assessment-protocol-static muted">Not used for ROM</span>`
    : `<div class="weight-input assessment-weight-input"><input id="team-assessment-weight" type="number" min="1" max="50" step="0.5" value="${assessment.weight}" inputmode="decimal" aria-label="Target force"><span>${unit}</span></div>`;
  return `<div class="assessment-workspace">
    <p class="assessment-workspace-lead">Team defaults for session setup. Per-direction tilts stay on the setup screen before Begin.</p>
    <section class="assessment-protocol-panel" aria-labelledby="assessment-defaults-title">
      <h2 id="assessment-defaults-title" class="sr-only">Assessment defaults</h2>
      <p class="assessment-arc-kind"><strong>${escapeHTML(mode.name)}</strong> · ${escapeHTML(arcHint)}</p>
      ${assessmentProtocolRow('Mode', `<select id="team-assessment-mode" aria-label="Assessment mode">${sessionModeKeys('assessment').map(key => `<option value="${key}" ${key === modeKey ? 'selected' : ''}>${sessionModes[key].name}</option>`).join('')}</select>`)}
      ${modeKey === 'strength' ? assessmentProtocolRow('Hold', `<div class="hold-time-row${assessment.holdStyle === 'endurance' ? ' hold-time-row--endurance' : ''}"><select id="team-assessment-hold-style" aria-label="Timed hold or endurance"><option value="timed" ${assessment.holdStyle !== 'endurance' ? 'selected' : ''}>Timed</option><option value="endurance" ${assessment.holdStyle === 'endurance' ? 'selected' : ''}>Endurance</option></select><div class="weight-input assessment-weight-input hold-seconds-inline"${assessment.holdStyle === 'endurance' ? ' hidden' : ''}><input id="team-assessment-hold-seconds" type="number" min="2" max="15" step="1" value="${assessment.holdSeconds ?? 6}" inputmode="numeric" aria-label="Hold length in seconds"><span>s</span></div></div>`, 'Timed: enter seconds (2–15). Endurance: hold until release.') : ''}
      ${teamAssessmentArcFieldsMarkup(assessment)}
      ${assessmentProtocolRow('Directions', directions)}
      ${assessmentProtocolRow('Reps / direction', reps)}
      ${modeKey === 'rom' ? '' : assessmentProtocolRow('Target force', weight, 'Starting target when no member baseline exists.')}
    </section>
  </div>`;
}

function teamAssessmentWorkspaceMarkup() {
  const tab = assessmentWorkspaceTab();
  const body = tab === 'session-plan' ? teamFollowUpPlanFieldsMarkup() : teamAssessmentProtocolMarkup();
  return `${assessmentWorkspaceSubnav()}${body}`;
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

function teamFollowUpPlanFieldsMarkup() {
  const plan = teamSettings().sessionPlan;
  return `<div class="assessment-workspace settings-plan-fields">
      <p class="assessment-workspace-lead">Defaults for the coach step on the report after a completed assessment.</p>
      <section class="settings-block assessment-workspace-followup" aria-labelledby="follow-up-plan-title">
      <h2 id="follow-up-plan-title" class="sr-only">Session plan defaults</h2>
      <label class="field-label" for="plan-sessions">Sessions / week</label>
      <select id="plan-sessions">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${plan.sessionsPerWeek === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-weeks">Weeks</label>
      <select id="plan-weeks">${[4, 5, 6, 7, 8].map(n => `<option value="${n}" ${plan.weeks === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="field-label" for="plan-template">Load preset</label>
      <select id="plan-template">${clinicSessionTemplates().map(item => `<option value="${item.id}" ${plan.templateId === item.id ? 'selected' : ''}>${item.name} · ${item.detail}</option>`).join('')}</select>
      <p class="directory-footnote">${escapeHTML(sessionPlanLine(plan))} · presets from <strong>Sessions</strong> in this hub</p>
    </section>
  </div>`;
}

function settingsRailPane(section) {
  if (section === 'onboarding') return teamOnboardingBody();
  if (section === 'waiver') return teamWaiverBody();
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
  'save-assessment-workspace': () => {
    if (state.actor !== 'coach' || state.nav !== 'programs' || directoryUI().programs.library !== 'assessments') return;
    const team = teamSettings();
    const assessment = teamAssessmentConfig();
    const modeEl = $('#team-assessment-mode');
    if (modeEl) {
      const mode = modeEl.value;
      if (!sessionModeKeys('assessment').includes(mode)) return;
      assessment.activeMode = mode;
      if (mode === 'strength') {
        assessment.holdStyle = $('#team-assessment-hold-style')?.value === 'endurance' ? 'endurance' : 'timed';
        if (assessment.holdStyle !== 'endurance') assessment.holdSeconds = Number($('#team-assessment-hold-seconds')?.value);
      } else {
        delete assessment.holdStyle;
        delete assessment.holdSeconds;
      }
      const reps = Number($('#team-assessment-reps')?.value);
      if ([1, 2, 3, 4, 5].includes(reps)) assessment.reps = reps;
      if (mode === 'rom') {
        assessment.romStart = Number($('#team-rom-start')?.value);
        assessment.romMax = Number($('#team-rom-max')?.value);
      } else {
        assessment.tiltStart = Number($('#team-tilt-start')?.value);
        if (setupTiltKind(mode) !== 'fixed') assessment.tiltEnd = Number($('#team-tilt-end')?.value);
        const weight = Number($('#team-assessment-weight')?.value);
        if (Number.isFinite(weight)) assessment.weight = weight;
      }
      team.assessment = normalizeTeamAssessment(assessment);
    }
    const sessionsEl = $('#plan-sessions');
    if (sessionsEl) {
      const sessions = Number(sessionsEl.value);
      const weeks = Number($('#plan-weeks')?.value);
      const templateId = $('#plan-template')?.value;
      if (![1, 2, 3, 4, 5].includes(sessions) || ![4, 5, 6, 7, 8].includes(weeks) || !sessionPlanTemplate(templateId)) return;
      team.sessionPlan = {sessionsPerWeek: sessions, weeks, templateId};
    }
    render();
    toast('Assessment defaults saved.');
  }
};