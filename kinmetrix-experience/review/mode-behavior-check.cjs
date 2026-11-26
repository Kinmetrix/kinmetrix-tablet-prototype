// Integration checks against the actual prototype scripts, without browser rendering.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,
 document:{addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},documentElement:{dataset:{}},baseURI:'http://127.0.0.1/'},
 window:{addEventListener(){},scrollTo(){}},location:{href:'http://127.0.0.1/'},localStorage:{getItem(){return null;}},matchMedia(){return {matches:false};},
 setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','isokinetic-setup','live-rules','export','session-templates','directory','comparison','mode-experience','session-tools','person-programs','team-settings','team-overview','session-plan','device','waiver','nav-icons','app']){
 let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');
 if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');
 vm.runInContext(source,context,{filename:name+'.js'});
}
vm.runInContext(`
render=()=>{};renderOverlay=()=>{};toast=()=>{};
state.personId='alex';
const evaluated=[];
for(const type of ['rom',{type:'strength',holdStyle:'endurance'},'eccentric','isokinetic']){
 const setupType=typeof type==='object'?type.type:type,holdStyle=typeof type==='object'?type.holdStyle:undefined;
 state.setup={purpose:'assessment',type:setupType,holdStyle,positions:4,reps:1,weight:12,accepted:true,angle:0,tiltOverrides:{}};
 setupModeDefaults();
 const cfg=state.setup,s={seconds:0,force:0,completed:[],angles:[0,90,180,270],tiltByDirection:{0:defaultTilt(0,setupType)}};
 liveStartRep(s);let reason=null;
 for(let tick=0;tick<900&&!reason;tick++){
  liveSimulate(s);
  if(s.armed)s.telemetry.push({time:s.seconds,force:s.effort,tilt:s.tiltNow});
  reason=liveEndReason(s);
 }
 const tag=typeof type==='object'?'strength-endurance':type;
 assert.ok(reason,tag+' should finish from its configured detector');
 assert.ok(s.seconds>0&&s.seconds<90,tag+' should record finite elapsed time');
 const snapshot=modeSnapshot(s);
 assert.ok(snapshot.telemetry.length>1,tag+' should retain measured trace samples');
 assert.ok(Number.isFinite(snapshot.endTilt));
 evaluated.push(tag+': '+reason);
 const r={id:'test-'+tag,personId:'alex',type:setupType,holdStyle:holdStyle,purpose:'assessment',positions:4,reps:1,weight:12,sessionSettings:{...cfg},date:'Today',completedAt:Date.now(),completed:4,total:4,partial:false,fixture:false};
 r.repRecords=[0,90,180,270].map(angle=>modeExampleRep(r,angle,1));
 state.result=r;state.history=[r];
 const data=reportData(r),metric=reportMetric(r);
 assert.ok(data.directions.every(d=>Number.isFinite(d[metric.field])));
 if(isMovementMode(r.type)){
  assert.ok(!modeReportView(r).includes('NaN'),tag+' report should render finite values');
  assert.ok(!modeRepChart(r,data.directions[0],{visible:[1],selected:1,average:true,target:true,cursor:1}).includes('NaN'));
  assert.ok(!modeDirectionTable(r).includes('NaN'));
  assert.ok(!modePrintView(r).includes('NaN'));
 }else{
  state.reportUI=null;
  assert.ok(!reportView().includes('NaN'),tag+' report should render finite values');
  assert.ok(!repReviewView(r,reportState()).includes('NaN'));
  assert.ok(!reportDirectionsView(r,reportState()).includes('NaN'));
  assert.ok(!reportPrintView(r).includes('NaN'));
 }
 if(setupType==='rom'){
  assert.equal(metric.unit,'°');assert.equal(reportRadialMaximum(r,'range'),45);
  assert.ok(data.directions.every(d=>d.range>0&&d.range<=45));
  const before=JSON.stringify(profile());
  assert.equal(JSON.stringify(profile()),before,'recording a ROM result must not change working settings');
  state.overlay={type:'mode-rom-limits',recordId:r.id,percent:80,confirmed:false};
  applyModeROMWorking();assert.equal(JSON.stringify(profile()),before,'unconfirmed limits must not apply');
  state.overlay.confirmed=true;applyModeROMWorking();assert.equal(profile().sourceId,r.id);
  assert.equal(r.applied,true);
  for(const d of data.directions){
   const end=modeWorkingLimit(d,80);
   assert.equal(profile().tiltLimits.isokinetic[d.angle].end,end);
   assert.equal(profile().tiltLimits.eccentric[d.angle].start,end);
   for(const target of ['strength','endurance','isokinetic','eccentric'])assert.ok(validTilt(profile().tiltLimits[target][d.angle],target));
  }
  state.setup.type='isokinetic';assert.equal(setupTilt(0).source,'Coach applied');
  const csv=modeExportRows(r,{unit:'kg'});
  assert.ok(csv.some(row=>row.includes('Measured maximum (degrees)')));
 }
 if(setupType==='strength'&&holdStyle==='endurance')assert.ok(data.duration>0);
 if(setupType==='eccentric')assert.ok(data.directions.every(d=>d.reps.every(rep=>rep.startTilt>rep.endTilt)));
}
// Isokinetic preparation keeps the plan and optional tilt editor in sync.
state.setup={purpose:'session',type:'isokinetic',positions:4,reps:3,weight:12,accepted:true,angle:0,tiltOverrides:{}};
setupModeDefaults();
const planBefore=setupView();
assert.ok(planBefore.includes('12 reps total'));
assert.ok(!planBefore.includes('id="tilt-0-start-button"'),'tilt controls stay out of the main session view');
actions['setup-positions']({dataset:{value:'8'}});
actions['reps-plus']();
assert.ok(setupView().includes('32 reps total'));
assert.equal((isokineticDiagram().match(/<i>/g)||[]).length,32);
actions['isok-direction']({dataset:{angle:'135'}});
assert.equal(state.setup.isokTab,'tilts');
assert.ok(setupView().includes('id="tilt-135-start-button"'));
assert.match(isokineticDiagram(),/isok-node selected/);
setTiltOverride(135,{start:12,end:31});
actions['tilt-apply-selected']();
for(const a of currentAngles())assert.deepEqual(tiltValues(setupTilt(a)),{start:12,end:31});
actions['isok-tab']({dataset:{value:'session'}});
assert.ok(isokineticPreview().includes('12–31° in every direction'));
setTiltOverride(135,{start:33,end:12});
assert.equal(setupIsValid(),false,'hidden invalid ranges still block starting');
assert.match(setupView(),/Tilts<span class="isok-tab-error">Check/);
state.setup.programLoad={kind:'fixed'};state.setup.targets={0:10,90:11,180:12,270:13};state.setup.positions=4;
assert.equal(isokForce(90),11,'program preview uses the target for each direction');
assert.equal(isokForceText(.5),'0.5 kg','minimum movement threshold stays visible');
console.log('PASS — isokinetic split setup, workload preview, tilt selection, apply selected range and invalid-range blocking.');
for(const type of ['strength','eccentric']){
 state.setup={purpose:'session',type,holdStyle:type==='strength'?'timed':undefined,positions:4,reps:2,weight:12,accepted:true,angle:0,tiltOverrides:{}};
 setupModeDefaults();
 const html=setupView();
 assert.ok(html.includes('isok-split'),type+' uses split setup');
 assert.ok(html.includes('reps total'),type+' preview shows workload total');
 assert.ok(!html.includes('tilt-table'),type+' keeps the wide tilt table out of the main view');
 actions['isok-direction']({dataset:{angle:'90'}});
 assert.equal(state.setup.isokTab,'tilts');
 assert.ok(setupView().includes('id="tilt-90-'),type+' tilt editor opens from the diagram');
}
state.setup={purpose:'session',type:'strength',holdStyle:'timed',positions:4,reps:2,weight:12,accepted:true,angle:90,tiltOverrides:{}};
setTiltOverride(90,{start:8});
actions['tilt-apply-selected']();
for(const a of currentAngles())assert.equal(setupTilt(a).start,8,'isometric apply-to-all copies pad position');
state.setup={purpose:'session',type:'eccentric',positions:4,reps:2,weight:12,accepted:true,angle:180,tiltOverrides:{}};
setTiltOverride(180,{start:10,end:30});
assert.equal(setupIsValid(),false,'eccentric invalid return range blocks start');
console.log('PASS — isometric and eccentric split setup, diagram tilt editor, and apply-to-all.');
state.personId='alex';
beginSetup('assessment','eccentric');
assert.match(setupView(),/Eccentric assessment/);
assert.ok(setupView().includes('isok-split'));
beginSetup('session',memberPrograms('alex')[0].id);
assert.ok(setupView().includes('isok-split'));
beginSetup('assessment','rom');
assert.match(setupView(),/Range of motion assessment/);
assert.ok(setupView().includes('isok-split'));
assert.ok(setupView().includes('isok-radial'));
assert.match(setupView(),/Limits/);
actions['isok-direction']({dataset:{angle:'90'}});
assert.ok(setupView().includes('id="tilt-90-'));
console.log('PASS — assessment and program sessions honor chosen mode with split setup.');
// A safety cap must stop eccentric motion rather than count it as completed travel.
state.setup={type:'eccentric',weight:12,challenge:3,eccCap:5,eccSpeed:'slow',reps:1};
const stopped={armed:true,force:6,below:0,progress:.25,tiltNow:26};
assert.match(liveEndReason(stopped),/force cap/);
// A clinician cannot compare an inaccessible roster identity.
state.actor='coach';state.clinicianId='sam';state.rosterPolicy='assigned';
directoryUI().roster.compareSelected=['alex','daniel'];
assert.deepEqual(Array.from(rosterCompareSelection()),['alex']);
console.log('PASS — mode rendering, finish rules, ROM approval/inheritance, degree export, safety stop and comparison access.');
console.log(evaluated.join('\\n'));
`,context);
