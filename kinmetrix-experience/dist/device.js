/* Connected Kinmetrix unit — staff device page (simulated hardware). */
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
  const calib = ready ? 'Current · simulation' : 'Run after the device is ready';
  const lastCalib = ready ? 'Today · placeholder' : '—';
  return `<main class="device-workspace templates-hub staff-single-pane" aria-label="Device">
    <div class="settings-hub-pane device-page-pane">
      <header class="settings-pane-head">
        <div class="settings-pane-head-row">
          <div class="settings-pane-head-text">
            <h1>Device</h1>
            <p class="settings-pane-desc">Status for the Kinmetrix unit paired with this shared iPad. Connection, calibration, and force readings are simulated — no live hardware is controlled.</p>
          </div>
          <div class="settings-pane-head-actions">
            <span class="station-indicator device-page-status"><span class="status-dot ${ready ? '' : 'offline'}"></span>${ready ? 'Ready for sessions' : 'Unavailable'}</span>
          </div>
        </div>
      </header>
      <section class="settings-block" aria-labelledby="device-connection-title">
        <h2 id="device-connection-title">Connection</h2>
        <div class="device-stats">
          <div class="device-stat"><span>Device name</span><strong>Kinmetrix demo unit</strong></div>
          <div class="device-stat"><span>Serial</span><strong>KM-20481 · simulation</strong></div>
          <div class="device-stat"><span>Link</span><strong>${ready ? 'Ready · simulation' : 'Not connected · simulation'}</strong></div>
          <div class="device-stat"><span>Firmware</span><strong>2.4.1 · placeholder</strong></div>
        </div>
        <label class="check-label device-ready-toggle"><input type="checkbox" id="device-ready" ${ready ? 'checked' : ''}><span>Simulate a ready device</span></label>
        <p class="directory-footnote">Sessions that need force or movement data stay blocked while the device is unavailable.</p>
      </section>
      <section class="settings-block" aria-labelledby="device-calibration-title">
        <h2 id="device-calibration-title">Calibration</h2>
        <div class="device-stats">
          <div class="device-stat"><span>Calibration status</span><strong>${calib}</strong></div>
          <div class="device-stat"><span>Last calibrated</span><strong>${lastCalib}</strong></div>
        </div>
        <p class="directory-footnote">Tare and weight calibration use BLE in production. This prototype links to a layout stub only.</p>
        <div class="device-page-links">
          <a href="${deviceCalibrationHref()}" target="_blank" rel="noopener noreferrer">Open calibration layout (HTML mirror)</a>
        </div>
      </section>
      <section class="settings-block" aria-labelledby="device-help-title">
        <h2 id="device-help-title">Troubleshooting</h2>
        <ul class="device-help-list">
          <li>Power-cycle the Kinmetrix unit, then reopen this page.</li>
          <li>Confirm the iPad and unit are on the same clinic network (not simulated here).</li>
          <li>Re-run calibration if force readings drift after transport.</li>
        </ul>
        <p class="directory-footnote">Pairing, device lists, and live control screens are out of scope for this prototype.</p>
      </section>
    </div>
  </main>`;
}

const deviceActions = {
  'nav-device': () => visitDevice()
};