const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const stageJs = fs.readFileSync(path.join(dist, 'experience-stage.js'), 'utf8');
const stageCss = fs.readFileSync(path.join(dist, 'experience-stage.css'), 'utf8');

const errors = [];

if (!index.includes('experience-stage.css')) errors.push('index.html must link experience-stage.css');
if (!index.includes('experience-stage.js')) errors.push('index.html must link experience-stage.js');
if (!stageJs.includes('LOGICAL_WIDTH = 1180')) errors.push('experience-stage.js must keep 1180 logical width');
if (!stageJs.includes('LOGICAL_HEIGHT = 820')) errors.push('experience-stage.js must keep 820 logical height');
if (!stageJs.includes('useIpadViewport')) errors.push('experience-stage.js must define useIpadViewport');
if (!stageJs.includes('experience-ipad-viewport')) errors.push('experience-stage.js must toggle experience-ipad-viewport');
if (!stageCss.includes('--experience-logical-width: 1180px')) errors.push('experience-stage.css must define logical width');
if (!stageCss.includes('body.experience-presentation')) errors.push('experience-stage.css must style presentation mode');
if (stageJs.includes('experience-canvas')) errors.push('experience-stage.js must not mount a clipping canvas wrapper');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('experience-stage-check: ok');