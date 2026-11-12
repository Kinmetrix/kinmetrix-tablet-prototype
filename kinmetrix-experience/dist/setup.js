/* Session preparation. One row per direction; the middle of each row changes with the mode.
   All limits, thresholds and speeds are placeholders for the prototype, not validated values. */
const SETUP_MAX_TILT=45;
const setupDirectionNames={0:'Forward',45:'Forward right',90:'Right',135:'Rear right',180:'Rear',225:'Rear left',270:'Left',315:'Forward left'};
const setupModeLine={strength:'Push against a pad that stays still.',endurance:'Hold a steady push for as long as you can.',isokinetic:'Push while the pad moves at a controlled speed.',eccentric:'Resist while the device moves the pad back toward you.',rom:'Move as far as is comfortable. This finds their limits.'};
const eccentricSpeeds={slow:{label:'Slow',rate:4},medium:{label:'Medium',rate:8},fast:{label:'Fast',rate:12}};
// fixed: one tilt. travel: start up to end. return: device brings the pad back from start to end. limit: start plus a safety maximum.
function setupTiltKind(type=state.setup.type){return ['strength','endurance'].includes(type)?'fixed':type==='rom'?'limit':type==='eccentric'?'return':'travel';}
function setupHasTiltRange(type=state.setup.type){return setupTiltKind(type)!=='fixed';}
function setupHasFixedTilt(type=state.setup.type){return setupTiltKind(type)==='fixed';}
function setupModeDefaults(){
 const cfg=state.setup;
 cfg.holdSeconds??=6;cfg.endDrop??=20;cfg.endCapOn??=false;cfg.endCap??=120;
 cfg.romStart??=0;cfg.romMax??=SETUP_MAX_TILT;cfg.romStillOn??=true;cfg.romStill??=2;cfg.romDropOn??=true;cfg.romDrop??=5;
 cfg.eccSpeed??='slow';cfg.eccCap??=Math.ceil(Math.max(cfg.weight||8,...Object.values(cfg.targets||{}).filter(Number.isFinite))*1.5);
 // Challenge weight: the force needed before anything registers. Separate from target force.
 if(cfg.challengeFor!==cfg.type){cfg.challenge=({strength:1.5,endurance:1.5,isokinetic:3,eccentric:3,rom:1})[cfg.type];cfg.challengeFor=cfg.type;cfg.challengeAuto=cfg.type==='isokinetic';}
 cfg.challengeHold??=1;
 // Isokinetic follows the existing product habit: challenge sits just under the target unless set by hand.
 if(cfg.type!=='rom'&&Number.isFinite(cfg.weight)&&cfg.weight>=1)cfg.challenge=cfg.challengeAuto?setupAutoChallenge(cfg.weight):Math.max(.5,Math.min(cfg.challenge,cfg.weight-.5));
 if(cfg.repsFor!==cfg.type){if(!cfg.continuing)cfg.reps=({endurance:1,eccentric:2})[cfg.type]||3;cfg.repsFor=cfg.type;}
}
function defaultStartingTilt(angle){return [135,180,225].includes(Number(angle))?10:5;}
function defaultTilt(angle,type=state.setup.type){
 const near=defaultStartingTilt(angle),kind=setupTiltKind(type);
 return kind==='fixed'?{start:near}:kind==='travel'?{start:near,end:33}:kind==='return'?{start:33,end:near}:{start:state.setup.romStart??0,end:state.setup.romMax??SETUP_MAX_TILT};
}
function validTilt(tilt,type=state.setup.type){
 const ok=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=SETUP_MAX_TILT,kind=setupTiltKind(type);
 if(!tilt||!ok(tilt.start))return false;
 if(kind==='fixed')return true;
 return ok(tilt.end)&&(kind==='return'?tilt.end<tilt.start:tilt.end>tilt.start);
}
function tiltValues(tilt,type=state.setup.type){return setupHasTiltRange(type)?{start:tilt.start,end:tilt.end}:{start:tilt.start};}
function setupTilt(angle){
 const cfg=state.setup,custom=cfg.tiltOverrides?.[cfg.type]?.[angle];
 if(custom)return {...custom,source:'This session',changed:true};
 const personal=cfg.type!=='rom'&&profile().applied&&profile().tiltLimits?.[cfg.type]?.[angle];
 if(validTilt(personal))return {...tiltValues(personal),source:'Coach applied'};
 return {...defaultTilt(angle),source:cfg.type==='rom'?'Same as above':'Default'};
}
function setupTiltText(angle){const tilt=setupTilt(angle),kind=setupTiltKind();return !validTilt(tilt)?'Check tilt':kind==='fixed'?`${tilt.start}°`:kind==='return'?`${tilt.start}→${tilt.end}°`:`${tilt.start}–${tilt.end}°`;}
function sessionTiltText(tilt,type){const kind=setupTiltKind(type);return kind==='fixed'?`Tilt ${tilt.start}° · Fixed`:kind==='travel'?`Tilt ${tilt.start}–${tilt.end}°`:kind==='return'?`Tilt ${tilt.start}→${tilt.end}° · Device returns`:`Start ${tilt.start}° · Limit ${tilt.end}°`;}
function setupIsValid(){
 const cfg=state.setup;
 return programTargetsValid()&&Number.isFinite(cfg.weight)&&cfg.weight>=1&&cfg.weight<=50&&(cfg.programLoad||cfg.weight*2%1===0)&&currentAngles().every(angle=>validTilt(setupTilt(angle)));
}
function setupEndsText(){
 const cfg=state.setup;
 return ({strength:`Each rep ends when the ${cfg.holdSeconds} second hold is done`,endurance:`Each rep ends when force drops ${cfg.endDrop}% below their hold${cfg.endCapOn?`, or after ${cfg.endCap} seconds`:''}`,isokinetic:`Each rep ends when the movement is complete, or after ${cfg.challengeHold} s below challenge`,eccentric:'Each rep ends when the pad reaches the end tilt',rom:`Each rep ends on ${[cfg.romStillOn?'no movement':'',cfg.romDropOn?'force drop':'','manual stop'].filter(Boolean).join(', ').replace(/, ([^,]*)$/,' or $1')}`})[cfg.type];
}
function resetSetupAcceptance(){
 state.setup.accepted=false;
 const check=$('#accept-settings'),begin=$('#begin-session-button');if(check)check.checked=false;if(begin)begin.disabled=true;
}
function renderSetupControl(selector){render();$(selector)?.focus({preventScroll:true});}
function changeSetupMode(type){
 if(state.setup.programLoad||!sessionModeKeys(state.setup.purpose).includes(type))return;
 state.setup.type=type;resetSetupAcceptance();renderSetupControl('#setup-mode');
}
function setupStepper(value,{id,action,attrs='',label,min,max,current}){
 return `<div class="stepper" role="group" aria-label="${label}"><button id="${id}-minus" data-action="${action}" data-delta="-1" ${attrs} aria-label="Lower ${label}" ${current<=min?'disabled':''}>${icon('minus','icon-sm')}</button><output aria-live="polite">${value}</output><button id="${id}-plus" data-action="${action}" data-delta="1" ${attrs} aria-label="Raise ${label}" ${current>=max?'disabled':''}>${icon('plus','icon-sm')}</button></div>`;
}
function setupNumberField(key,label,unit,min,max,step=1,help=''){
 const value=state.setup[key];
 return `<div class="setup-field"><span class="setup-label">${label}</span>${setupStepper(value+unit,{id:'setup-'+key,action:'setup-step',attrs:`data-key="${key}" data-step="${step}" data-min="${min}" data-max="${max}"`,label:label.toLowerCase(),min,max,current:value})}${help?`<p class="setup-help">${help}</p>`:''}</div>`;
}
function setupForceField(help){
 const cfg=state.setup,p=person();
 if(cfg.programLoad)return `<div class="setup-field"><span class="setup-label">Target force</span><strong>Set by program</strong><p class="setup-help">Review each angle below.</p></div>`;
 return `<div class="setup-field setup-force-field"><label class="setup-label" for="target-weight">Target force</label><div class="weight-input"><input id="target-weight" type="number" required min="1" max="50" step="0.5" value="${cfg.weight}" inputmode="decimal"><span>kg</span></div><p class="setup-help" id="force-source">${cfg.forceEdited?'For this session':help||(p.target?'From strength assessment · '+p.last:'No previous assessment. Demo starting value.')}</p></div>`;
}
function setupAutoChallenge(weight){return Math.max(.5,weight-1);}
function setupChallengeField(help){const cfg=state.setup,max=cfg.type==='rom'?5:Math.max(.5,cfg.type==='isokinetic'?cfg.weight-.5:Math.min(10,cfg.weight-.5));return setupNumberField('challenge','Challenge weight',' kg',.5,max,.5,help);}
function setupModeFields(){
 const cfg=state.setup;
 if(cfg.type==='strength')return setupForceField()+setupChallengeField('Counting starts above this, so noise can’t start a rep.')+setupNumberField('holdSeconds','Hold time',' s',2,15,1,'The rep ends when the timer runs out.');
 if(cfg.type==='endurance')return setupForceField('A guide to aim for. The result is how long they hold.')+setupChallengeField('Counting starts above this, so noise can’t start a rep.');
 if(cfg.type==='eccentric')return setupForceField('The line to stay near while resisting.')+setupChallengeField('Safety stop, always on: the device stops if force falls below this.')+`<div class="setup-field"><span class="setup-label" id="speed-label">Speed</span><div class="segmented" role="group" aria-labelledby="speed-label">${Object.entries(eccentricSpeeds).map(([key,speed])=>`<button id="setup-speed-${key}" class="${cfg.eccSpeed===key?'active':''}" data-action="setup-speed" data-value="${key}" aria-pressed="${cfg.eccSpeed===key}">${speed.label}</button>`).join('')}</div><p class="setup-help">How fast the device moves the pad.</p></div>`+setupNumberField('eccCap','Force cap',' kg',Math.ceil(cfg.weight)||1,75,1,'The rep stops if force goes above this.');
 if(cfg.type==='rom')return `<input id="target-weight" type="hidden" value="${cfg.weight}">`+setupNumberField('romStart','Start tilt','°',0,cfg.romMax-1,1)+setupNumberField('romMax','Max tilt','°',cfg.romStart+1,SETUP_MAX_TILT,1,'Safety limit. The pad never goes past it.')+setupChallengeField('Light push needed before movement counts.');
 return setupForceField()+setupChallengeField(cfg.challengeAuto?'<span id="challenge-auto-note">Auto: 1 kg under target.</span> The pad moves only while they push above this.':'Set by hand. <button class="text-button" data-action="challenge-auto" id="challenge-auto">Back to auto</button>')+setupNumberField('challengeHold','Stop if below for',' s',1,5,1,'The pad stops after this long under the challenge weight.');
}
function setupRule(key,on,text,control,fixed=false){return `<div class="setup-rule">${fixed?`<span class="setup-rule-fixed" aria-hidden="true">${icon('check','icon-sm')}</span>`:`<input id="rule-${key}" type="checkbox" data-setup-toggle="${key}" ${on?'checked':''} aria-label="${text}">`}<label ${fixed?'':`for="rule-${key}"`}>${text}</label>${control}</div>`;}
function setupFinishRules(){
 const cfg=state.setup;
 if(cfg.type==='endurance')return `<section class="setup-rules" aria-labelledby="setup-rules-title"><h2 id="setup-rules-title">Finish the rep when</h2><div class="setup-rule-row">${setupRule('endDrop',true,'Force drops',setupStepper(cfg.endDrop+'%',{id:'setup-endDrop',action:'setup-step',attrs:'data-key="endDrop" data-step="5" data-min="5" data-max="50"',label:'force drop',min:5,max:50,current:cfg.endDrop})+'<span>below their hold</span>',true)}${setupRule('endCapOn',cfg.endCapOn,'Stop anyway after',setupStepper(cfg.endCap+' s',{id:'setup-endCap',action:'setup-step',attrs:'data-key="endCap" data-step="10" data-min="30" data-max="300"',label:'maximum time',min:30,max:300,current:cfg.endCap}))}</div><p class="setup-help">Uses the average force for each second. Their hold is the average of the steady seconds, so 10, 10, 10 then 8 ends the rep. The ramp up is not counted. No countdown.</p></section>`;
 if(cfg.type==='rom')return `<section class="setup-rules" aria-labelledby="setup-rules-title"><h2 id="setup-rules-title">Finish the rep when</h2><div class="setup-rule-row">${setupRule('romStillOn',cfg.romStillOn,'No movement for',setupStepper(cfg.romStill+' s',{id:'setup-romStill',action:'setup-step',attrs:'data-key="romStill" data-step="1" data-min="1" data-max="5"',label:'no movement time',min:1,max:5,current:cfg.romStill}))}${setupRule('romDropOn',cfg.romDropOn,'Force drops by',setupStepper(cfg.romDrop+'%',{id:'setup-romDrop',action:'setup-step',attrs:'data-key="romDrop" data-step="5" data-min="5" data-max="50"',label:'force drop',min:5,max:50,current:cfg.romDrop}))}</div><p class="setup-help">Whichever happens first, using the average for each second. The coach can always stop a rep by hand. No target force.</p></section>`;
 return '';
}
function setupDirectionGlyph(angle){
 const r=angle*Math.PI/180,x=20+13*Math.sin(r),y=20-13*Math.cos(r);
 return `<svg class="tilt-glyph" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle class="glyph-ring" cx="20" cy="20" r="13"/><path class="glyph-head" d="M20 12.5c-3.6 0-5.6 3-5.6 7.5s2 7.5 5.6 7.5 5.6-3 5.6-7.5-2-7.5-5.6-7.5z"/><path class="glyph-head" d="M18.4 12.9 20 10.6l1.6 2.3"/><circle class="glyph-dot" cx="${x}" cy="${y}" r="4.5"/></svg>`;
}
function setupTiltRow(angle){
 const cfg=state.setup,tilt=setupTilt(angle),kind=setupTiltKind(),name=setupDirectionNames[angle],valid=validTilt(tilt),pct=value=>Math.max(0,Math.min(100,value/SETUP_MAX_TILT*100));
 const step=(field,value,label)=>setupStepper((value??'–')+'°',{id:`tilt-${angle}-${field}`,action:'tilt-step',attrs:`data-angle="${angle}" data-field="${field}"`,label:`${name} ${label}`,min:0,max:SETUP_MAX_TILT,current:value});
 const lo=Math.min(tilt.start,tilt.end??tilt.start),hi=Math.max(tilt.start,tilt.end??tilt.start);
 const controls=kind==='fixed'?step('start',tilt.start,'tilt'):`${step('start',tilt.start,'start tilt')}<span class="tilt-to" aria-hidden="true">${icon('arrow','icon-sm')}</span>${step('end',tilt.end,kind==='limit'?'max tilt':'end tilt')}`;
 const bar=kind==='fixed'?`<div class="tilt-track"><span class="tilt-marker" style="left:${pct(tilt.start)}%"></span></div><div class="tilt-scale"><span>0°</span><span>fixed at ${tilt.start}°</span><span>${SETUP_MAX_TILT}°</span></div>`:`<div class="tilt-track"><span class="tilt-span" style="left:${pct(lo)}%;width:${pct(hi-lo)}%"></span></div><div class="tilt-scale"><span>0°</span><span>${valid?`${hi-lo}° ${kind==='limit'?'allowed':'of travel'}`:'Check tilt'}</span><span>${SETUP_MAX_TILT}°</span></div>`;
 return `<div class="tilt-row ${valid?'':'invalid'}" role="row"><div class="tilt-direction" role="rowheader">${setupDirectionGlyph(angle)}<strong>${name}</strong><span>${angle}°</span></div><div class="tilt-controls" role="cell">${controls}</div><div class="tilt-bar" role="cell" aria-hidden="true">${bar}</div><div class="tilt-state" role="cell">${tilt.changed?`<button id="tilt-${angle}-reset" class="text-button tilt-changed" data-action="reset-direction-tilt" data-angle="${angle}" aria-label="Reset ${name} to default">Changed · Reset</button>`:`<span>${tilt.source}</span>`}</div></div>`;
}
function setupView(){
 setupModeDefaults();
 const cfg=state.setup,kind=setupTiltKind(),angles=currentAngles(),purpose=cfg.purpose==='assessment'?'assessment':'training',invalid=angles.some(angle=>!validTilt(setupTilt(angle)));
 const anyChanged=angles.some(angle=>cfg.tiltOverrides?.[cfg.type]?.[angle]);
 const columns=kind==='fixed'?['Tilt','Pad position']:kind==='travel'?['Start tilt → End tilt','Travel']:kind==='return'?['Start tilt → End tilt','Travel · device moves back']:['Start tilt → Max tilt','Allowed travel'];
 const note=kind==='fixed'?'The pad stays at this tilt for the whole rep.':kind==='travel'?'The pad travels from start tilt to end tilt on each rep.':kind==='return'?'The device moves the pad from start tilt back to end tilt. The person resists.':`All ${angles.length===4?'four':'eight'} use the start and max above unless you change a row.`;
 return `<div class="setup-page setup-kind-${kind} ${angles.length>4?'setup-dense':''}">
 <div class="session-title setup-heading"><div><div class="setup-title-row"><h1>${sessionModes[cfg.type].name} ${purpose}</h1>${cfg.type==='eccentric'?'<span class="badge setup-new">New</span>':''}${cfg.programLoad?'':`<label class="setup-change"><span>Change mode</span><select id="setup-mode" aria-label="Change mode">${sessionModeKeys(cfg.purpose).map(key=>`<option value="${key}" ${cfg.type===key?'selected':''}>${sessionModes[key].name}</option>`).join('')}</select></label>`}</div><p>${cfg.continuing?`${escapeHTML(cfg.programName)} · Session ${cfg.programSession} of ${cfg.programTotal} · `:''}${setupModeLine[cfg.type]}</p></div><span class="badge neutral">Session setup</span></div>
 <section class="setup-strip" aria-label="Session settings">
  <div class="setup-field"><span class="setup-label" id="directions-label">Directions</span><div class="segmented" role="group" aria-labelledby="directions-label">${[4,8].map(n=>`<button id="setup-count-${n}" class="${cfg.positions===n?'active':''}" data-action="setup-positions" data-value="${n}" aria-pressed="${cfg.positions===n}">${n}</button>`).join('')}</div></div>
  <div class="setup-field"><span class="setup-label" id="reps-label">Reps per direction</span><div class="stepper" role="group" aria-labelledby="reps-label"><button id="reps-minus" data-action="reps-minus" aria-label="Fewer reps" ${cfg.reps<=1?'disabled':''}>${icon('minus','icon-sm')}</button><output aria-live="polite">${cfg.reps}</output><button id="reps-plus" data-action="reps-plus" aria-label="More reps" ${cfg.reps>=5?'disabled':''}>${icon('plus','icon-sm')}</button></div></div>
  ${setupModeFields()}
 </section>
 ${programSetupPanel()}${setupFinishRules()}
 <section class="setup-tilts" aria-labelledby="setup-directions-title"><div class="setup-tilts-heading"><div><h2 id="setup-directions-title">${kind==='limit'?'By direction':'Tilt by direction'}</h2><p>${note}</p></div>${kind==='limit'?button('Reset all rows','tilt-reset-all','small-button',`id="tilt-all" ${anyChanged?'':'disabled'}`):button(`Apply ${setupDirectionNames[angles[0]]} to all`,'tilt-apply-all','small-button','id="tilt-all"')}</div>
  <div class="tilt-table" role="table" aria-label="Tilt for each direction"><div class="tilt-head" role="row"><span role="columnheader">Direction</span><span role="columnheader">${columns[0]}</span><span role="columnheader">${columns[1]}</span><span role="columnheader"></span></div>${angles.map(setupTiltRow).join('')}</div>
  <p class="tilt-error" id="tilt-error" role="status" ${invalid?'':'hidden'}>${kind==='return'?'For each direction, the end tilt must be lower than the start tilt.':kind==='fixed'?`Enter a tilt between 0° and ${SETUP_MAX_TILT}°.`:`For each direction, the ${kind==='limit'?'max':'end'} tilt must be higher than the start tilt.`}</p>
 </section>
 <footer class="setup-start"><div class="setup-total"><strong>${cfg.positions*cfg.reps} ${cfg.positions*cfg.reps===1?'rep':'reps'}</strong> · ${cfg.positions} directions × ${cfg.reps} ${cfg.reps===1?'rep':'reps'}<small>${!state.deviceReady?'Station unavailable. Check station readiness before starting.':setupEndsText()+' · Simulated device'}</small></div><label class="check-label"><input id="accept-settings" type="checkbox" ${cfg.accepted?'checked':''}><span>I’ve reviewed these settings</span></label>${button('Begin session '+icon('play','icon-sm'),'start-session','primary',`${!cfg.accepted||!state.deviceReady||!setupIsValid()?'disabled':''} id="begin-session-button"`)}</footer></div>`;
}
function setTiltOverride(angle,values){const cfg=state.setup;cfg.tiltOverrides??={};cfg.tiltOverrides[cfg.type]??={};cfg.tiltOverrides[cfg.type][angle]=values;}
const setupActions={
 'tilt-step':el=>{
  const angle=Number(el.dataset.angle),field=el.dataset.field,current=setupTilt(angle);if(!currentAngles().includes(angle)||!['start','end'].includes(field))return;
  const base=Number.isFinite(current[field])?current[field]:0,next=Math.max(0,Math.min(SETUP_MAX_TILT,base+Number(el.dataset.delta)));
  setTiltOverride(angle,{...tiltValues(current),[field]:next});resetSetupAcceptance();renderSetupControl('#'+el.id);if($('#'+el.id)?.disabled)$(`#tilt-${angle}-${field}-${Number(el.dataset.delta)>0?'minus':'plus'}`)?.focus({preventScroll:true});
 },
 'setup-step':el=>{
  const key=el.dataset.key,cfg=state.setup;if(!['holdSeconds','endDrop','endCap','romStart','romMax','romStill','romDrop','eccCap','challenge','challengeHold'].includes(key))return;
  if(key==='challenge')cfg.challengeAuto=false;cfg[key]=Math.max(Number(el.dataset.min),Math.min(Number(el.dataset.max),cfg[key]+Number(el.dataset.delta)*Number(el.dataset.step)));
  resetSetupAcceptance();renderSetupControl('#'+el.id);if($('#'+el.id)?.disabled)$(`#setup-${key}-${Number(el.dataset.delta)>0?'minus':'plus'}`)?.focus({preventScroll:true});
 },
 'challenge-auto':()=>{state.setup.challengeAuto=true;resetSetupAcceptance();renderSetupControl('#setup-challenge-plus');},
 'setup-speed':el=>{if(!eccentricSpeeds[el.dataset.value])return;state.setup.eccSpeed=el.dataset.value;resetSetupAcceptance();renderSetupControl('#'+el.id);},
 'tilt-apply-all':()=>{const angles=currentAngles(),source=tiltValues(setupTilt(angles[0]));angles.forEach(angle=>setTiltOverride(angle,{...source}));resetSetupAcceptance();renderSetupControl('#tilt-all');toast(`${setupDirectionNames[angles[0]]} tilt applied to every direction.`);},
 'tilt-reset-all':()=>{const cfg=state.setup;if(cfg.tiltOverrides)delete cfg.tiltOverrides[cfg.type];resetSetupAcceptance();renderSetupControl('#tilt-all');},
 'reset-direction-tilt':el=>{const angle=Number(el.dataset.angle),overrides=state.setup.tiltOverrides?.[state.setup.type];if(overrides)delete overrides[angle];resetSetupAcceptance();renderSetupControl(`#tilt-${angle}-start-plus`);}
};
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='setup-mode')changeSetupMode(el.value);
 else if(state.stage==='setup'&&el.dataset.setupToggle&&['endCapOn','romStillOn','romDropOn'].includes(el.dataset.setupToggle)){state.setup[el.dataset.setupToggle]=el.checked;resetSetupAcceptance();renderSetupControl('#'+el.id);}
});
document.addEventListener('input',event=>{
 const el=event.target;if(state.stage!=='setup'||el.id!=='target-weight')return;
 state.setup.forceEdited=true;const source=$('#force-source');if(source)source.textContent='For this session';
 const weight=Number(el.value),shown=$('#setup-challenge-minus')?.parentElement.querySelector('output');
 if(state.setup.challengeAuto&&shown&&Number.isFinite(weight)&&weight>=1)shown.textContent=setupAutoChallenge(weight)+' kg';
});
