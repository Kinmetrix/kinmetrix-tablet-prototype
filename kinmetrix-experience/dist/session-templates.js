/* Team session templates — list, create/edit dialog, steps workspace */

const SESSION_TEMPLATE_PRESETS = [
  { id: 'light', name: 'Light', proportion: 0.5, reps: 10 },
  { id: 'strength', name: 'Strength', proportion: 0.65, reps: 8 },
  { id: 'performance', name: 'Performance', proportion: 0.75, reps: 4 },
  { id: 'return-to-play', name: 'Return to Play', proportion: 0.4, reps: 12 },
  { id: 'in-season', name: 'In-Season Maintenance', proportion: 0.55, reps: 10 },
  { id: 'off-season', name: 'Off-Season Build', proportion: 0.7, reps: 6 },
  { id: 'deload', name: 'Deload', proportion: 0.45, reps: 10 }
];

const SESSION_STEP_MODES = ['strength', 'isokinetic'];

function sessionTemplateStepId() {
  return 'step-' + (crypto.randomUUID?.() || String(Date.now() + Math.random()));
}

function makeSessionTemplateStep({ type = 'isokinetic', proportion = 0.5, reps = 10, start = 1, end = 30, duration = null, rotator = 0 } = {}) {
  const isometric = type === 'strength';
  return {
    id: sessionTemplateStepId(),
    type,
    target_weight_proportion: proportion,
    start_arc_angle: start,
    final_arc_angle: isometric ? start : end,
    repetitions: isometric ? null : reps,
    duration: isometric ? (duration ?? 6) : null,
    ordinal: 0,
    rotator_angle: rotator
  };
}

function seedSessionTemplates() {
  return SESSION_TEMPLATE_PRESETS.map((preset, ordinal) => {
    const step = makeSessionTemplateStep({ type: 'isokinetic', proportion: preset.proportion, reps: preset.reps });
    return normalizeSessionTemplate({
      id: preset.id,
      name: preset.name,
      description: '',
      is_active: true,
      ordinal,
      steps: [step]
    });
  });
}

function normalizeSessionTemplate(raw) {
  const template = { ...raw };
  template.steps = (template.steps || []).map((step, index) => ({
    id: step.id || sessionTemplateStepId(),
    type: SESSION_STEP_MODES.includes(step.type) ? step.type : 'isokinetic',
    target_weight_proportion: Math.min(1.5, Math.max(0.1, Number(step.target_weight_proportion) || 0.5)),
    start_arc_angle: Number(step.start_arc_angle) ?? 1,
    final_arc_angle: Number(step.final_arc_angle) ?? 30,
    repetitions: step.repetitions != null ? Math.max(1, Math.min(20, Number(step.repetitions))) : null,
    duration: step.duration != null ? Math.max(2, Math.min(120, Number(step.duration))) : null,
    ordinal: Number(step.ordinal) ?? index,
    rotator_angle: Number(step.rotator_angle) ?? 0
  }));
  template.is_active = template.is_active !== false;
  template.ordinal = Number(template.ordinal) || 0;
  template.description = template.description || '';
  syncSessionTemplateDerived(template);
  return template;
}

function syncSessionTemplateDerived(template) {
  const summary = sessionTemplateSummary(template);
  template.detail = summary.detail;
  template.percent = summary.percent;
}

function sessionTemplateSummary(template) {
  const steps = template.steps || [];
  const proportions = steps.map(s => s.target_weight_proportion).filter(p => p != null);
  const reps = steps.map(s => s.repetitions).filter(r => r != null);
  const percent = proportions.length ? Math.round(Math.min(...proportions) * 100) : 50;
  const parts = [];
  if (proportions.length) {
    const min = Math.min(...proportions.map(p => Math.round(p * 100)));
    const max = Math.max(...proportions.map(p => Math.round(p * 100)));
    parts.push(min === max ? `${min}%` : `${min}–${max}%`);
  }
  if (reps.length) {
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    parts.push(min === max ? (min === 1 ? '1 rep' : `${min} reps`) : `${min}–${max} reps`);
  }
  return { detail: parts.join(' · ') || '—', percent };
}

function clinicSessionTemplates() {
  if (!state.sessionTemplates) state.sessionTemplates = seedSessionTemplates();
  return state.sessionTemplates.map(normalizeSessionTemplate);
}

function clinicSessionTemplate(id) {
  return clinicSessionTemplates().find(item => item.id === id) || clinicSessionTemplates()[0];
}

function enabledSessionTemplateCount() {
  return clinicSessionTemplates().filter(t => t.is_active).length;
}

function defaultSessionTemplateEditorDraft() {
  return {
    name: '',
    description: '',
    is_active: true,
    step: {
      type: 'isokinetic',
      target_weight_proportion: 1,
      start_arc_angle: 1,
      final_arc_angle: 30,
      repetitions: 3,
      duration: 6
    }
  };
}

function captureSessionTemplateEditorDraft(prefix = 'stmpl', draft = {}) {
  const type = $('#' + prefix + '-mode')?.value;
  const isometric = type === 'strength';
  return {
    ...draft,
    name: $('#' + prefix + '-name')?.value ?? draft.name ?? '',
    description: $('#' + prefix + '-description')?.value ?? draft.description ?? '',
    is_active: $('#' + prefix + '-active')?.checked ?? draft.is_active !== false,
    step: {
      type: SESSION_STEP_MODES.includes(type) ? type : 'isokinetic',
      target_weight_proportion: Number($('#' + prefix + '-weight')?.value ?? 100) / 100,
      start_arc_angle: Number($('#' + prefix + '-tilt-start')?.value ?? 1),
      final_arc_angle: Number($('#' + prefix + '-tilt-end')?.value ?? 30),
      repetitions: isometric ? null : Number($('#' + prefix + '-reps')?.value ?? 3),
      duration: isometric ? Number($('#' + prefix + '-duration')?.value ?? 6) : null
    }
  };
}

function sessionTemplatePropertyFields(draft, prefix = 'stmpl') {
  const step = draft.step || {};
  const type = step.type || 'isokinetic';
  const isometric = type === 'strength';
  return `<fieldset class="session-template-properties">
    <label class="program-field program-field-mode">Mode
      <select id="${prefix}-mode">${SESSION_STEP_MODES.map(key => `<option value="${key}" ${type === key ? 'selected' : ''}>${sessionModes[key].name}</option>`).join('')}</select>
    </label>
    <div class="program-structure-grid">
      <label class="program-field session-template-metric">Start angle<span class="sr-only"> in degrees</span><div class="weight-input session-template-unit-input"><input id="${prefix}-tilt-start" type="number" min="0" max="120" value="${step.start_arc_angle ?? 1}" inputmode="numeric" aria-label="Start angle in degrees"><span>°</span></div></label>
      <label class="program-field session-template-metric${isometric ? ' hidden' : ''}" id="${prefix}-tilt-end-wrap">End angle<span class="sr-only"> in degrees</span><div class="weight-input session-template-unit-input"><input id="${prefix}-tilt-end" type="number" min="1" max="120" value="${step.final_arc_angle ?? 30}" inputmode="numeric" aria-label="End angle in degrees"><span>°</span></div></label>
      <label class="program-field${isometric ? ' hidden' : ''}" id="${prefix}-reps-wrap">Reps per direction<select id="${prefix}-reps" aria-label="Reps per direction">${[1, 2, 3, 4, 5, 8, 10, 12].map(n => `<option value="${n}" ${Number(step.repetitions) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="program-field session-template-metric${isometric ? '' : ' hidden'}" id="${prefix}-duration-wrap">Hold length<span class="sr-only"> in seconds</span><div class="weight-input session-template-unit-input"><input id="${prefix}-duration" type="number" min="2" max="120" value="${step.duration ?? 6}" inputmode="numeric" aria-label="Hold length in seconds"><span>s</span></div></label>
      <label class="program-field session-template-metric">Target load<span class="sr-only"> percent of assessment</span><div class="weight-input session-template-unit-input"><input id="${prefix}-weight" type="number" min="10" max="150" step="5" value="${Math.round((step.target_weight_proportion ?? 1) * 100)}" inputmode="numeric" aria-label="Target load percent"><span>%</span></div></label>
    </div>
  </fieldset>`;
}

function sessionTemplateEditorDialog(o) {
  const templates = clinicSessionTemplates();
  const existing = o.id ? templates.find(t => t.id === o.id) : null;
  const metaOnly = o.metaOnly === true;
  let draft = o.editorDraft;
  if (!draft && existing) {
    const step = existing.steps[0] || makeSessionTemplateStep();
    draft = {
      name: existing.name,
      description: existing.description || '',
      is_active: existing.is_active,
      step: {
        type: step.type,
        target_weight_proportion: step.target_weight_proportion,
        start_arc_angle: step.start_arc_angle,
        final_arc_angle: step.final_arc_angle,
        repetitions: step.repetitions,
        duration: step.duration
      }
    };
  }
  draft = { ...defaultSessionTemplateEditorDraft(), ...draft, step: { ...defaultSessionTemplateEditorDraft().step, ...draft?.step } };
  const title = existing ? (metaOnly ? 'Edit session template' : 'Edit session template') : 'New session template';
  const intro = `<p class="directory-dialog-intro">${existing ? 'Changes apply to future session plans and protocol intensity pickers.' : 'Name the template and set the default step. Add more steps from the list after saving.'}</p>`;
  const properties = metaOnly ? '' : sessionTemplatePropertyFields(draft);
  const basics = `<section class="form-section-card" aria-labelledby="stmpl-section-basics">
    <h3 class="form-section-card__title" id="stmpl-section-basics">Basics</h3>
    <label class="program-field program-field-name">Name<input id="stmpl-name" type="text" required maxlength="80" autocomplete="off" placeholder="e.g. Game day primer" value="${escapeHTML(draft.name)}"></label>
    <label class="program-field">Description<textarea id="stmpl-description" rows="2" maxlength="240" placeholder="Optional">${escapeHTML(draft.description)}</textarea></label>
    <label class="check-label session-template-enabled"><input id="stmpl-active" type="checkbox" ${draft.is_active ? 'checked' : ''}>Enabled</label>
  </section>`;
  const stepSection = properties
    ? `<section class="form-section-card" aria-labelledby="stmpl-section-step">
    <h3 class="form-section-card__title" id="stmpl-section-step">Default step</h3>
    ${properties}
  </section>`
    : '';
  const form = `<form id="session-template-form" class="program-form session-template-form">
    ${basics}
    ${stepSection}
    <footer class="directory-dialog-footer">${button('Cancel', 'close-modal')}${button(existing ? 'Save changes' : 'Create template', 'save-session-template', 'primary', 'type="submit" form="session-template-form"')}</footer>
  </form>`;
  return `<div class="modal-backdrop"><section class="dialog directory-dialog session-template-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${intro}${form}</section></div>`;
}

function syncSessionTemplateModeFields() {
  const type = $('#stmpl-mode')?.value;
  const isometric = type === 'strength';
  $('#stmpl-tilt-end-wrap')?.classList.toggle('hidden', isometric);
  $('#stmpl-reps-wrap')?.classList.toggle('hidden', isometric);
  $('#stmpl-duration-wrap')?.classList.toggle('hidden', !isometric);
}

function saveSessionTemplateFromEditor() {
  if (state.actor !== 'coach' || state.overlay?.type !== 'session-template-editor') return;
  const form = $('#session-template-form');
  const nameEl = $('#stmpl-name');
  nameEl?.setCustomValidity(nameEl.value.trim() ? '' : 'Enter a template name.');
  if (!form?.reportValidity()) return;
  const draft = captureSessionTemplateEditorDraft('stmpl', state.overlay.editorDraft);
  const templates = state.sessionTemplates || (state.sessionTemplates = seedSessionTemplates());
  const existing = state.overlay.id ? templates.find(t => t.id === state.overlay.id) : null;
  const nextActive = draft.is_active;
  if (existing && existing.is_active && !nextActive && enabledSessionTemplateCount() <= 1) {
    toast('Keep at least one enabled template.');
    return;
  }
  if (!existing && !nextActive && !templates.some(t => t.is_active)) {
    toast('The first template must stay enabled.');
    draft.is_active = true;
  }
  const stepPayload = draft.step;
  const step = makeSessionTemplateStep({
    type: stepPayload.type,
    proportion: stepPayload.target_weight_proportion,
    reps: stepPayload.repetitions ?? 3,
    start: stepPayload.start_arc_angle,
    end: stepPayload.final_arc_angle,
    duration: stepPayload.duration,
    rotator: 0
  });
  if (existing) {
    Object.assign(existing, {
      name: draft.name.trim(),
      description: draft.description.trim(),
      is_active: draft.is_active
    });
    if (!state.overlay.metaOnly) {
      if (existing.steps?.length) Object.assign(existing.steps[0], step, { id: existing.steps[0].id, ordinal: 0 });
      else existing.steps = [step];
    }
    normalizeSessionTemplate(existing);
  } else {
    const created = normalizeSessionTemplate({
      id: 'stmpl-' + Date.now(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      is_active: draft.is_active,
      ordinal: 0,
      steps: [step]
    });
    templates.unshift(created);
  }
  clinicSessionTemplates();
  state.overlay = null;
  Object.assign(directoryUI().programs, { library: 'sessions', sessionTab: 'templates' });
  visitTeamHub('sessions');
  render();
  $('[data-action="new-session-template"]')?.focus();
  toast(existing ? 'Session template saved.' : 'Session template created.');
}

function sessionTemplatesTableMarkup() {
  const rows = clinicSessionTemplates();
  if (!rows.length) {
    return `<div class="directory-empty"><h2>No session templates</h2><p>Create a reusable load preset for sessions and follow-up plans.</p>${button('New template', 'new-session-template', 'primary', 'aria-label="New session template"')}</div>`;
  }
  return `<div class="directory-table-scroll" tabindex="0" role="region" aria-label="Session templates">
   <table class="data-table directory-table session-template-grid"><caption class="sr-only">Session templates</caption>
    <thead><tr><th scope="col">Template</th><th scope="col">Load</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${rows.map(row => `<tr>
      <th scope="row"><button class="program-name-button" data-action="open-session-template" data-id="${row.id}">${escapeHTML(row.name)}${icon('chevron', 'icon-sm')}</button>${row.description ? `<small class="session-template-desc">${escapeHTML(row.description)}</small>` : ''}</th>
      <td>${escapeHTML(row.detail)}</td>
      <td>${row.is_active ? 'Active' : 'Inactive'}</td>
      <td class="session-template-actions">${button('Edit', 'edit-session-template', 'small-button', `data-id="${row.id}" aria-label="Edit ${escapeHTML(row.name)}"`)}${button('Duplicate', 'duplicate-session-template', 'small-button', `data-id="${row.id}"`)}${rows.length > 1 ? button('Delete', 'delete-session-template', 'small-button', `data-id="${row.id}" aria-label="Delete ${escapeHTML(row.name)}"`) : ''}</td>
    </tr>`).join('')}</tbody>
   </table>
  </div>
  <p class="directory-footnote">Load presets for sessions, protocol intensity, and follow-up plans after assessment. Row opens the step list.</p>`;
}

function formatSessionStepArc(step) {
  if (step.type === 'strength') return `${step.start_arc_angle}°`;
  const end = step.final_arc_angle ?? step.start_arc_angle;
  return `${step.start_arc_angle}° – ${end}°`;
}

function formatSessionStepDuration(step) {
  if (step.type === 'strength' && step.duration != null) return `${step.duration}s`;
  return '—';
}

function formatSessionStepReps(step) {
  if (step.type === 'strength') return '—';
  return step.repetitions ?? '—';
}

function sessionTemplateStepsMarkup(templateId) {
  const template = clinicSessionTemplate(templateId);
  const steps = [...(template.steps || [])].sort((a, b) => a.ordinal - b.ordinal);
  return `<header class="session-template-steps-head">
    ${button(icon('back', 'icon-sm') + ' Templates', 'session-template-list-back', 'small-button text-button')}
    <div class="settings-pane-head-row">
      <div class="settings-pane-head-text"><h2>${escapeHTML(template.name)}</h2><p class="settings-pane-desc">${escapeHTML(template.detail)} · ${steps.length} step${steps.length === 1 ? '' : 's'}</p></div>
      <div class="settings-pane-head-actions">${button('Edit details', 'edit-session-template-meta', 'small-button', `data-id="${template.id}"`)}${button('Add step', 'add-session-template-step', 'small-button', `data-id="${template.id}"`)}</div>
    </div>
  </header>
  <div class="directory-table-scroll" tabindex="0" role="region" aria-label="Session template steps">
    <table class="data-table directory-table session-template-steps-grid"><caption class="sr-only">Steps for ${escapeHTML(template.name)}</caption>
      <thead><tr><th scope="col">Step</th><th scope="col">Type</th><th scope="col">Duration</th><th scope="col">Reps</th><th scope="col">Weight</th><th scope="col">Arc</th><th scope="col">Rotator</th></tr></thead>
      <tbody>${steps.map((step, index) => `<tr>
        <th scope="row">Step ${index + 1}</th>
        <td>${sessionModes[step.type]?.name || step.type}</td>
        <td>${formatSessionStepDuration(step)}</td>
        <td>${formatSessionStepReps(step)}</td>
        <td>${Math.round((step.target_weight_proportion ?? 0) * 100)}%</td>
        <td>${formatSessionStepArc(step)}</td>
        <td>${step.rotator_angle ?? 0}°</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>
  <p class="directory-footnote">Step editing uses the same fields as create. Full per-step popovers are not in this prototype.</p>`;
}

function sessionTemplatesWorkspaceBody() {
  if (state.sessionTemplateFocusId && clinicSessionTemplates().some(t => t.id === state.sessionTemplateFocusId)) {
    return sessionTemplateStepsMarkup(state.sessionTemplateFocusId);
  }
  return sessionTemplatesTableMarkup();
}

function openSessionTemplateEditor(extra = {}) {
  openModal('session-template-editor', { editorDraft: defaultSessionTemplateEditorDraft(), ...extra });
  syncSessionTemplateModeFields();
}

const sessionTemplateActions = {
  'new-session-template': () => {
    if (state.actor !== 'coach') return;
    openSessionTemplateEditor();
    $('#stmpl-name')?.focus();
  },
  'edit-session-template': el => {
    if (state.actor !== 'coach') return;
    const template = clinicSessionTemplate(el.dataset.id);
    if (!template) return;
    openSessionTemplateEditor({ id: template.id });
  },
  'edit-session-template-meta': el => {
    if (state.actor !== 'coach') return;
    const template = clinicSessionTemplate(el.dataset.id);
    if (!template) return;
    openSessionTemplateEditor({ id: template.id, metaOnly: true });
  },
  'open-session-template': el => {
    if (state.actor !== 'coach' || !clinicSessionTemplates().some(t => t.id === el.dataset.id)) return;
    state.sessionTemplateFocusId = el.dataset.id;
    Object.assign(directoryUI().programs, { library: 'sessions', sessionTab: 'templates' });
    render();
    $('[data-action="session-template-list-back"]')?.focus();
  },
  'session-template-list-back': () => {
    state.sessionTemplateFocusId = null;
    render();
    $('[data-action="open-session-template"]')?.focus();
  },
  'duplicate-session-template': el => {
    if (state.actor !== 'coach') return;
    const source = clinicSessionTemplate(el.dataset.id);
    if (!source) return;
    const copy = normalizeSessionTemplate({
      ...(typeof structuredClone === 'function' ? structuredClone(source) : JSON.parse(JSON.stringify(source))),
      id: 'stmpl-' + Date.now(),
      name: source.name + ' copy',
      ordinal: 0,
      steps: source.steps.map(s => ({ ...s, id: sessionTemplateStepId() }))
    });
    state.sessionTemplates.unshift(copy);
    toast('Template duplicated.');
    render();
  },
  'delete-session-template': el => {
    if (state.actor !== 'coach') return;
    const templates = state.sessionTemplates;
    if (!templates || templates.length <= 1) {
      toast('Keep at least one session template.');
      return;
    }
    const target = templates.find(t => t.id === el.dataset.id);
    if (!target) return;
    if (target.is_active && enabledSessionTemplateCount() <= 1) {
      toast('Cannot delete the last enabled template.');
      return;
    }
    const plan = teamSettings().sessionPlan;
    state.sessionTemplates = templates.filter(t => t.id !== el.dataset.id);
    if (plan.templateId === target.id) plan.templateId = clinicSessionTemplates()[0].id;
    if (state.sessionTemplateFocusId === target.id) state.sessionTemplateFocusId = null;
    clinicSessionTemplates();
    toast('Template removed.');
    render();
  },
  'add-session-template-step': el => {
    if (state.actor !== 'coach') return;
    const template = clinicSessionTemplate(el.dataset.id);
    if (!template) return;
    const steps = template.steps || [];
    const last = steps[steps.length - 1];
    const step = makeSessionTemplateStep({
      type: last?.type || 'isokinetic',
      proportion: last?.target_weight_proportion ?? 0.5,
      reps: last?.repetitions ?? 8,
      start: last?.start_arc_angle ?? 1,
      end: last?.final_arc_angle ?? 30
    });
    step.ordinal = steps.length;
    steps.push(step);
    normalizeSessionTemplate(template);
    render();
    toast('Step added.');
  }
};

document.addEventListener('change', event => {
  if (event.target.id === 'stmpl-mode' && state.overlay?.type === 'session-template-editor') syncSessionTemplateModeFields();
});

document.addEventListener('submit', event => {
  if (event.target.id === 'session-template-form') {
    event.preventDefault();
    saveSessionTemplateFromEditor();
  }
});