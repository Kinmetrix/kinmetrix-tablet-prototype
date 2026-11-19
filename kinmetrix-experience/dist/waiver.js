/* Waiver capture and review. Stored in memory for this demo (not uploaded). */
const DEMO_WAIVER_SCRIBBLE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><path d="M12 52 Q40 18 72 48 T140 38 T210 55 T290 28" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/></svg>'
  );

function ensureMemberWaivers() {
  state.memberWaivers ??= {};
}

function waiverPolicyMandatory() {
  const team = teamSettings();
  if (team.waiverPolicy === 'off' || !team.onboarding?.waiver) return false;
  return team.waiverPolicy === 'before-session';
}

function memberWaiverRecord(personId) {
  ensureMemberWaivers();
  return state.memberWaivers[personId] || null;
}

function hasMemberWaiver(personId) {
  const w = memberWaiverRecord(personId);
  return Boolean(w?.signatureDataUrl && w?.signedAt);
}

function waiverBlocksPerson(personId) {
  return waiverPolicyMandatory() && !hasMemberWaiver(personId) && !memberHasSessionData(personId);
}

function waiverBlocksCurrent() {
  return person() && waiverBlocksPerson(state.personId);
}

function formatWaiverSignedAt(iso) {
  if (!iso) return '';
  const at = new Date(iso);
  return (
    at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

function waiverSignaturesRosterMarkup() {
  const rows = people
    .filter(p => hasMemberWaiver(p.id))
    .map(p => {
      const w = memberWaiverRecord(p.id);
      return `<article class="waiver-signature-card"><div><strong>${escapeHTML(p.name)}</strong><small>Signed ${escapeHTML(formatWaiverSignedAt(w.signedAt))}</small></div><img src="${w.signatureDataUrl}" alt="Waiver signature for ${escapeHTML(p.name)}"></article>`;
    });
  if (!rows.length) {
    return `<div class="waiver-signatures-list waiver-signatures-list--empty"><p class="muted small">No signed waivers in this demo session yet. Members sign when starting a session.</p></div>`;
  }
  return `<div class="waiver-signatures-list" aria-label="On-file signatures">${rows.join('')}</div>`;
}

function memberWaiverProfileMarkup() {
  if (!waiverBlocksPerson(state.personId)) return '';
  return `<section class="member-waiver-panel" aria-label="Waiver required"><h3>Waiver required</h3><p class="small">A signed waiver is required before assessment or training.</p>${button('Sign waiver', 'open-waiver-sign', 'primary')}</section>`;
}

function waiverRequiredBannerMarkup() {
  if (!waiverBlocksCurrent() || state.stage) return '';
  return `<div class="waiver-required-banner" role="status"><p><strong>Waiver required</strong> — sign before starting a session.</p>${button('Sign waiver', 'open-waiver-sign', 'primary')}</div>`;
}

function waiverSignDialogMarkup() {
  const p = person();
  const name = p ? escapeHTML(p.name) : 'Member';
  return `<div class="modal-backdrop"><section class="dialog waiver-sign-dialog wide" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title">Sign waiver</h2><span class="sr-only">Close unavailable until signed</span></div>
<p>Signing is <strong>required</strong> for ${name} before assessment or training on this team.</p>
<article class="waiver-terms" aria-label="Terms"><h3>Kinmetrix terms and liability waiver</h3><p>Your use of Kinmetrix products is subject to the clinic’s terms of service and liability waiver. By signing below, you acknowledge that you have read and agree to those terms.</p><p class="small muted">This prototype stores the signature in browser memory only. It is not a legal record.</p></article>
<div class="waiver-pad-wrap"><canvas id="waiver-sign-canvas" width="600" height="200" aria-label="Draw your signature"></canvas><div class="waiver-pad-bar"><p>Sign above</p>${button('Clear', 'waiver-clear-pad', 'small-button')}${button('Save', 'waiver-save-pad', 'primary', 'id="waiver-save-button" disabled')}</div></div></section></div>`;
}

let waiverPad = null;

function destroyWaiverPad() {
  if (waiverPad?.cleanup) waiverPad.cleanup();
  waiverPad = null;
}

function mountWaiverSignaturePad() {
  destroyWaiverPad();
  const canvas = $('#waiver-sign-canvas');
  if (!canvas) return;
  const saveBtn = $('#waiver-save-button');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasInk = false;

  function resize() {
    const wrap = canvas.parentElement;
    const w = Math.max(1, Math.floor(wrap.clientWidth));
    const h = 160;
    const ratio = window.devicePixelRatio || 1;
    const prior = hasInk ? canvas.toDataURL('image/png') : null;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111';
    if (prior) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = prior;
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
  }

  function setInk(ink) {
    hasInk = ink;
    if (saveBtn) saveBtn.disabled = !ink;
  }

  function clearPad() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    setInk(false);
  }

  function pointFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const clientX = ev.clientX != null ? ev.clientX : ev.touches[0].clientX;
    const clientY = ev.clientY != null ? ev.clientY : ev.touches[0].clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(ev) {
    ev.preventDefault();
    drawing = true;
    const p = pointFromEvent(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function onPointerMove(ev) {
    if (!drawing) return;
    ev.preventDefault();
    const p = pointFromEvent(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setInk(true);
  }

  function onPointerUp() {
    drawing = false;
  }

  const onResize = () => resize();
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', onResize);
  requestAnimationFrame(() => {
    resize();
    clearPad();
  });

  waiverPad = {
    hasInk: () => hasInk,
    save: () => canvas.toDataURL('image/png'),
    clear: clearPad,
    cleanup: () => {
      window.removeEventListener('resize', onResize);
      canvas.replaceWith(canvas.cloneNode(true));
    }
  };
}

function saveMemberWaiver(dataUrl) {
  if (!state.personId) return;
  ensureMemberWaivers();
  state.memberWaivers[state.personId] = { signedAt: new Date().toISOString(), signatureDataUrl: dataUrl };
}

function resumeAfterWaiver() {
  const resume = state.waiverResume;
  state.waiverResume = null;
  if (!resume) {
    render();
    return;
  }
  if (resume.kind === 'setup') {
    beginSetup(resume.purpose, resume.type, resume.continuing);
    return;
  }
  if (resume.kind === 'picker') {
    openSessionPicker(resume.mode, resume.purpose);
    return;
  }
  render();
}

function gateWaiver(resume) {
  if (!waiverBlocksCurrent()) return false;
  state.waiverResume = resume || null;
  openModal('waiver-sign');
  return true;
}

function openWaiverSignModal() {
  if (!person() || !waiverPolicyMandatory()) {
    toast('Waiver collection is off for this team.');
    return;
  }
  if (hasMemberWaiver(state.personId)) {
    toast('Waiver is already on file for this member.');
    return;
  }
  openModal('waiver-sign');
}

function completeWaiverSave() {
  if (!waiverPad?.hasInk()) return;
  saveMemberWaiver(waiverPad.save());
  destroyWaiverPad();
  state.overlay = null;
  syncModalSurface();
  renderOverlay();
  toast('Waiver signed.');
  resumeAfterWaiver();
}

const waiverActions = {
  'open-waiver-sign': () => openWaiverSignModal(),
  'waiver-clear-pad': () => waiverPad?.clear(),
  'waiver-save-pad': () => completeWaiverSave(),
  'close-waiver-sign': () => {
    if (waiverBlocksCurrent()) {
      toast('A signature is required to continue.');
      return;
    }
    destroyWaiverPad();
    closeModal();
  }
};

function seedDemoMemberWaivers() {
  ensureMemberWaivers();
  const at = '2026-11-01T14:30:00.000Z';
  for (const id of ['maya', 'daniel', 'noah', 'sofia', 'lena']) {
    if (!state.memberWaivers[id]) {
      state.memberWaivers[id] = { signedAt: at, signatureDataUrl: DEMO_WAIVER_SCRIBBLE };
    }
  }
}