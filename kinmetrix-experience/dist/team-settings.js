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
  {id: 'before-session', label: 'Required before session', description: 'Members must sign and show their signature before assessment or session.'},
  {id: 'off', label: 'Off', description: 'Do not ask for a waiver on this team.'}
];
const SETTINGS_RAIL_SECTIONS = [
  {id: 'station', label: 'Station', description: 'Team and station preferences for this clinic.'},
  {id: 'onboarding', label: 'Onboarding', description: 'Fields collected for a new person.'},
  {id: 'waiver', label: 'Waiver', description: 'Policy and on-file signatures for this team.'}
];

const WAIVER_HUB_TABS = [
  {id: 'policy', label: 'Policy'},
  {id: 'signatures', label: 'On file'}
];

function waiverHubTab() {
  const tab = state.waiverHubTab ?? 'policy';
  return WAIVER_HUB_TABS.some(item => item.id === tab) ? tab : 'policy';
}

function teamSettings() {
  const defaults = {
    name: 'Northside clinic',
    logo: 'assets/team-northside.svg',
    forceUnit: 'kg',
    onboarding: Object.fromEntries(TEAM_ONBOARDING_FIELDS.map(field => [field.id, field.on])),
    waiverPolicy: 'before-session',
    sessionPlan: {sessionsPerWeek: 2, weeks: 6, templateId: 'light'}
  };
  if (!state.team) state.team = defaults;
  const team = state.team;
  team.name ??= defaults.name;
  team.logo ??= defaults.logo;
  team.forceUnit = exportForceUnits[team.forceUnit] ? team.forceUnit : 'kg';
  team.onboarding = {...defaults.onboarding, ...team.onboarding};
  if (!TEAM_WAIVER_POLICIES.some(item => item.id === team.waiverPolicy)) team.waiverPolicy = defaults.waiverPolicy;
  team.sessionPlan = {...defaults.sessionPlan, ...team.sessionPlan};
  if (!clinicSessionTemplates().some(item => item.id === team.sessionPlan.templateId)) team.sessionPlan.templateId = 'light';
  team.assessment = normalizeTeamAssessment(team.assessment);
  team.rom = normalizeTeamRom(team.rom, team.assessment);
  return team;
}

const TEAM_ROM_DEFAULTS = {
  positions: 4,
  romStillOn: true,
  romStill: 2,
  romDropOn: true,
  romDrop: 5,
  challenge: 1
};

function normalizeTeamRom(raw, legacyAssessment) {
  const rom = {...TEAM_ROM_DEFAULTS, ...raw};
  if (legacyAssessment?.romStart != null && raw?.positions == null) {
    /* legacy protocol fields ignored for team ROM tab */
  }
  rom.positions = rom.positions === 8 ? 8 : 4;
  rom.romStill = Math.min(5, Math.max(1, Number(rom.romStill) || TEAM_ROM_DEFAULTS.romStill));
  rom.romDrop = Math.min(50, Math.max(5, Number(rom.romDrop) || TEAM_ROM_DEFAULTS.romDrop));
  rom.romStillOn = rom.romStillOn !== false;
  rom.romDropOn = rom.romDropOn !== false;
  rom.challenge = Math.min(5, Math.max(0.5, Number(rom.challenge) || TEAM_ROM_DEFAULTS.challenge));
  return rom;
}

function teamRomConfig() {
  return teamSettings().rom;
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
};

function normalizeTeamAssessment(raw) {
  const assessment = {...TEAM_ASSESSMENT_DEFAULTS, ...raw};
  if (!standardExerciseModeKeys('assessment').includes(assessment.activeMode)) assessment.activeMode = TEAM_ASSESSMENT_DEFAULTS.activeMode;
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
  delete assessment.romStart;
  delete assessment.romMax;
  if (assessment.tiltOverrides && typeof assessment.tiltOverrides === 'object') {
    assessment.tiltOverrides = Object.fromEntries(
      Object.entries(assessment.tiltOverrides).filter(([key]) => standardExerciseModeKeys('assessment').includes(key))
    );
  } else delete assessment.tiltOverrides;
  return assessment;
}

function syncTeamAssessmentEditor() {
  const ui = directoryUI().programs;
  const a = teamAssessmentConfig();
  const type = a.activeMode;
  const kind = setupTiltKind(type);
  const angles = [0, 45, 90, 135, 180, 225, 270, 315].slice(0, a.positions === 8 ? 8 : 4);
  const overrides = {};
  angles.forEach(angle => {
    const custom = a.tiltOverrides?.[type]?.[angle];
    overrides[angle] = custom ? {...custom} : kind === 'fixed' ? {start: a.tiltStart} : {start: a.tiltStart, end: a.tiltEnd};
  });
  state.stage = 'team-assessment-edit';
  state.setup = {
    purpose: 'assessment',
    type,
    holdStyle: a.holdStyle,
    holdSeconds: a.holdSeconds,
    positions: a.positions,
    reps: a.reps,
    weight: a.weight,
    angle: ui.teamAngle ?? 0,
    isokTab: ui.teamTab ?? 'session',
    tiltOverrides: {[type]: overrides},
    accepted: true,
    continuing: false,
    programLoad: null,
    forceEdited: false,
    challenge: ({strength: 1.5, isokinetic: 3, eccentric: 3})[type] ?? 1.5,
    challengeAuto: type === 'isokinetic',
    challengeHold: 1,
    eccSpeed: 'slow',
    eccCap: Math.ceil((a.weight || 12) * 1.5)
  };
  setupModeDefaults();
}

function persistTeamAssessmentFromSetup(cfg = state.setup) {
  const a = teamAssessmentConfig();
  a.activeMode = cfg.type;
  if (cfg.type === 'strength') {
    a.holdStyle = isometricHoldStyle(cfg);
    if (a.holdStyle === 'timed') a.holdSeconds = cfg.holdSeconds;
    else delete a.holdSeconds;
  } else {
    delete a.holdStyle;
    delete a.holdSeconds;
  }
  a.positions = cfg.positions;
  a.reps = cfg.reps;
  a.weight = cfg.weight;
  const overrides = cfg.tiltOverrides?.[cfg.type];
  if (overrides) {
    const first = overrides[Object.keys(overrides).map(Number).sort((x, y) => x - y)[0]];
    a.tiltStart = first?.start ?? a.tiltStart;
    if (setupTiltKind(cfg.type) !== 'fixed') a.tiltEnd = first?.end ?? a.tiltEnd;
    a.tiltOverrides = {...a.tiltOverrides, [cfg.type]: {...overrides}};
  }
  teamSettings().assessment = normalizeTeamAssessment(a);
}

function leaveTeamAssessmentEditor() {
  if (state.stage === 'team-assessment-edit') state.stage = null;
}

function syncTeamRomEditor() {
  const ui = directoryUI().programs;
  const rom = teamRomConfig();
  state.stage = 'team-assessment-edit';
  state.setup = {
    purpose: 'assessment',
    type: 'rom',
    positions: rom.positions,
    reps: 1,
    weight: 8,
    angle: ui.teamAngle ?? 0,
    isokTab: ui.teamTab ?? 'session',
    tiltOverrides: {},
    accepted: true,
    continuing: false,
    programLoad: null,
    forceEdited: false,
    challenge: rom.challenge,
    challengeFor: 'rom',
    romStillOn: rom.romStillOn,
    romStill: rom.romStill,
    romDropOn: rom.romDropOn,
    romDrop: rom.romDrop,
    romStart: 0,
    romMax: SETUP_MAX_TILT
  };
  setupModeDefaults();
}

function ensureTeamRomEditor() {
  if (state.stage === 'team-assessment-edit' && state.setup?.type === 'rom') {
    setupModeDefaults();
    return;
  }
  syncTeamRomEditor();
}

function persistTeamRomFromSetup(cfg = state.setup) {
  const rom = teamRomConfig();
  rom.positions = cfg.positions;
  rom.challenge = cfg.challenge;
  rom.romStillOn = cfg.romStillOn;
  rom.romDropOn = cfg.romDropOn;
  rom.romStill = cfg.romStill;
  rom.romDrop = cfg.romDrop;
  teamSettings().rom = normalizeTeamRom(rom);
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
  const endRow = kind === 'fixed' ? '' : assessmentProtocolRow(kind === 'return' ? 'End tilt' : 'End travel', assessmentDegreesInput('team-tilt-end', {min: 0, max: SETUP_MAX_TILT, value: assessment.tiltEnd, ariaLabel: 'End tilt degrees'}), kind === 'return' ? 'Pad returns toward this tilt.' : 'Pad travels to this tilt each rep.');
  const startDetail = kind === 'fixed' ? 'Same tilt for every direction until session setup.' : 'Default start for each direction.';
  return assessmentProtocolRow('Start tilt', assessmentDegreesInput('team-tilt-start', {min: 0, max: SETUP_MAX_TILT, value: assessment.tiltStart, ariaLabel: 'Start tilt degrees'}), startDetail) + endRow;
}

function assessmentWorkspaceTab() {
  const ui = directoryUI().programs;
  let tab = ui.assessmentTab ?? 'protocol';
  if (tab === 'session-plan') {
    ui.sessionTab = 'session-plan';
    tab = 'protocol';
  }
  const allowed = ['protocol', 'rom'];
  ui.assessmentTab = allowed.includes(tab) ? tab : 'protocol';
  return ui.assessmentTab;
}

function assessmentWorkspaceSubnav() {
  const tab = assessmentWorkspaceTab();
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Assessment views">${[['protocol', 'Protocol'], ['rom', 'ROM']].map(([key, label]) => `<button type="button" data-action="assessment-tab" data-tab="${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>`;
}

function sessionWorkspaceTab() {
  const ui = directoryUI().programs;
  const tab = ui.sessionTab ?? 'templates';
  const allowed = ['templates', 'session-plan'];
  ui.sessionTab = allowed.includes(tab) ? tab : 'templates';
  return ui.sessionTab;
}

function sessionWorkspaceSubnav() {
  const tab = sessionWorkspaceTab();
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Session views">${[['templates', 'Templates'], ['session-plan', 'Session plan']].map(([key, label]) => `<button type="button" data-action="session-tab" data-tab="${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav>`;
}

function ensureTeamAssessmentEditor() {
  if (state.stage === 'team-assessment-edit' && state.setup?.purpose === 'assessment') {
    setupModeDefaults();
    return;
  }
  syncTeamAssessmentEditor();
}

function teamAssessmentProtocolMarkup() {
  ensureTeamAssessmentEditor();
  return `<div class="assessment-workspace assessment-workspace--split">${isokineticSetupView()}</div>`;
}

function teamRomRuleRow(key, on, label, control) {
  return `<div class="assessment-protocol-row assessment-rom-rule"><div class="assessment-protocol-row__text"><label class="check-label"><input type="checkbox" id="team-rom-${key}-on" data-team-rom-toggle="${key}" ${on ? 'checked' : ''}>${label}</label></div><div class="assessment-protocol-row__control">${control}</div></div>`;
}

function teamRomWorkspaceMarkup() {
  ensureTeamRomEditor();
  return `<div class="assessment-workspace assessment-workspace--split">${isokineticSetupView()}</div>`;
}

function teamAssessmentWorkspaceMarkup() {
  const tab = assessmentWorkspaceTab();
  const body = tab === 'rom' ? teamRomWorkspaceMarkup() : teamAssessmentProtocolMarkup();
  return `${assessmentWorkspaceSubnav()}${body}`;
}

function teamSessionWorkspaceMarkup() {
  const tab = sessionWorkspaceTab();
  const body = tab === 'session-plan' ? teamFollowUpPlanFieldsMarkup() : sessionTemplatesWorkspaceBody();
  return `${sessionWorkspaceSubnav()}${body}`;
}

function sessionPlanTemplate(id) {
  return clinicSessionTemplates().find(item => item.id === id) || clinicSessionTemplates()[0];
}

function sessionPlanLine(plan) {
  const template = sessionPlanTemplate(plan.templateId);
  return `${plan.sessionsPerWeek}× weekly · ${plan.weeks} weeks · ${template.name}`;
}

function settingsActiveSection() {
  let active = state.settingsHubSection ?? 'station';
  if (active === 'waiver-signatures') {
    active = 'waiver';
    state.settingsHubSection = 'waiver';
    state.waiverHubTab = 'signatures';
  }
  return SETTINGS_RAIL_SECTIONS.some(item => item.id === active) ? active : 'station';
}

const TEAM_HUB_POLICY_IDS = new Set(SETTINGS_RAIL_SECTIONS.map(item => item.id));

function isTeamHubLibraryId(id) {
  return typeof TEMPLATE_LIBRARIES !== 'undefined' && TEMPLATE_LIBRARIES.some(item => item.id === id);
}

function isTeamHubCardId(id) {
  return TEAM_HUB_POLICY_IDS.has(id) || isTeamHubLibraryId(id);
}

function isTeamHubNav() {
  return state.actor === 'coach' && (state.nav === 'team' || state.nav === 'settings' || state.nav === 'programs');
}

function teamHubShowsGrid() {
  return state.nav === 'team' && !teamHubResolveCard();
}

function teamHubResolveCard() {
  if (state.nav === 'settings') return settingsActiveSection();
  if (state.nav === 'programs') {
    const library = directoryUI().programs.library || 'assessments';
    return isTeamHubLibraryId(library) ? library : 'assessments';
  }
  if (state.teamHubCard && isTeamHubCardId(state.teamHubCard)) return state.teamHubCard;
  return null;
}

function teamHubCardMeta(cardId) {
  const policy = SETTINGS_RAIL_SECTIONS.find(item => item.id === cardId);
  if (policy) return policy;
  return TEMPLATE_LIBRARIES.find(item => item.id === cardId) || null;
}

function teamHubCardHint(cardId) {
  const team = teamSettings();
  if (cardId === 'station') return `${exportForceUnits[team.forceUnit]?.short || 'kg'} · ${theme === 'dark' ? 'Dark' : 'Light'} theme`;
  if (cardId === 'onboarding') {
    const count = TEAM_ONBOARDING_FIELDS.filter(field => team.onboarding[field.id]).length;
    return `${count} fields on for new members`;
  }
  if (cardId === 'waiver') {
    const policy = TEAM_WAIVER_POLICIES.find(item => item.id === team.waiverPolicy);
    return policy?.label || 'Waiver policy';
  }
  if (cardId === 'assessments') return 'Protocol, ROM, and session plan defaults';
  if (cardId === 'sessions') return `${clinicSessionTemplates().length} templates`;
  if (cardId === 'programs') return `${clinicProgramTemplates().length} templates · ${assignedPrograms().length} assigned`;
  return '';
}

function visitTeamHub(card = null) {
  if (state.actor !== 'coach') return;
  if (card !== 'assessments') leaveTeamAssessmentEditor();
  state.nav = 'team';
  state.settingsSection = null;
  state.personId = null;
  state.pendingSetup = null;
  state.memberOrigin = 'team';
  if (card === 'waiver-signatures') {
    state.teamHubCard = 'waiver';
    state.settingsHubSection = 'waiver';
    state.waiverHubTab = 'signatures';
  } else if (card && isTeamHubCardId(card)) {
    if (card !== 'sessions') state.sessionTemplateFocusId = null;
    state.teamHubCard = card;
    if (TEAM_HUB_POLICY_IDS.has(card)) {
      state.settingsHubSection = card;
      if (card === 'waiver' && !state.waiverHubTab) state.waiverHubTab = 'policy';
    }
    if (isTeamHubLibraryId(card)) {
      if (card !== 'sessions') directoryUI().programs.query = '';
      if (card === 'programs') Object.assign(directoryUI().programs, {tab: directoryUI().programs.tab || 'templates', library: 'programs'});
      else Object.assign(directoryUI().programs, {library: card});
    }
  } else {
    state.teamHubCard = null;
    state.sessionTemplateFocusId = null;
    directoryUI().programs.library = null;
  }
  rosterUI().filterOpen = false;
  render();
  window.scrollTo(0, 0);
}

function visitSettings(section = null) {
  if (state.actor !== 'coach') return;
  if (section === 'waiver-signatures') {
    visitTeamHub('waiver-signatures');
    return;
  }
  if (section) visitTeamHub(section);
  else visitTeamHub(null);
}

function teamHubPolicyChip(item) {
  const hint = teamHubCardHint(item.id) || item.description;
  return `<button type="button" class="team-hub-policy-chip" data-action="team-hub-card" data-card="${item.id}">
    <span class="team-hub-policy-chip-body">
      <span class="team-hub-policy-chip-label">${escapeHTML(item.label)}</span>
      <strong>${escapeHTML(hint)}</strong>
    </span>
    ${icon('chevron', 'icon-sm')}
  </button>`;
}

function teamHubLibraryTile(item) {
  const hint = teamHubCardHint(item.id) || item.description;
  return `<button type="button" class="team-hub-library-tile team-hub-library-tile--${item.id}" data-action="team-hub-card" data-card="${item.id}">
    <span class="team-hub-library-tile-main">
      <strong>${escapeHTML(item.label)}</strong>
      <small>${escapeHTML(item.description)}</small>
    </span>
    <span class="team-hub-library-tile-meta">${escapeHTML(hint)}</span>
  </button>`;
}

function teamHubCardsMarkup() {
  const team = teamSettings();
  return `<header class="settings-pane-head team-hub-head">
    <div class="settings-pane-head-row">
      <div class="settings-pane-head-text">
        <h1>Team</h1>
        <p class="settings-pane-desc">${escapeHTML(team.name)}. Policy and reusable libraries for this clinic.</p>
      </div>
    </div>
  </header>
  <div class="team-hub-sections team-hub-sections--deck">
    <div class="team-hub-policy-ribbon" aria-label="Team policy">${SETTINGS_RAIL_SECTIONS.map(teamHubPolicyChip).join('')}</div>
    <section class="team-hub-section" aria-labelledby="team-hub-libraries-title">
      <h2 id="team-hub-libraries-title" class="team-hub-section-title">Libraries</h2>
      <div class="team-hub-library-deck">${TEMPLATE_LIBRARIES.map(teamHubLibraryTile).join('')}</div>
    </section>
  </div>`;
}

function teamHubDetailHead(activeItem, cardId) {
  const library = isTeamHubLibraryId(cardId) ? cardId : null;
  const saveAssessment = library === 'assessments' ? button('Save', 'save-assessment-workspace', 'primary') : '';
  const saveSessionPlan = library === 'sessions' && sessionWorkspaceTab() === 'session-plan' ? button('Save', 'save-session-workspace', 'primary') : '';
  const createByLibrary = {
    sessions: {action: 'new-session-template', ariaLabel: 'New session template'},
    programs: {action: 'new-template', ariaLabel: 'New program template'}
  };
  const create = createByLibrary[library];
  const showCreate = create && !(library === 'sessions' && (sessionWorkspaceTab() === 'session-plan' || state.sessionTemplateFocusId));
  const action = cardId === 'station'
    ? button('Save settings', 'save-settings', 'primary')
    : saveAssessment || saveSessionPlan || (showCreate ? button(icon('plus', 'icon-sm') + ' New template', create.action, 'primary', `aria-label="${create.ariaLabel}"`) : '');
  const desc = activeItem.description ? `<p class="settings-pane-desc">${escapeHTML(activeItem.description)}</p>` : '';
  return `<header class="settings-pane-head team-hub-detail-head">
    ${button(icon('back', 'icon-sm') + ' Team', 'team-hub-back', 'small-button text-button team-hub-back', 'aria-label="Back to team hub"')}
    <div class="settings-pane-head-row">
      <div class="settings-pane-head-text">
        <h1>${escapeHTML(activeItem.label)}</h1>
        ${desc}
      </div>
      ${action ? `<div class="settings-pane-head-actions">${action}</div>` : ''}
    </div>
  </header>`;
}

function teamHubDetailBody(cardId) {
  if (TEAM_HUB_POLICY_IDS.has(cardId)) return settingsRailPane(cardId);
  if (cardId === 'assessments') return assessmentWorkspaceBody();
  if (cardId === 'sessions') return teamSessionWorkspaceMarkup();
  if (cardId === 'programs') {
    Object.assign(directoryUI().programs, {library: 'programs', tab: directoryUI().programs.tab || 'templates'});
    return programLibraryBody();
  }
  return '';
}

function teamHubPage() {
  if (state.actor !== 'coach') return peopleView();
  const card = teamHubResolveCard();
  if (!card) {
    return `<main class="directory-page settings-page settings-hub templates-hub team-hub-layout staff-single-pane" aria-label="Team">
      <div class="settings-hub-pane team-hub-pane" aria-label="Team policy and libraries">
        ${teamHubCardsMarkup()}
      </div>
    </main>`;
  }
  const activeItem = teamHubCardMeta(card) || SETTINGS_RAIL_SECTIONS[0];
  return `<main class="directory-page settings-page settings-hub templates-hub team-hub-layout staff-single-pane" aria-label="${escapeHTML(activeItem.label)}">
    <div class="settings-hub-pane team-hub-pane" aria-label="${escapeHTML(activeItem.label)}">
      ${teamHubDetailHead(activeItem, card)}
      ${teamHubDetailBody(card)}
    </div>
  </main>`;
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

function waiverPaneSubnav(activeTab) {
  return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Waiver views">${WAIVER_HUB_TABS.map(item => `<button type="button" data-action="waiver-hub-tab" data-tab="${item.id}" ${item.id === activeTab ? 'aria-current="page"' : ''}>${item.label}</button>`).join('')}</nav>`;
}

function teamWaiverPolicyBody() {
  const team = teamSettings();
  return `<section class="settings-block settings-block--waiver" aria-label="Waiver policy">
      <p class="muted small waiver-policy-lead">Required waivers block new sessions until the member signs. Policy applies as soon as you select an option.</p>
      <div class="waiver-policy-options">
      ${TEAM_WAIVER_POLICIES.map(item =>
        `<label class="radio-row"><input type="radio" name="waiver-policy" value="${item.id}" ${team.waiverPolicy === item.id ? 'checked' : ''}><span><strong>${item.label}</strong><small>${item.description}</small></span></label>`
      ).join('')}
      </div>
    </section>`;
}

function teamWaiverBody() {
  const tab = waiverHubTab();
  return `${waiverPaneSubnav(tab)}${tab === 'signatures' ? teamWaiverSignaturesBody() : teamWaiverPolicyBody()}`;
}

function teamWaiverSignaturesBody() {
  return `<section class="settings-block settings-block--waiver-signatures" aria-label="On-file signatures">
      <p class="muted small">Members sign when starting a session. Signatures stay in this demo until you reset the station.</p>
      ${waiverSignaturesRosterMarkup()}
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
      <p class="directory-footnote">${escapeHTML(sessionPlanLine(plan))} · presets from <strong>Sessions</strong> in Team</p>
    </section>
  </div>`;
}

function settingsRailPane(section) {
  if (section === 'onboarding') return teamOnboardingBody();
  if (section === 'waiver') return teamWaiverBody();
  return teamStationBlocks();
}

function settingsPage() {
  return teamHubPage();
}

function saveTeamSettingsHome() {
  if (state.actor !== 'coach' || !isTeamHubNav() || teamHubResolveCard() !== 'station') return;
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
  'nav-team': () => visitTeamHub(null),
  'team-hub-card': el => {
    if (!isTeamHubCardId(el.dataset.card)) return;
    visitTeamHub(el.dataset.card);
    $(`[data-action="team-hub-card"][data-card="${el.dataset.card}"]`)?.focus();
  },
  'team-hub-back': () => visitTeamHub(null),
  'settings-hub-section': el => {
    if (!SETTINGS_RAIL_SECTIONS.some(item => item.id === el.dataset.section)) return;
    visitTeamHub(el.dataset.section);
    $(`[data-action="settings-hub-section"][data-section="${el.dataset.section}"]`)?.focus();
  },
  'waiver-hub-tab': el => {
    if (state.actor !== 'coach' || !isTeamHubNav() || teamHubResolveCard() !== 'waiver') return;
    if (!WAIVER_HUB_TABS.some(item => item.id === el.dataset.tab)) return;
    state.waiverHubTab = el.dataset.tab;
    render();
    $(`[data-action="waiver-hub-tab"][data-tab="${el.dataset.tab}"]`)?.focus();
  },
  'settings-unit': el => {
    if (!exportForceUnits[el.dataset.unit] || !isTeamHubNav() || teamHubResolveCard() !== 'station') return;
    const typed = ($('#team-name')?.value || '').trim().replace(/\s+/g, ' ');
    if (typed) teamSettings().name = typed;
    teamSettings().forceUnit = el.dataset.unit;
    render();
  },
  'save-onboarding': () => {
    if (state.actor !== 'coach' || !isTeamHubNav() || teamHubResolveCard() !== 'onboarding') return;
    const selected = new Set($$('input[name="onboarding-field"]:checked').map(input => input.value));
    const team = teamSettings();
    TEAM_ONBOARDING_FIELDS.forEach(field => { team.onboarding[field.id] = selected.has(field.id); });
    toast('Onboarding preferences saved.');
  },
  'save-assessment-workspace': () => {
    if (state.actor !== 'coach' || !isTeamHubNav() || teamHubResolveCard() !== 'assessments') return;
    const team = teamSettings();
    const tab = assessmentWorkspaceTab();
    if (tab === 'protocol') {
      if (state.stage === 'team-assessment-edit' && !setupIsValid()) {
        toast('Check tilt settings before saving.');
        return;
      }
      persistTeamAssessmentFromSetup();
    } else if (tab === 'rom') {
      if (state.stage === 'team-assessment-edit' && state.setup?.type === 'rom' && !setupIsValid()) {
        toast('Check limit settings before saving.');
        return;
      }
      persistTeamRomFromSetup();
    }
    render();
    toast('Assessment defaults saved.');
  },
  'save-session-workspace': () => {
    if (state.actor !== 'coach' || !isTeamHubNav() || teamHubResolveCard() !== 'sessions') return;
    const sessions = Number($('#plan-sessions')?.value);
    const weeks = Number($('#plan-weeks')?.value);
    const templateId = $('#plan-template')?.value;
    if (![1, 2, 3, 4, 5].includes(sessions) || ![4, 5, 6, 7, 8].includes(weeks) || !sessionPlanTemplate(templateId)) return;
    teamSettings().sessionPlan = {sessionsPerWeek: sessions, weeks, templateId};
    render();
    toast('Session plan defaults saved.');
  }
};