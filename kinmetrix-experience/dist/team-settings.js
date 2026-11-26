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
    assessment.holdSeconds = Number.isFinite(seconds) ? clampHoldSeconds(seconds) : TEAM_ASSESSMENT_DEFAULTS.holdSeconds;
  } else delete assessment.holdSeconds;
  assessment.positions = assessment.positions === 8 ? 8 : 4;
  assessment.reps = clampSetupReps(assessment.reps);
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
    tiltOverrides: a.tiltOverrides ? structuredClone(a.tiltOverrides) : {},
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

function teamAssessmentFromSetup(cfg) {
  const a = normalizeTeamAssessment({...teamAssessmentConfig()});
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
  if (overrides && Object.keys(overrides).length) {
    const first = overrides[Object.keys(overrides).map(Number).sort((x, y) => x - y)[0]];
    a.tiltStart = first?.start ?? a.tiltStart;
    if (setupTiltKind(cfg.type) !== 'fixed') a.tiltEnd = first?.end ?? a.tiltEnd;
    a.tiltOverrides = {...a.tiltOverrides, [cfg.type]: {...overrides}};
  }
  return a;
}

function teamAssessmentProtocolDirty() {
  if (assessmentWorkspaceView() !== 'editor' || assessmentWorkspaceTab() === 'rom') return false;
  const cfg = state.setup;
  if (!cfg || cfg.type === 'rom' || state.stage !== 'team-assessment-edit') return false;
  return JSON.stringify(teamAssessmentFromSetup(cfg)) !== JSON.stringify(normalizeTeamAssessment({...teamAssessmentConfig()}));
}

function persistTeamAssessmentFromSetup(cfg = state.setup) {
  teamSettings().assessment = teamAssessmentFromSetup(cfg);
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

function assessmentWorkspaceView() {
  const ui = directoryUI().programs;
  ui.assessmentView = ui.assessmentView === 'editor' ? 'editor' : 'chooser';
  return ui.assessmentView;
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
  if (state.stage === 'team-assessment-edit' && state.setup?.purpose === 'assessment' && state.setup?.type !== 'rom') {
    setupModeDefaults();
    return;
  }
  syncTeamAssessmentEditor();
}

function assessmentChooserMiniRadial(positions) {
  const count = positions === 8 ? 8 : 4;
  const angles = Array.from({length: count}, (_, i) => i * 360 / count);
  const xy = a => [59 + Math.sin(a * Math.PI / 180) * 38, 59 - Math.cos(a * Math.PI / 180) * 38];
  const spokes = angles.map(a => {
    const p = xy(a);
    return `<line x1="59" y1="59" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}"/>`;
  }).join('');
  const nodes = angles.map(a => {
    const p = xy(a);
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5"/>`;
  }).join('');
  return `<svg viewBox="0 0 118 118" aria-hidden="true"><circle class="assessment-chooser-orbit" cx="59" cy="59" r="38"/>${spokes}${nodes}</svg>`;
}

function teamAssessmentProtocolSaveAction() {
  const dirty = teamAssessmentProtocolDirty();
  const status = dirty
    ? `<span class="save-status is-dirty" id="save-status" role="status" aria-live="polite">Unsaved changes</span>`
    : '';
  const saveAttrs = !dirty || !setupIsValid() ? 'disabled aria-disabled="true"' : '';
  const save = button('Save', 'save-assessment-workspace', 'primary assessment-toolbar-save', saveAttrs);
  return `<div class="save-area">${status}${save}</div>`;
}

function teamAssessmentUsesProtocolForm() {
  return assessmentWorkspaceView() === 'editor' && assessmentWorkspaceTab() !== 'rom';
}

function protocolSegThumb() {
  return '<span class="seg-thumb" aria-hidden="true"></span>';
}

function assessmentProtocolModeKey(type = state.setup?.type) {
  return standardExerciseModeKeys('assessment').includes(type) ? type : 'strength';
}

function assessmentModePickerDialog(o) {
  const modeKey = assessmentProtocolModeKey(o.mode);
  const mode = sessionModes[modeKey];
  const paused = !!o.paused;
  const choices = `<div class="mode-choices" role="group" aria-label="Exercise mode">${standardExerciseModeKeys('assessment').map(key => {
    const m = sessionModes[key];
    const sel = key === modeKey;
    return `<button type="button" class="mode-choice ${sel ? 'selected' : ''}" data-action="preview-assessment-mode" data-mode="${key}" aria-pressed="${sel}" aria-controls="assessment-mode-detail">${modeThumbnail(key)}<span><strong>${m.name}</strong><small>${m.short}</small></span><span class="mode-choice-indicator" aria-hidden="true">${sel ? icon('check', 'icon-sm') : icon('chevron', 'icon-sm')}</span></button>`;
  }).join('')}</div>`;
  const detail = `<section class="mode-detail" id="assessment-mode-detail" aria-labelledby="assessment-mode-detail-title"><div class="mode-detail-heading"><h3 id="assessment-mode-detail-title">${mode.name}</h3></div><p class="mode-description">${modePurposeCopy.assessment[modeKey]}</p><div class="mode-animation ${paused ? 'is-paused' : ''}">${movementPreview(modeKey)}<div class="mode-render-controls"><button type="button" data-action="toggle-mode-preview" aria-label="${paused ? 'Play' : 'Pause'} animation" title="${paused ? 'Play' : 'Pause'} animation">${icon(paused ? 'play' : 'pause', 'icon-sm')}</button></div></div></section>`;
  return `<div class="modal-backdrop"><section class="dialog directory-dialog program-editor-dialog program-editor-wizard program-editor-wizard--mode assessment-mode-picker" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="assessment-mode-intro"><header class="dialog-header"><h2 id="dialog-title">Exercise mode</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><p id="assessment-mode-intro" class="directory-dialog-intro">Watch how the pad moves, then use that mode for new team assessments.</p><div class="program-form program-wizard-form"><div class="program-wizard-step program-wizard-step--mode session-picker-body">${choices}${detail}</div></div><footer class="directory-dialog-footer program-wizard-footer"><div class="program-wizard-actions">${button('Cancel', 'close-modal')}${button('Use this mode', 'confirm-assessment-mode', 'primary')}</div></footer></section></div>`;
}

function teamAssessmentProtocolCoreRows() {
  const c = state.setup;
  const modeKey = assessmentProtocolModeKey(c.type);
  const modeName = sessionModes[modeKey].name;
  const modeRow = `<div class="row"><span class="row-label" id="protocol-mode-label">Exercise</span><button type="button" id="assessment-mode-button" class="protocol-mode-button" data-action="open-assessment-mode-picker" aria-haspopup="dialog" aria-label="Change exercise mode, currently ${modeName}"><span class="protocol-mode-button-value">${modeName}</span>${icon('down', 'icon-sm')}</button></div>`;
  const dirRow = `<div class="row"><span class="row-label" id="protocol-dir-label">Directions</span><div class="seg seg-row seg-2 segmented" role="group" aria-labelledby="protocol-dir-label">${protocolSegThumb()}${[4, 8].map(n => `<button type="button" id="setup-count-${n}" class="${c.positions === n ? 'active' : ''}" data-action="setup-positions" data-value="${n}" aria-pressed="${c.positions === n}">${n}</button>`).join('')}</div></div>`;
  const repsTotal = c.positions * c.reps;
  const repsRow = `<div class="row protocol-reps-row"><div class="protocol-reps-label-wrap"><span class="row-label" id="protocol-reps-label">Reps per direction</span><span class="protocol-reps-total tabular" id="protocol-reps-total">${repsTotal} total across ${c.positions} directions</span></div>${setupRepsControl()}</div>`;
  return `${modeRow}${dirRow}${repsRow}`;
}

function teamAssessmentProtocolHoldBlock() {
  const c = state.setup;
  if (c.type !== 'strength') return '';
  const style = isometricHoldStyle(c);
  const holdStyleRow = `<div class="row"><span class="row-label" id="hold-label">Hold style</span><div class="seg seg-row seg-2w segmented" role="group" aria-labelledby="hold-label">${protocolSegThumb()}${[['timed', 'Timed'], ['endurance', 'Endurance']].map(([key, label]) => `<button type="button" id="setup-hold-${key}" class="${style === key ? 'active' : ''}" data-action="setup-hold-style" data-value="${key}" aria-pressed="${style === key}">${label}</button>`).join('')}</div></div>`;
  const holdTimeRow = style === 'timed'
    ? `<div class="row" id="hold-row"><span class="row-label" id="hold-time-label">Hold time</span>${setupIsometricHoldSecondsControl()}</div>`
    : '';
  const note = style === 'timed'
    ? `2–${SETUP_HOLD_SECONDS_MAX} s. Timer ends the rep.`
    : 'No timer; release rules end the rep.';
  return `<h2 class="group-title protocol-group-heading">Hold</h2><div class="protocol-group">${holdStyleRow}${holdTimeRow}</div><p class="protocol-note" id="hold-note">${note}</p>`;
}

function teamAssessmentProtocolForceBlock() {
  const fields = setupNumberField('weight', 'Target force', 'kg', 1, 50, 0.5);
  return `<h2 class="group-title protocol-group-heading">Force</h2><div class="protocol-group protocol-force-group">${fields}</div><p class="protocol-note" id="force-note">Team starting target. Assessed members use their own.</p>`;
}

function teamAssessmentProtocolSessionPage() {
  return `<div class="protocol-session-stack"><h2 class="sr-only" id="protocol-session-label">Session</h2><div class="protocol-group">${teamAssessmentProtocolCoreRows()}</div>${teamAssessmentProtocolHoldBlock()}${teamAssessmentProtocolForceBlock()}</div>`;
}

function protocolPositionsSheet() {
  const kind = setupTiltKind();
  const title = kind === 'fixed' ? 'Pad positions' : kind === 'limit' ? 'Range limits' : 'Tilt range';
  const directions = currentAngles().map(a => {
    const selected = a === state.setup.angle;
    const bad = !validTilt(setupTilt(a));
    return `<button type="button" class="protocol-positions-dir${selected ? ' is-selected' : ''}${bad ? ' is-bad' : ''}" data-action="isok-direction" data-angle="${a}" aria-pressed="${selected}" aria-label="${setupDirectionNames[a]}, ${a} degrees, ${setupTiltText(a)}${bad ? '. Check this direction.' : ''}"><strong>${a}°</strong><span>${setupTiltText(a)}</span></button>`;
  }).join('');
  return `<div class="modal-backdrop protocol-positions-backdrop"><section class="dialog protocol-positions-sheet" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <header class="protocol-positions-toolbar">
      <button type="button" class="protocol-positions-action" data-action="close-modal">Cancel</button>
      <h2 id="dialog-title">${title}</h2>
      <button type="button" class="protocol-positions-action protocol-positions-action--done" data-action="done-protocol-positions"${currentAngles().every(a => validTilt(setupTilt(a))) ? '' : ' disabled'}>Done</button>
    </header>
    <div class="protocol-positions-body">
      <div class="protocol-positions-dirs" role="group" aria-label="Directions">${directions}</div>
      ${isokTiltPanel({compact: true})}
    </div>
  </section></div>`;
}

function openProtocolPositions(angle) {
  if (currentAngles().includes(angle)) state.setup.angle = angle;
  state.setup.valuePicker = null;
  openModal('protocol-positions', {tiltOverrides: structuredClone(state.setup.tiltOverrides ?? {}), angle: state.setup.angle});
  $(`.protocol-positions-dir[data-angle="${state.setup.angle}"]`)?.focus();
}

function teamAssessmentProtocolFormMarkup() {
  ensureTeamAssessmentEditor();
  setupModeDefaults();
  return `<section class="assessment-workspace assessment-workspace--protocol pager-page view-protocol assessment-protocol-form" aria-label="Protocol">
    <div class="settings">${teamAssessmentProtocolSessionPage()}</div>
    <section class="preview protocol-preview" id="team-assessment-preview" aria-labelledby="team-assessment-preview-title">${isokineticPreview({title: 'Your session', headingId: 'team-assessment-preview-title', showRangeSummary: false, card: true})}</section>
  </section>`;
}

function teamAssessmentChooserMarkup() {
  const a = teamAssessmentConfig();
  const rom = teamRomConfig();
  const mode = sessionModes[a.activeMode] || sessionModes.strength;
  const hold = a.activeMode === 'strength'
    ? (a.holdStyle === 'endurance' ? 'Endurance' : `${a.holdSeconds}s timed`)
    : mode.name;
  const romStops = [rom.romStillOn ? `Still ${rom.romStill}s` : '', rom.romDropOn ? `${rom.romDrop}% drop` : ''].filter(Boolean).join(' · ') || 'Manual stop';
  return `<div class="assessment-workspace assessment-workspace--chooser">
    <div class="assessment-chooser-cards">
      <button type="button" class="assessment-chooser-card assessment-chooser-card--protocol" data-action="assessment-open" data-tab="protocol">
        <div class="assessment-chooser-card-top">
          <div class="assessment-chooser-card-title">
            <span class="assessment-chooser-kicker">Strength test</span>
            <h2>Protocol</h2>
            <p>Isometric, isokinetic, and eccentric defaults for team visits.</p>
          </div>
          <span class="assessment-chooser-icon" aria-hidden="true">${icon('isometric')}</span>
        </div>
        <div class="assessment-chooser-body">
          <div class="assessment-chooser-pills">
            <span class="assessment-pill">${escapeHTML(hold)}</span>
            <span class="assessment-pill assessment-pill--muted tabular">${a.positions} dir × ${a.reps} reps</span>
            <span class="assessment-pill assessment-pill--muted tabular">${a.weight} kg target</span>
          </div>
          <div class="assessment-chooser-radial">${assessmentChooserMiniRadial(a.positions)}</div>
        </div>
        <div class="assessment-chooser-foot"><span>Open protocol</span>${icon('chevron', 'icon-sm')}</div>
      </button>
      <button type="button" class="assessment-chooser-card assessment-chooser-card--rom" data-action="assessment-open" data-tab="rom">
        <div class="assessment-chooser-card-top">
          <div class="assessment-chooser-card-title">
            <span class="assessment-chooser-kicker">Limit discovery</span>
            <h2>Range of motion</h2>
            <p>Comfortable start and max limits in each direction.</p>
          </div>
          <span class="assessment-chooser-icon" aria-hidden="true">${icon('rom')}</span>
        </div>
        <div class="assessment-chooser-body">
          <div class="assessment-chooser-pills">
            <span class="assessment-pill">${rom.positions} directions</span>
            <span class="assessment-pill assessment-pill--muted tabular">${rom.challenge} kg trigger</span>
            <span class="assessment-pill assessment-pill--muted">${escapeHTML(romStops)}</span>
          </div>
          <div class="assessment-chooser-radial">${assessmentChooserMiniRadial(rom.positions)}</div>
        </div>
        <div class="assessment-chooser-foot"><span>Open range of motion</span>${icon('chevron', 'icon-sm')}</div>
      </button>
    </div>
  </div>`;
}

function teamAssessmentModeTiles() {
  const c = state.setup;
  return `<div class="assessment-mode-grid" role="group" aria-label="Assessment mode">${standardExerciseModeKeys('assessment').map(key => {
    const mode = sessionModes[key];
    const glyph = key === 'strength' ? 'isometric' : key;
    return `<button type="button" id="assessment-mode-${key}" class="assessment-mode-tile${c.type === key ? ' is-active' : ''}" data-action="assessment-mode" data-value="${key}" aria-pressed="${c.type === key}">${icon(glyph, 'icon-sm')}<strong>${mode.name}</strong><span>${escapeHTML(mode.short)}</span></button>`;
  }).join('')}</div>`;
}

function teamAssessmentRomRulesMarkup() {
  const c = state.setup;
  const still = c.romStillOn
    ? setupNumericControl({id: 'setup-romStill', key: 'romStill', label: 'no movement seconds', current: c.romStill, unit: 's', min: 1, max: 5, step: 1})
    : '<span class="muted small">Off</span>';
  const drop = c.romDropOn
    ? setupNumericControl({id: 'setup-romDrop', key: 'romDrop', label: 'force drop percent', current: c.romDrop, unit: '%', min: 5, max: 50, step: 5})
    : '<span class="muted small">Off</span>';
  return `<div class="assessment-rom-rules">
    <span class="assessment-radial-kicker">Finish the rep when</span>
    <div class="assessment-rom-rule">
      <label class="check-label"><input type="checkbox" id="setup-romStillOn" data-setup-toggle="romStillOn" ${c.romStillOn ? 'checked' : ''}><span><strong>No movement</strong><small>Stops after holding at limit</small></span></label>
      ${still}
    </div>
    <div class="assessment-rom-rule">
      <label class="check-label"><input type="checkbox" id="setup-romDropOn" data-setup-toggle="romDropOn" ${c.romDropOn ? 'checked' : ''}><span><strong>Force drop</strong><small>Stops when push releases</small></span></label>
      ${drop}
    </div>
  </div>`;
}

function teamAssessmentRadialStage() {
  const c = state.setup;
  const angles = currentAngles();
  const active = c.isokTab === 'tilts' ? c.angle : null;
  const kind = setupTiltKind();
  const xy = (a, r) => [220 + Math.sin(a * Math.PI / 180) * r, 212 - Math.cos(a * Math.PI / 180) * r];
  const repsCount = kind === 'limit' ? 1 : c.reps;
  const spokes = angles.map(a => {
    const p = xy(a, 140);
    const q = xy(a, 54);
    const tilt = setupTilt(a);
    const bad = !validTilt(tilt);
    const cls = bad ? 'is-bad' : a === active ? 'is-selected' : tilt.changed ? 'is-custom' : '';
    return `<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" class="assessment-radial-spoke ${cls}"/>`;
  }).join('');
  const nodes = angles.map(a => {
    const p = xy(a, 150);
    const tilt = setupTilt(a);
    const bad = !validTilt(tilt);
    const selected = a === active;
    const cls = ['assessment-radial-node', selected ? 'is-selected' : '', bad ? 'is-bad' : '', tilt.changed && !bad ? 'is-custom' : ''].filter(Boolean).join(' ');
    const marks = Array.from({length: repsCount}, () => '<i></i>').join('');
    const editWhat = setupHasFixedTilt() ? 'pad position' : kind === 'limit' ? 'start and max tilt' : 'tilt';
    return `<button type="button" class="${cls}" style="left:${p[0] / 440 * 100}%;top:${p[1] / 424 * 100}%" data-action="isok-direction" data-angle="${a}" aria-pressed="${selected}" aria-label="${setupDirectionNames[a]}, ${a} degrees, ${setupTiltText(a)}. Edit ${editWhat}."><strong>${a}°</strong><span>${setupTiltText(a)}</span><span class="assessment-radial-marks" aria-hidden="true">${marks}</span></button>`;
  }).join('');
  const settingsSelected = active === null;
  const workload = kind === 'limit' ? `${c.positions} directions · 1 movement each` : `${c.positions} dir × ${c.reps} reps`;
  return `<section class="assessment-radial-canvas" aria-label="Directional canvas">
    <div class="assessment-radial-meta">
      <span class="assessment-pill">${escapeHTML(c.type === 'rom' ? 'Range of motion' : sessionModes[c.type].name)}</span>
      <span class="assessment-pill assessment-pill--muted tabular">${escapeHTML(workload)}</span>
    </div>
    <div class="assessment-radial-stage" role="group" aria-label="${angles.length} directions. Tap a direction to edit tilt, or the center for global settings.">
      <svg viewBox="0 0 440 424" aria-hidden="true">
        <circle class="assessment-radial-orbit" cx="220" cy="212" r="140"/>
        <circle class="assessment-radial-orbit assessment-radial-orbit--inner" cx="220" cy="212" r="88"/>
        ${spokes}
        ${personOrientation(220, 212, 1.24)}
      </svg>
      <button type="button" id="assessment-radial-settings" class="assessment-radial-center${settingsSelected ? ' is-selected' : ''}" data-action="isok-tab" data-value="session" aria-pressed="${settingsSelected}" aria-label="Assessment settings"></button>
      ${nodes}
    </div>
    <p class="assessment-radial-help">${settingsSelected ? 'Tap a direction to set tilt. Center keeps global settings open.' : `${setupDirectionNames[active]} selected. Tap the center to return to settings.`}</p>
  </section>`;
}

function teamAssessmentRadialInspector() {
  const c = state.setup;
  const settings = c.isokTab !== 'tilts';
  const forceHelp = c.type === 'rom' ? 'Light push needed before movement counts.' : 'Team starting target. Assessed members use their own.';
  if (settings) {
    const head = c.type === 'rom'
      ? `<div class="assessment-radial-inspector-head"><h2>Limit discovery</h2><p class="muted small">Maps comfortable movement in each direction. One movement per direction.</p></div>`
      : `<div class="assessment-radial-inspector-head"><h2>Protocol defaults</h2><p class="muted small">Starting configuration when clinicians open a new team assessment.</p></div>`;
    return `<aside class="assessment-radial-inspector" aria-label="Assessment settings">
      ${head}
      ${c.type === 'rom' ? '' : teamAssessmentModeTiles()}
      ${isokSessionPanel(forceHelp)}
      ${c.type === 'rom' ? teamAssessmentRomRulesMarkup() : ''}
    </aside>`;
  }
  return `<aside class="assessment-radial-inspector" aria-label="Direction settings">
    <div class="assessment-radial-dir-nav">
      ${backNavButton('All settings', 'isok-tab', 'data-value="session" id="assessment-radial-settings-back" aria-label="Back to session settings"')}
    </div>
    ${isokTiltPanel()}
  </aside>`;
}

function teamAssessmentRadialMarkup() {
  if (assessmentWorkspaceTab() === 'rom') ensureTeamRomEditor();
  else ensureTeamAssessmentEditor();
  return `<div class="assessment-workspace assessment-workspace--radial">${teamAssessmentRadialStage()}${teamAssessmentRadialInspector()}</div>`;
}

function teamAssessmentWorkspaceMarkup() {
  if (assessmentWorkspaceView() !== 'editor') return teamAssessmentChooserMarkup();
  if (assessmentWorkspaceTab() === 'rom') return teamAssessmentRadialMarkup();
  return teamAssessmentProtocolFormMarkup();
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
  leaveTeamAssessmentEditor();
  directoryUI().programs.assessmentView = 'chooser';
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

function teamHubPathKicker(cardId, activeItem, assessmentEditor = false) {
  if (!cardId || !activeItem) return '';
  const dot = '<span aria-hidden="true">·</span>';
  if (isTeamHubLibraryId(cardId)) {
    if (cardId === 'assessments' && assessmentEditor) {
      return `<p class="team-hub-path">Team ${dot} Libraries ${dot} ${escapeHTML(activeItem.label)}</p>`;
    }
    return `<p class="team-hub-path">Team ${dot} Libraries</p>`;
  }
  if (TEAM_HUB_POLICY_IDS.has(cardId)) {
    return `<p class="team-hub-path">Team ${dot} ${escapeHTML(activeItem.label)}</p>`;
  }
  return '';
}

function teamHubDetailHead(activeItem, cardId) {
  const library = isTeamHubLibraryId(cardId) ? cardId : null;
  const assessmentEditor = cardId === 'assessments' && assessmentWorkspaceView() === 'editor';
  const assessmentTab = assessmentEditor ? assessmentWorkspaceTab() : null;
  const assessmentProtocolEditor = assessmentEditor && assessmentTab !== 'rom';
  if (assessmentProtocolEditor) {
    ensureTeamAssessmentEditor();
    setupModeDefaults();
  }
  const saveAssessment = library === 'assessments' && assessmentEditor
    ? (assessmentTab === 'rom' ? button('Save', 'save-assessment-workspace', 'primary') : teamAssessmentProtocolSaveAction())
    : '';
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
  const title = assessmentEditor
    ? (assessmentTab === 'rom' ? 'Range of motion' : 'Protocol')
    : activeItem.label;
  const descCopy = assessmentEditor
    ? (assessmentTab === 'rom' ? 'Comfortable start and max limits in each direction.' : 'Station defaults. Members confirm pad positions before Begin.')
    : activeItem.description;
  const desc = descCopy ? `<p class="settings-pane-desc">${escapeHTML(descCopy)}</p>` : '';
  const backAction = assessmentEditor ? 'assessment-back-chooser' : 'team-hub-back';
  const backLabel = assessmentEditor && cardId === 'assessments' ? 'Assessments' : assessmentEditor ? activeItem.label : 'Team';
  const backAria = assessmentEditor && cardId === 'assessments' ? 'Back to assessments' : assessmentEditor ? `Back to ${activeItem.label}` : 'Back to team hub';
  const pathKicker = teamHubPathKicker(cardId, activeItem, assessmentEditor);
  return `<header class="settings-pane-head team-hub-detail-head">
    <div class="team-hub-detail-head-bar">
      ${backNavButton(backLabel, backAction, `aria-label="${backAria}"`)}
      ${action ? `<div class="settings-pane-head-actions">${action}</div>` : ''}
    </div>
    <div class="settings-pane-head-text">
      ${pathKicker}
      <h1>${escapeHTML(title)}</h1>
      ${desc}
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
  'assessment-open': el => {
    if (!isTeamHubNav() || teamHubResolveCard() !== 'assessments') return;
    const tab = el.dataset.tab;
    if (!['protocol', 'rom'].includes(tab)) return;
    const ui = directoryUI().programs;
    ui.assessmentTab = tab;
    ui.assessmentView = 'editor';
    ui.teamTab = 'session';
    render();
    $('#assessment-radial-settings')?.focus();
  },
  'assessment-back-chooser': () => {
    if (!isTeamHubNav() || teamHubResolveCard() !== 'assessments') return;
    leaveTeamAssessmentEditor();
    directoryUI().programs.assessmentView = 'chooser';
    render();
    $('[data-action="assessment-open"]')?.focus();
  },
  'assessment-mode': el => {
    if (!isTeamHubNav() || teamHubResolveCard() !== 'assessments' || assessmentWorkspaceView() !== 'editor') return;
    changeSetupMode(el.dataset.value);
  },
  'open-assessment-mode-picker': () => {
    if (!isTeamHubNav() || teamHubResolveCard() !== 'assessments' || assessmentWorkspaceView() !== 'editor') return;
    if (assessmentWorkspaceTab() !== 'protocol') return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mode = assessmentProtocolModeKey(state.setup.type);
    openModal('assessment-mode-picker', {mode, paused: reduced});
    $(`[data-action="preview-assessment-mode"][data-mode="${mode}"]`)?.focus();
  },
  'preview-assessment-mode': el => {
    const o = state.overlay;
    if (o?.type !== 'assessment-mode-picker' || !standardExerciseModeKeys('assessment').includes(el.dataset.mode)) return;
    o.mode = el.dataset.mode;
    o.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderOverlay();
    $(`[data-action="preview-assessment-mode"][data-mode="${o.mode}"]`)?.focus();
  },
  'done-protocol-positions': () => {
    const o = state.overlay;
    if (o?.type !== 'protocol-positions' || !currentAngles().every(a => validTilt(setupTilt(a)))) return;
    o.tiltOverrides = null;
    closeModal();
  },
  'confirm-assessment-mode': () => {
    const o = state.overlay;
    if (o?.type !== 'assessment-mode-picker' || !standardExerciseModeKeys('assessment').includes(o.mode)) return;
    const mode = o.mode;
    closeModal();
    changeSetupMode(mode);
  },
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
    if (assessmentWorkspaceView() !== 'editor') return;
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