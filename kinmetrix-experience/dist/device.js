/* Connected Kinmetrix unit — staff device page. */
function visitDevice() {
  if (state.stage === 'live') {
    toast('End the active session before opening device settings.');
    return;
  }
  state.nav = 'device';
  state.overlay = null;
  if (state.actor === 'coach') {
    state.personId = null;
    state.pendingSetup = null;
    state.memberOrigin = 'find';
  }
  render();
  window.scrollTo(0, 0);
}

function deviceCalibrationHref() {
  return new URL('../prototype/device-calibration.html', document.baseURI).href;
}

function devicePage() {
  const ready = state.deviceReady;
  const lastCalib = ready ? 'Last calibrated today' : 'Run calibration after the unit is ready';
  const linkLabel = ready ? 'Connected' : 'Not connected';
  return `<main class="device-workspace templates-hub staff-single-pane" aria-label="Device">
    <div class="settings-hub-pane device-page-pane">
      <header class="settings-pane-head">
        <div class="settings-pane-head-row">
          <div class="settings-pane-head-text">
            <h1>Device</h1>
            <p class="settings-pane-desc">Status for the Kinmetrix unit paired with this shared iPad. Review connection, calibration, and troubleshooting before sessions.</p>
          </div>
        </div>
      </header>
      <div class="device-page-body">
        <div class="device-page-stack">
          <section class="device-page-card" aria-labelledby="device-connection-title">
            <h2 id="device-connection-title">Connection</h2>
            ${ready ? '' : `<p class="device-page-card-lead">This iPad is not linked to a ready unit</p>`}
            <dl class="device-page-meta${ready ? '' : ' device-page-meta--after-lead'}">
              <div class="device-page-meta-item">
                <dt>Link</dt>
                <dd class="device-page-meta-value ${ready ? '' : 'device-page-meta-value--warn'}"><span class="status-dot ${ready ? '' : 'offline'}" aria-hidden="true"></span>${linkLabel}</dd>
              </div>
              <div class="device-page-meta-item">
                <dt>Firmware</dt>
                <dd class="device-page-meta-value tabular">2.4.1</dd>
              </div>
              <div class="device-page-meta-item">
                <dt>Serial</dt>
                <dd class="device-page-meta-value tabular">KM-20481</dd>
              </div>
            </dl>
            ${ready ? '' : '<p class="directory-footnote device-page-card-note">Sessions that need force or movement data stay blocked while the device is unavailable.</p>'}
          </section>
          <section class="device-page-card" aria-labelledby="device-calibration-title">
            <h2 id="device-calibration-title">Calibration</h2>
            <p class="device-page-card-lead">${lastCalib}</p>
            <p class="directory-footnote device-page-card-note">Tare and weight calibration connect to the unit over Bluetooth from this iPad.</p>
            <a class="button primary small-button device-page-calibration" href="${deviceCalibrationHref()}" target="_blank" rel="noopener noreferrer">Check calibration</a>
          </section>
          <section class="device-page-card" aria-labelledby="device-help-title">
            <h2 id="device-help-title">Help</h2>
            <ul class="device-page-help-list">
              <li>Power-cycle the Kinmetrix unit, then reopen this page.</li>
              <li>Confirm the iPad and unit are on the same clinic network.</li>
              <li>Re-run calibration if force readings drift after transport.</li>
            </ul>
            <p class="directory-footnote device-page-card-note">Contact Kinmetrix support if the unit stays unavailable after these steps.</p>
          </section>
        </div>
        <aside class="device-unit-card" aria-label="Paired unit">
          <img src="assets/renders/isokinetic-station-v1.png?v=labeled-1" width="585" height="1024" alt="Kinmetrix unit. 1 Arc. 2 Sensor pad. 3 Manual buttons. 4 Seat adjuster. 5 On/off switch. 6 Calibration kit, inside behind the seat leg. 7 iPad. 8 Emergency button." decoding="async">
        </aside>
      </div>
    </div>
  </main>`;
}

const deviceActions = {
  'nav-device': () => visitDevice()
};