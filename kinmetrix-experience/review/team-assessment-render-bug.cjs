const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '../dist');
const context = vm.createContext({
  assert,
  console,
  structuredClone,
  URL,
  Blob,
  crypto: require('node:crypto').webcrypto,
  document: {
    baseURI: 'http://localhost/experience/',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return { innerHTML: '' }; },
    documentElement: { dataset: {} }
  },
  window: { addEventListener() {}, scrollTo() {} },
  localStorage: { getItem() { return null; } },
  matchMedia() { return { matches: false }; },
  setTimeout() {},
  clearTimeout() {}
});

for (const name of [
  'workspace', 'report', 'photos', 'profile', 'reps', 'setup', 'isokinetic-setup', 'live-rules',
  'export', 'directory', 'comparison', 'mode-experience', 'session-tools', 'person-programs',
  'team-settings', 'team-overview', 'session-plan', 'device', 'waiver', 'nav-icons'
]) {
  vm.runInContext(fs.readFileSync(path.join(root, `${name}.js`), 'utf8'), context, { filename: `${name}.js` });
}
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\nrender\(\);\s*$/, '\n'), context, { filename: 'app.js' });

vm.runInContext(`
state.actor = 'coach';
state.clinicianId = 'sam';
state.nav = 'team';
state.teamHubCard = 'assessments';
directoryUI().programs.library = 'assessments';
directoryUI().programs.assessmentTab = 'protocol';
teamHubPage();
assert.equal(state.stage, 'team-assessment-edit', 'sync sets stage during markup');
assert.doesNotThrow(() => appRootView(), 'team assessment edit stays on clinic shell');
assert.match(appRootView(), /team-hub-back/, 'back control survives re-render');
state.setup.reps = 4;
teamHubPage();
assert.equal(state.setup.reps, 4, 're-render does not reset draft setup from team defaults');
leaveTeamAssessmentEditor();
state.teamHubCard = null;
directoryUI().programs.library = null;
assert.match(teamHubPage(), /<h1>Team<\\/h1>/, 'back opens team hub grid');
assert.doesNotMatch(teamHubPage(), /team-hub-back/, 'hub grid has no detail back control');
`, context);

console.log('PASS — team assessment edit must not use sessionView shell.');