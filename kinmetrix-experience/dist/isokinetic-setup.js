/* Split session setup: session decisions, optional tilt detail, live direction plan. */
const splitSetupTypes=new Set(['isokinetic','strength','eccentric']);
function splitSetupUsesSplitLayout(type=state.setup.type){return splitSetupTypes.has(type);}
function isokForce(angle){const c=state.setup;return c.programLoad?c.targets?.[angle]:c.weight;}
function isokForceText(value){return Number.isFinite(value)&&value>=.5&&value<=50?`${Number(value.toFixed(1))} kg`:'—';}
function isokTiltSummary(){
 const angles=currentAngles(),groups=new Map();
 for(const a of angles){const label=setupTiltText(a);groups.set(label,[...(groups.get(label)||[]),setupDirectionNames[a]]);}
 if(groups.size===1)return [...groups.keys()][0]+' in every direction';
 const changed=angles.filter(a=>setupTilt(a).changed).length;
 if(changed)return `${changed} direction${changed===1?'':'s'} adjusted`;
 return angles.some(a=>setupTilt(a).source==='Coach applied')?'Coach-applied ranges':setupTiltKind()==='fixed'?'Default pad positions':'5–33° · Rear directions 10–33°';
}
function splitRangeSummaryLabel(){return setupTiltKind()==='fixed'?'Pad position':'Tilt range';}
function isokineticDiagram(){
 const c=state.setup,angles=currentAngles(),active=c.isokTab==='tilts'?c.angle:null;
 const xy=(a,r)=>[220+Math.sin(a*Math.PI/180)*r,212-Math.cos(a*Math.PI/180)*r];
 const lines=angles.map(a=>{const p=xy(a,142),q=xy(a,57);return `<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" class="isok-spoke ${a===active?'selected':''}"/>`;}).join('');
 const nodeDetail=setupTiltKind()==='fixed'?angle=>setupTiltText(angle):angle=>isokForceText(isokForce(angle));
 return `<div class="isok-radial" role="group" aria-label="${angles.length} directions, ${c.reps} reps per direction. Tap a direction for ${setupHasFixedTilt()?'pad position':'tilt'} settings."><svg viewBox="0 0 440 424" aria-hidden="true"><circle class="isok-orbit" cx="220" cy="212" r="142"/>${lines}${personOrientation(220,212,1.3)}</svg>${angles.map(a=>{const p=xy(a,151);return `<button type="button" class="isok-node ${a===active?'selected':''}" style="left:${p[0]/440*100}%;top:${p[1]/424*100}%" data-action="isok-direction" data-angle="${a}" aria-label="${setupDirectionNames[a]}, ${a} degrees, ${c.reps} reps, ${setupHasFixedTilt()?'position '+setupTiltText(a):'target '+isokForceText(isokForce(a))}. Edit ${setupHasFixedTilt()?'position':'tilt'}." aria-pressed="${a===active}"><strong>${a}°</strong><span>${nodeDetail(a)}</span><span class="isok-rep-marks" aria-hidden="true">${Array.from({length:c.reps},()=>'<i></i>').join('')}</span></button>`;}).join('')}</div>`;
}
function splitDiagramHelp(){
 const kind=setupTiltKind();
 if(kind==='fixed')return 'Each mark is one rep. Tap a direction to set pad position.';
 if(kind==='return')return 'Each mark is one rep. Tap a direction to review the return path.';
 return 'Each mark is one rep. Tap a direction to review its tilt.';
}
function isokineticPreview(){
 const c=state.setup,total=c.positions*c.reps;
 return `<header class="isok-preview-heading"><h2>Your session</h2><p>${c.positions} directions × ${c.reps} reps <strong>${total} reps total</strong></p></header>${isokineticDiagram()}<p class="isok-diagram-help">${splitDiagramHelp()}</p><button type="button" class="isok-range-summary" data-action="isok-tab" data-value="tilts"><span>${splitRangeSummaryLabel()}</span><strong>${isokTiltSummary()}</strong>${icon('chevron','icon-sm')}</button>`;
}
function isokTiltPanel(){
 const c=state.setup,a=currentAngles().includes(c.angle)?c.angle:0,t=setupTilt(a),kind=setupTiltKind();c.angle=a;
 const step=(field,label)=>`<div><span class="setup-label">${label}</span>${setupStepper(t[field],{id:`tilt-${a}-${field}`,action:'tilt-step',attrs:`data-angle="${a}" data-field="${field}"`,label:`${setupDirectionNames[a]} ${label.toLowerCase()}`,min:0,max:SETUP_MAX_TILT,current:t[field],unit:'°'})}</div>`;
 const intro=kind==='fixed'?'Pad position for each direction. The pad stays at this angle for the whole rep.':kind==='return'?'Start and end positions for the return path. The device moves the pad from start toward end; the person resists.':'Start and end positions of the pad. These are tilt angles, separate from the directions around the head.';
 const fields=kind==='fixed'?step('start','Pad tilt'):`${step('start','Start tilt')}${step('end','End tilt')}`;
 const help=kind==='fixed'?`${t.start}° for each rep.`:kind==='return'?validTilt(t)?`${t.start-t.end}° of return travel on each rep.`:'End tilt must be lower than start tilt.':validTilt(t)?`${t.end-t.start}° of travel on each rep.`:'End tilt must be higher than start tilt.';
 return `<p class="isok-panel-intro">${intro}</p><label class="isok-direction-select"><span class="setup-label">Direction</span><select id="isok-tilt-direction">${currentAngles().map(angle=>`<option value="${angle}" ${a===angle?'selected':''}>${angle}° · ${setupDirectionNames[angle]} — ${setupTiltText(angle)}</option>`).join('')}</select></label><div class="isok-tilt-editor"><div class="isok-editor-heading"><h2>${a}° · ${setupDirectionNames[a]}</h2><span>${t.source}</span></div><div class="isok-tilt-fields">${fields}</div><p class="${validTilt(t)?'setup-help':'tilt-error'}" role="status">${help}</p><div class="isok-tilt-actions">${button('Apply to all directions','tilt-apply-selected','small-button','id="tilt-all"')}${t.changed?button('Reset this direction','reset-direction-tilt','text-button',`data-angle="${a}" id="tilt-${a}-reset"`):''}</div></div>`;
}
function splitModeFieldsBlock(forceHelp){
 const c=state.setup;
 if(c.type==='strength')return setupHoldStyleField()+setupForceField(isometricHoldStyle(c)==='timed'?(forceHelp||''):'A guide to aim for. The result is how long they hold.')+setupChallengeField('Counting starts above this, so noise can’t start a rep.');
 if(c.type==='eccentric')return setupForceField(forceHelp||'The line to stay near while resisting.')+setupChallengeField('Safety stop, always on: the device stops if force falls below this.')+`<div class="setup-field"><span class="setup-label" id="speed-label">Speed</span><div class="segmented" role="group" aria-labelledby="speed-label">${Object.entries(eccentricSpeeds).map(([key,speed])=>`<button id="setup-speed-${key}" class="${c.eccSpeed===key?'active':''}" data-action="setup-speed" data-value="${key}" aria-pressed="${c.eccSpeed===key}">${speed.label}</button>`).join('')}</div><p class="setup-help">How fast the device moves the pad.</p></div>`+setupNumberField('eccCap','Force cap',' kg',Math.ceil(c.weight)||1,75,1,'The rep stops if force goes above this.');
 return c.programLoad?`<div class="isok-program-source"><span class="setup-label">Target force</span><strong>Set by program, per direction</strong><p class="setup-help">${programLoadLabel({load:c.programLoad})}. Targets shown on the diagram.</p>${programTargetsValid()?'':'<p class="tilt-error">Targets are missing for one or more directions. Review the program before starting.</p>'}</div>`:setupForceField(forceHelp);
}
function splitDuringRepSection(){
 const c=state.setup;
 if(c.type==='isokinetic')return `<div class="isok-movement"><h2>During each rep</h2><p>Push against the pad as it moves through the set tilt range. The rep ends at the end tilt.</p><div id="isok-stop-summary">${isokStopSummary()}</div><details class="isok-thresholds" ${c.isokRulesOpen?'open':''}><summary>Adjust movement threshold</summary><div class="isok-rule-fields">${setupChallengeField(c.challengeAuto?'Auto: 1 kg below target.':'Set for this session. <button class="text-button" data-action="challenge-auto" id="challenge-auto">Use automatic threshold</button>')}${setupNumberField('challengeHold','Stop if below for','s',1,5,1)}</div></details></div>`;
 if(c.type==='eccentric')return `<div class="isok-movement"><h2>During each rep</h2><p>Resist as the device moves the pad from start tilt back to end tilt. The rep ends when the pad reaches the end tilt.</p><p class="setup-help">${eccentricSpeeds[c.eccSpeed].label} return speed · Force must stay above ${isokForceText(c.challenge)} or the device stops.</p></div>`;
 const endurance=isIsometricEndurance(c);
 return `<div class="isok-movement"><h2>During each rep</h2><p>${endurance?setupModeLine.endurance:'Build to the target and hold. The pad stays fixed.'}</p>${endurance?setupFinishRules():`<p class="setup-help">Each rep ends after <strong>${c.holdSeconds} s</strong> on the timer.</p>`}</div>`;
}
function isokSessionPanel(forceHelp){
 return `${splitMainFields(forceHelp)}${programSetupPanel()}${splitDuringRepSection()}`;
}
function splitMainFields(forceHelp){
 const c=state.setup;
 return `<div class="isok-main-fields"><div class="setup-field"><span class="setup-label" id="directions-label">Directions</span><div class="segmented" role="group" aria-labelledby="directions-label">${[4,8].map(n=>`<button id="setup-count-${n}" class="${c.positions===n?'active':''}" data-action="setup-positions" data-value="${n}" aria-pressed="${c.positions===n}">${n} directions</button>`).join('')}</div></div><div class="setup-field"><span class="setup-label" id="reps-label">Reps per direction</span><div class="stepper" role="group" aria-labelledby="reps-label"><button id="reps-minus" data-action="reps-minus" aria-label="Fewer reps" ${c.reps<=1?'disabled':''}>${icon('minus','icon-sm')}</button><output class="stepper-value">${c.reps}</output><button id="reps-plus" data-action="reps-plus" aria-label="More reps" ${c.reps>=5?'disabled':''}>${icon('plus','icon-sm')}</button></div></div>${splitModeFieldsBlock(forceHelp)}</div>`;
}
function isokStopSummary(){const c=state.setup;return `<p class="isok-stop-copy">Movement starts above <strong>${isokForceText(c.challenge)}</strong>. The pad stops if effort stays below this for <strong>${c.challengeHold} s</strong>.</p>`;}
function isokineticSetupView(){
 const team=isTeamAssessmentSetupContext(),c=state.setup,tab=c.isokTab==='tilts'?'tilts':'session',bad=currentAngles().some(a=>!validTilt(setupTilt(a))),purpose=c.purpose==='assessment'?'assessment':'session',mode=sessionModes[c.type];
 const sub=team?'Team defaults for new assessments. Members still review tilts before Begin.':c.continuing?`${escapeHTML(c.programName)} · Session ${c.programSession} of ${c.programTotal}`:c.type==='strength'?setupIsometricModeLine(c):setupModeLine[c.type];
 const title=team?'Assessment protocol · '+mode.name:c.type==='strength'?`Isometric ${purpose}`:`${mode.name} ${purpose}`;
 const tiltTab=setupHasFixedTilt()?'Positions':'Tilts';
 const invalidCopy=setupHasFixedTilt()?'Review the invalid position in Positions before starting.':'Review the invalid range in Tilts before starting.';
 const readyCopy=team?`Starting value when no member baseline exists. ${bad?invalidCopy:'Save when you are done.'}`:!state.deviceReady?'Device unavailable. Mark it ready in Device before starting.':bad?invalidCopy:`${mode.name} ${purpose}`;
 const modeSelect=c.programLoad||c.type==='rom'?'':`<label class="setup-change"><span>Change mode</span><select id="setup-mode" aria-label="Change exercise mode">${standardExerciseModeKeys(c.purpose).map(key=>`<option value="${key}" ${c.type===key?'selected':''}>${sessionModes[key].name}</option>`).join('')}</select></label>`;
 const footer=team?`<p class="isok-team-save-note">Use <strong>Save</strong> above. These defaults apply when you start an assessment without a program.</p>`:`<footer class="isok-start"><div class="isok-commit"><strong>${c.positions*c.reps} reps · ${c.positions} directions</strong><span>${readyCopy}</span></div><label class="check-label"><input id="accept-settings" type="checkbox" ${c.accepted?'checked':''}><span>I’ve reviewed these settings</span></label>${button('Begin session','start-session','primary',`${!c.accepted||!state.deviceReady||!setupIsValid()?'disabled':''} id="begin-session-button"`)}</footer>`;
 const forceHelp=team?'Starting target when no member baseline exists.':undefined;
 return `<div class="setup-page isok-setup ${team?'isok-setup--team':''}"><header class="session-title setup-heading"><div><div class="setup-title-row"><h1>${title}</h1>${team?'':c.type==='eccentric'?'<span class="badge setup-new">New</span>':''}${modeSelect}</div><p>${c.type==='strength'&&isIsometricEndurance(c)?'Endurance · ':''}${sub}</p></div></header><div class="isok-split"><section class="isok-controls" aria-label="Session setup"><div class="isok-tabs" role="tablist" aria-label="Setup sections">${[['session','Session'],['tilts',tiltTab]].map(([key,label])=>`<button role="tab" id="isok-tab-${key}" data-action="isok-tab" data-value="${key}" aria-selected="${tab===key}" aria-controls="isok-panel-${key}" tabindex="${tab===key?0:-1}">${label}${key==='tilts'&&bad?'<span class="isok-tab-error">Check</span>':''}</button>`).join('')}</div><div id="isok-panel-${tab}" role="tabpanel" aria-labelledby="isok-tab-${tab}">${tab==='session'?isokSessionPanel(forceHelp):isokTiltPanel()}</div></section><section class="isok-preview" id="isok-preview" aria-label="Session preview">${isokineticPreview()}</section></div>${footer}</div>`;
}
function refreshSplitSetupPreview(){
 if(!isSetupStageContext()||!splitSetupUsesSplitLayout())return;
 setupModeDefaults();
 const preview=$('#isok-preview');if(preview)preview.innerHTML=isokineticPreview();
 const stop=$('#isok-stop-summary');if(stop)stop.innerHTML=isokStopSummary();
 const fields=$('.isok-rule-fields');if(fields&&state.setup.type==='isokinetic')fields.innerHTML=setupChallengeField(state.setup.challengeAuto?'Auto: 1 kg below target.':'Set for this session. <button class="text-button" data-action="challenge-auto" id="challenge-auto">Use automatic threshold</button>')+setupNumberField('challengeHold','Stop if below for','s',1,5,1);
}
Object.assign(setupActions,{
 'isok-tab':el=>{state.setup.isokTab=el.dataset.value==='tilts'?'tilts':'session';if(isTeamAssessmentSetupContext())directoryUI().programs.teamTab=state.setup.isokTab;renderSetupControl('#isok-tab-'+state.setup.isokTab);},
 'isok-direction':el=>{state.setup.angle=Number(el.dataset.angle);state.setup.isokTab='tilts';if(isTeamAssessmentSetupContext())directoryUI().programs.teamAngle=state.setup.angle;renderSetupControl('#isok-tab-tilts');},
 'tilt-apply-selected':()=>{const a=state.setup.angle||0,source=tiltValues(setupTilt(a));currentAngles().forEach(angle=>setTiltOverride(angle,{...source}));resetSetupAcceptance();renderSetupControl('#tilt-all');toast(`${setupDirectionNames[a]} applied to every direction.`);}
});
document.addEventListener('keydown',event=>{
 if(!event.target.matches?.('.isok-tabs [role="tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const key=event.key==='Home'?'session':event.key==='End'?'tilts':state.setup.isokTab==='tilts'?'session':'tilts';state.setup.isokTab=key;renderSetupControl('#isok-tab-'+key);
});
document.addEventListener('toggle',event=>{if(event.target.matches?.('.isok-thresholds')&&isSetupStageContext())state.setup.isokRulesOpen=event.target.open;},true);
document.addEventListener('input',event=>{
 if(event.target.id!=='target-weight')return;
 if(!isSetupStageContext()||!splitSetupUsesSplitLayout())return;
 state.setup.weight=event.target.valueAsNumber;
 refreshSplitSetupPreview();
});
document.addEventListener('change',event=>{if(event.target.id==='isok-tilt-direction'){state.setup.angle=Number(event.target.value);renderSetupControl('#isok-tilt-direction');}});