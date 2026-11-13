// Integration checks against the actual prototype scripts, without browser rendering.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist');
const context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,
 document:{addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},documentElement:{dataset:{}}},
 window:{addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null;}},matchMedia(){return {matches:false};},
 setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','live-rules','export','directory','comparison','mode-experience','session-tools','person-programs','team-settings','team-overview','session-plan','app']){
 let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');
 if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');
 vm.runInContext(source,context,{filename:name+'.js'});
}
vm.runInContext(`
render=()=>{};renderOverlay=()=>{};toast=()=>{};
state.personId='alex';
const evaluated=[];
for(const type of ['rom','endurance','eccentric','isokinetic']){
 state.setup={purpose:'assessment',type,positions:4,reps:1,weight:12,accepted:true,angle:0,tiltOverrides:{}};
 setupModeDefaults();
 const cfg=state.setup,s={seconds:0,force:0,completed:[],angles:[0,90,180,270],tiltByDirection:{0:defaultTilt(0,type)}};
 liveStartRep(s);let reason=null;
 for(let tick=0;tick<900&&!reason;tick++){
  liveSimulate(s);
  if(s.armed)s.telemetry.push({time:s.seconds,force:s.effort,tilt:s.tiltNow});
  reason=liveEndReason(s);
 }
 assert.ok(reason,type+' should finish from its configured detector');
 assert.ok(s.seconds>0&&s.seconds<90,type+' should record finite elapsed time');
 const snapshot=modeSnapshot(s);
 assert.ok(snapshot.telemetry.length>1,type+' should retain measured trace samples');
 assert.ok(Number.isFinite(snapshot.endTilt));
 evaluated.push(type+': '+reason);
 const r={id:'test-'+type,personId:'alex',type,purpose:'assessment',positions:4,reps:1,weight:12,sessionSettings:{...cfg},date:'Today',completedAt:Date.now(),completed:4,total:4,partial:false,fixture:false};
 r.repRecords=[0,90,180,270].map(angle=>modeExampleRep(r,angle,1));
 state.result=r;state.history=[r];
 const data=reportData(r),metric=reportMetric(r);
 assert.ok(data.directions.every(d=>Number.isFinite(d[metric.field])));
 assert.ok(!modeReportView(r).includes('NaN'),type+' report should render finite values');
 assert.ok(!modeRepChart(r,data.directions[0],{visible:[1],selected:1,average:true,target:true,cursor:1}).includes('NaN'));
 assert.ok(!modeDirectionTable(r).includes('NaN'));
 assert.ok(!modePrintView(r).includes('NaN'));
 if(type==='rom'){
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
 if(type==='endurance')assert.ok(data.duration>0&&data.totalHold>data.duration);
 if(type==='eccentric')assert.ok(data.directions.every(d=>d.reps.every(rep=>rep.startTilt>rep.endTilt)));
}
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
