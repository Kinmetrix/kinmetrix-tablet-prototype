/* Follow-up session plan after an assessment. Defaults come from team settings. */
function canOpenSessionPlan(record) {
  return state.actor === 'coach' && !state.guided && record && !record.partial && record.purpose === 'assessment';
}

function sessionPlanReportButton(record) {
  return canOpenSessionPlan(record) ? button('Session plan', 'open-session-plan', 'small-button') : '';
}

function sessionPlanDraft() {
  const defaults = teamSettings().sessionPlan;
  return state.sessionPlanDraft ??= {
    sessionsPerWeek: defaults.sessionsPerWeek,
    weeks: defaults.weeks,
    templateId: defaults.templateId
  };
}

function sessionPlanLoads(record) {
  if (!record || record.partial) return [];
  const data = reportData(record);
  const percent = sessionPlanTemplate(sessionPlanDraft().templateId).percent / 100;
  return (data.directions || []).map(direction => ({
    angle: direction.angle,
    name: direction.name,
    load: direction.force * percent
  }));
}

function openSessionPlan() {
  const record = state.result;
  if (!canOpenSessionPlan(record) || state.stage !== 'review') return;
  const defaults = teamSettings().sessionPlan;
  state.sessionPlanDraft = {
    sessionsPerWeek: defaults.sessionsPerWeek,
    weeks: defaults.weeks,
    templateId: defaults.templateId
  };
  state.stage = 'session-plan';
  render();
  window.scrollTo(0, 0);
}

function leaveSessionPlan() {
  if (state.stage !== 'session-plan') return;
  state.stage = 'review';
  render();
  window.scrollTo(0, 0);
}

function saveMemberSessionPlan() {
  if (state.stage !== 'session-plan' || !person()) return;
  const draft = sessionPlanDraft();
  state.memberSessionPlans ??= {};
  state.memberSessionPlans[state.personId] = {
    ...draft,
    createdFrom: state.result?.id,
    line: sessionPlanLine(draft)
  };
  state.stage = 'review';
  render();
  toast('Session plan saved for ' + person().name + '.');
}

function sessionPlanView() {
  const member = person();
  const record = state.result;
  const draft = sessionPlanDraft();
  const template = sessionPlanTemplate(draft.templateId);
  const loads = sessionPlanLoads(record);
  const unit = teamSettings().forceUnit;
  return `<div class="session-page stage-session-plan">
    <header class="session-header">
      <div class="session-person">
        <button class="icon-button" data-action="leave-session-plan" aria-label="Back to report">${icon('back')}</button>
        ${photoAvatar(member)}
        <div><strong>${escapeHTML(member.name)}</strong><small>Session plan</small></div>
      </div>
      <div class="button-row">${button('Skip', 'leave-session-plan', 'small-button')}</div>
    </header>
    <main class="session-content">
      <div class="directory-page settings-page session-plan-page">
        <header class="directory-heading">
          <div>
            <h1>Session plan</h1>
            <p>Follow-up visits from this team’s defaults. Skip returns to the report.</p>
          </div>
          <div class="directory-heading-actions">${button('Create plan', 'create-session-plan', 'primary')}</div>
        </header>
        <section class="settings-block settings-plan-fields" aria-label="Plan cadence">
          <label class="field-label" for="session-plan-sessions">Sessions / week</label>
          <select id="session-plan-sessions">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${draft.sessionsPerWeek === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <label class="field-label" for="session-plan-weeks">Weeks</label>
          <select id="session-plan-weeks">${[4, 5, 6, 7, 8].map(n => `<option value="${n}" ${draft.weeks === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <label class="field-label" for="session-plan-template">Session template</label>
          <select id="session-plan-template">${clinicSessionTemplates().map(item => `<option value="${item.id}" ${draft.templateId === item.id ? 'selected' : ''}>${item.name} · ${item.detail}</option>`).join('')}</select>
          <p class="directory-footnote">${escapeHTML(sessionPlanLine(draft))} · ${template.detail}</p>
        </section>
        ${loads.length ? `<section class="settings-block" aria-label="Suggested loads">
          <h2>Suggested loads</h2>
          <p class="directory-footnote">${template.percent}% of this assessment, shown in the team unit.</p>
          <div class="directory-table-scroll">
            <table class="data-table directory-table">
              <thead><tr><th scope="col">Direction</th><th scope="col">Load</th></tr></thead>
              <tbody>${loads.map(row => `<tr><th scope="row">${escapeHTML(row.name)} · ${row.angle}°</th><td>${teamForceLabel(row.load)}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </section>` : ''}
      </div>
    </main>
  </div>`;
}

function readSessionPlanDraftFromForm() {
  const sessions = Number($('#session-plan-sessions')?.value);
  const weeks = Number($('#session-plan-weeks')?.value);
  const templateId = $('#session-plan-template')?.value;
  if (![1, 2, 3, 4, 5].includes(sessions) || ![4, 5, 6, 7, 8].includes(weeks) || !sessionPlanTemplate(templateId)) return;
  state.sessionPlanDraft = {sessionsPerWeek: sessions, weeks, templateId};
}

const sessionPlanActions = {
  'open-session-plan': openSessionPlan,
  'leave-session-plan': leaveSessionPlan,
  'create-session-plan': () => {
    readSessionPlanDraftFromForm();
    saveMemberSessionPlan();
  }
};

document.addEventListener('change', event => {
  if (!['session-plan-sessions', 'session-plan-weeks', 'session-plan-template'].includes(event.target.id)) return;
  readSessionPlanDraftFromForm();
  render();
});
