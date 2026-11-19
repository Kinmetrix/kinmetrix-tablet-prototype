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
          <div class="settings-pane-head-actions">
            <span class="station-indicator device-page-status"><span class="status-dot ${ready ? '' : 'offline'}"></span>${ready ? 'Ready for sessions' : 'Unavailable'}</span>
          </div>
        </div>
      </header>
      <div class="device-page-body">
        <div class="device-page-stack">
          <section class="device-page-card" aria-labelledby="device-connection-title">
            <h2 id="device-connection-title">Connection</h2>
            <p class="device-page-card-lead">${ready ? 'Linked to this iPad' : 'This iPad is not linked to a ready unit'}</p>
            <div class="device-page-badges">
              <span class="badge neutral">Firmware 2.4.1</span>
              <span class="badge ${ready ? '' : 'amber'}">${linkLabel}</span>
            </div>
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
          <img src="assets/renders/isokinetic-station-v1.png" width="887" height="887" alt="" decoding="async">
          <div class="device-unit-card-status">
            <span class="status-dot ${ready ? '' : 'offline'}" aria-hidden="true"></span>
            <div>
              <strong>${ready ? 'Your unit is ready' : 'Unit unavailable'}</strong>
              <p class="muted small device-unit-card-name">Kinmetrix unit</p>
              <span class="device-unit-serial">KM-20481</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </main>`;
}

const deviceActions = {
  'nav-device': () => visitDevice()
};