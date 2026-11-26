/* Split session setup: session decisions, optional tilt detail, live direction plan. */
const splitSetupTypes=new Set(['isokinetic','strength','eccentric','rom']);
function splitSetupUsesSplitLayout(type=state.setup.type){return splitSetupTypes.has(type);}
function isokForce(angle){const c=state.setup;return c.programLoad?c.targets?.[angle]:c.weight;}
function isokForceText(value){return Number.isFinite(value)&&value>=.5&&value<=50?`${Number(value.toFixed(1))} kg`:'—';}
function isokTiltSummary(){
 const angles=currentAngles(),groups=new Map();
 for(const a of angles){const label=setupTiltText(a);groups.set(label,[...(groups.get(label)||[]),setupDirectionNames[a]]);}
 if(groups.size===1)return [...groups.keys()][0]+' in every direction';
 const changed=angles.filter(a=>setupTilt(a).changed).length;
 if(changed)return `${changed} direction${changed===1?'':'s'} adjusted`;
 return angles.some(a=>setupTilt(a).source==='Coach applied')?'Coach-applied ranges':setupTiltKind()==='fixed'?'Default':'5–33° · Rear directions 10–33°';
}
function splitRangeSummaryLabel(){const kind=setupTiltKind();return kind==='fixed'?'Pad position':kind==='limit'?'Range limits':'Tilt range';}
function splitNodeDetail(){const kind=setupTiltKind();return setupHasFixedTilt()||kind==='limit'?angle=>setupTiltText(angle):angle=>isokForceText(isokForce(angle));}
function isokineticDiagram(){
 const c=state.setup,angles=currentAngles(),active=c.isokTab==='tilts'?c.angle:null,kind=setupTiltKind(),nodeDetail=splitNodeDetail();
 const xy=(a,r)=>[220+Math.sin(a*Math.PI/180)*r,212-Math.cos(a*Math.PI/180)*r];
 const lines=angles.map(a=>{const p=xy(a,142),q=xy(a,57);return `<line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" class="isok-spoke ${a===active?'selected':''}"/><line x1="${q[0]}" y1="${q[1]}" x2="${p[0]}" y2="${p[1]}" class="isok-spoke-hit" data-action="isok-direction" data-angle="${a}"/>`;}).join('');
 const workload=kind==='limit'?'one movement per direction':`${c.reps} reps per direction`;
 const editWhat=setupHasFixedTilt()?'pad position':kind==='limit'?'start and max tilt':'tilt';
 return `<div class="isok-radial" role="group" aria-label="${angles.length} directions, ${workload}. Tap a direction for ${editWhat} settings."><svg viewBox="0 0 440 424" aria-hidden="true"><circle class="isok-orbit" cx="220" cy="212" r="142"/>${lines}${personOrientation(220,212,1.3)}</svg>${angles.map(a=>{const p=xy(a,151);const nodeLabel=setupHasFixedTilt()?'position '+setupTiltText(a):kind==='limit'?'limit '+setupTiltText(a):'target '+isokForceText(isokForce(a));return `<button type="button" class="isok-node ${a===active?'selected':''}" style="left:${p[0]/440*100}%;top:${p[1]/424*100}%" data-action="isok-direction" data-angle="${a}" aria-label="${setupDirectionNames[a]}, ${a} degrees, ${kind==='limit'?'1 movement':c.reps+' reps'}, ${nodeLabel}. Edit ${editWhat}." aria-pressed="${a===active}"><strong>${a}°</strong><span>${nodeDetail(a)}</span><span class="isok-rep-marks" aria-hidden="true">${Array.from({length:c.reps},()=>'<i></i>').join('')}</span></button>`;}).join('')}</div>`;
}
function splitDiagramHelp(){
 const kind=setupTiltKind();
 if(kind==='fixed')return 'Each mark is one rep. Tap a direction to set pad position.';
 if(kind==='limit')return 'Tap a direction to set start and max tilt.';
 if(kind==='return')return 'Each mark is one rep. Tap a direction to review the return path.';
 return 'Each mark is one rep. Tap a direction to review its tilt.';
}
function teamProtocolRepExplainerMarkup(){
 const c=state.setup;
 if(!isTeamAssessmentSetupContext())return '';
 let how='';
 if(c.type==='rom'){
  how=setupModeLine.rom;
 }else if(c.type==='strength'){
  const endurance=isIsometricEndurance(c);
  how=endurance?setupModeLine.endurance:`Hold at target · <strong>${c.holdSeconds} s</strong> per rep.`;
 }else if(c.type==='isokinetic'){
  how='Push through the tilt range; rep ends at end tilt.';
 }else if(c.type==='eccentric'){
  how='Resist the return to end tilt.';
 }
 return `<div class="protocol-rep-explainer"><p>${how}</p></div>`;
}
function isokineticPreview(options={}){
 const {title='Your session',headingId='',showRangeSummary=true,card=false}=options;
 const c=state.setup,total=c.positions*c.reps,kind=setupTiltKind();
 if(card){
  const sum=kind==='limit'
   ?`<p class="preview-sum"><span>${c.positions} directions</span> · 1 movement each</p>`
   :`<p class="preview-sum"><span>${c.positions} directions</span> × <span>${c.reps} ${c.reps===1?'rep':'reps'}</span> <strong>${total} reps total</strong></p>`;
  const padRow=`<button type="button" class="protocol-pad-row press" data-action="isok-tab" data-value="tilts"><span>${splitRangeSummaryLabel()}</span><strong>${isokTiltSummary()}</strong>${icon('chevron','icon-sm')}</button>`;
  return `<header class="preview-head"><h2${headingId?` id="${headingId}"`:''}>${escapeHTML(title)}</h2>${sum}</header><div class="session-preview-radial">${isokineticDiagram()}</div>${padRow}${teamProtocolRepExplainerMarkup()}`;
 }
 const workload=kind==='limit'?`${c.positions} directions · 1 movement each`:`${c.positions} directions × ${c.reps} reps`;
 const rangeSummary=showRangeSummary?`<button type="button" class="isok-range-summary" data-action="isok-tab" data-value="tilts"><span>${splitRangeSummaryLabel()}</span><strong>${isokTiltSummary()}</strong>${icon('chevron','icon-sm')}</button>`:'';
 return `<header class="isok-preview-heading"><h2${headingId?` id="${headingId}"`:''}>${escapeHTML(title)}</h2><p>${workload}${kind==='limit'?'':` <strong>${total} reps total</strong>`}</p></header>${isokineticDiagram()}<p class="isok-diagram-help">${splitDiagramHelp()}</p>${rangeSummary}`;
}
function padArcGaugeSVG(tilt,kind,valid,label){
 const cx=44,cy=114,r=84;
 const toXY=deg=>{const clamped=Math.max(0,Math.min(SETUP_MAX_TILT,Number(deg)||0)),rad=((-90+(clamped/SETUP_MAX_TILT)*76)*Math.PI)/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];};
 const [x0,y0]=toXY(0),[xMax,yMax]=toXY(SETUP_MAX_TILT);
 const ticks=[0,15,30,45].map(d=>{const [tx,ty]=toXY(d),rad=((-90+(d/SETUP_MAX_TILT)*76)*Math.PI)/180,lx=cx+(r+16)*Math.cos(rad),ly=cy+(r+16)*Math.sin(rad);return `<line x1="${(cx+(r-5)*Math.cos(rad)).toFixed(1)}" y1="${(cy+(r-5)*Math.sin(rad)).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="var(--line)" stroke-width="1.2"/><text x="${lx.toFixed(1)}" y="${(ly+3.5).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)">${d}°</text>`;}).join('');
 const stroke=!valid?'var(--red)':kind==='return'?'var(--amber)':'var(--signal)';
 let active='';
 if(kind==='fixed'){
  const [px,py]=toXY(tilt.start);
  active=`<line x1="${cx}" y1="${cy}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6" fill="${stroke}"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10" fill="${stroke}" opacity="0.16"/>`;
 }else{
  const lo=Math.min(tilt.start,tilt.end),hi=Math.max(tilt.start,tilt.end);
  const [xA,yA]=toXY(lo),[xB,yB]=toXY(hi),[xS,yS]=toXY(tilt.start),[xE,yE]=toXY(tilt.end);
  const sweep=valid?`<path d="M ${cx} ${cy} L ${xA.toFixed(1)} ${yA.toFixed(1)} A ${r} ${r} 0 0 1 ${xB.toFixed(1)} ${yB.toFixed(1)} Z" fill="${stroke}" opacity="0.11"/><path d="M ${xA.toFixed(1)} ${yA.toFixed(1)} A ${r} ${r} 0 0 1 ${xB.toFixed(1)} ${yB.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>`:'';
  active=`${sweep}<line x1="${cx}" y1="${cy}" x2="${xS.toFixed(1)}" y2="${yS.toFixed(1)}" stroke="${stroke}" stroke-width="1.8" stroke-dasharray="3 3"/><line x1="${cx}" y1="${cy}" x2="${xE.toFixed(1)}" y2="${yE.toFixed(1)}" stroke="${stroke}" stroke-width="2.2"/><circle cx="${xS.toFixed(1)}" cy="${yS.toFixed(1)}" r="4.5" fill="var(--surface)" stroke="${stroke}" stroke-width="2.2"/><circle cx="${xE.toFixed(1)}" cy="${yE.toFixed(1)}" r="5.5" fill="${stroke}"/>`;
 }
 return `<svg class="isok-arc-gauge" viewBox="0 0 185 130" role="img" aria-label="Pad tilt diagram ${escapeHTML(label)}"><path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${xMax.toFixed(1)} ${yMax.toFixed(1)}" fill="none" stroke="var(--line)" stroke-width="2" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${x0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 3"/><line x1="${cx}" y1="${cy}" x2="${xMax.toFixed(1)}" y2="${yMax.toFixed(1)}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 3"/>${ticks}${active}<circle cx="${cx}" cy="${cy}" r="4" fill="var(--ink)"/><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9.5" fill="var(--muted)">Pivot</text></svg>`;
}
function isokTiltPanel(options={}){
 const {compact=false}=options;
 const c=state.setup,a=currentAngles().includes(c.angle)?c.angle:0,t=setupTilt(a),kind=setupTiltKind(),valid=validTilt(t),summary=setupTiltText(a);c.angle=a;
 const step=(field,label)=>`<div><span class="setup-label">${label}</span>${setupNumericControl({id:`tilt-${a}-${field}`,key:`tilt:${a}:${field}`,label:`${setupDirectionNames[a]} ${label.toLowerCase()}`,current:t[field],unit:'°',min:0,max:SETUP_MAX_TILT,step:1})}</div>`;
 const intro=compact
  ?(kind==='fixed'?'Pad angle held for the rep. Tap a direction on the preview to switch.':kind==='return'?'Start and end pad angles for the resisted return. Tap a direction on the preview.':'Start and end pad angles for each rep. Tap a direction on the preview.')
  :(kind==='fixed'?'Pad position for each direction. The pad stays at this angle for the whole rep.':kind==='limit'?'Start and maximum tilt for comfortable movement. Separate from the directions around the head.':kind==='return'?'Start and end positions for the return path. The device moves the pad from start toward end; the person resists.':'Start and end positions of the pad. These are tilt angles, separate from the directions around the head.');
 const fields=kind==='fixed'?step('start','Pad tilt'):`${step('start',kind==='limit'?'Start tilt':'Start tilt')}${step('end',kind==='limit'?'Max tilt':'End tilt')}`;
 const help=kind==='fixed'?`${t.start}° for each rep.`:kind==='limit'?valid?`${t.end-t.start}° of allowed travel on each movement.`:'Max tilt must be higher than start tilt.':kind==='return'?valid?`${t.start-t.end}° of return travel on each rep.`:'End tilt must be lower than start tilt.':valid?`${t.end-t.start}° of travel on each rep.`:'End tilt must be higher than start tilt.';
 const arcCard=`<div class="isok-arc-card${valid?'':' is-invalid'}">${padArcGaugeSVG(t,kind,valid,summary)}<div class="isok-arc-meta"><strong class="tabular">${summary}</strong><p class="${valid?'setup-help':'tilt-error'}" role="status">${help}</p></div></div>`;
 const dirSelect=compact?'':`<label class="isok-direction-select"><span class="setup-label">Direction</span><select id="isok-tilt-direction">${currentAngles().map(angle=>`<option value="${angle}" ${a===angle?'selected':''}>${angle}° · ${setupDirectionNames[angle]} — ${setupTiltText(angle)}</option>`).join('')}</select></label>`;
 return `<p class="isok-panel-intro">${intro}</p>${dirSelect}<div class="isok-tilt-editor"><div class="isok-editor-heading"><h2>${a}° · ${setupDirectionNames[a]}</h2><span>${t.source}</span></div>${arcCard}<div class="isok-tilt-fields">${fields}</div><div class="isok-tilt-actions">${button('Apply to all directions','tilt-apply-selected','small-button','id="tilt-all"')}${t.changed?button('Reset this direction','reset-direction-tilt','text-button',`data-angle="${a}" id="tilt-${a}-reset"`):''}</div></div>`;
}
function splitModeFieldsBlock(forceHelp){
 const c=state.setup;
 if(c.type==='rom')return `<input id="target-weight" type="hidden" value="${c.weight}">`+setupChallengeField('Light push needed before movement counts.');
 if(c.type==='strength')return setupHoldStyleField()+setupForceField(isometricHoldStyle(c)==='timed'?(forceHelp||''):'A guide to aim for. The result is how long they hold.')+setupChallengeField('Counting starts above this, so noise can’t start a rep.');
 if(c.type==='eccentric')return setupForceField(forceHelp||'The line to stay near while resisting.')+setupChallengeField('Safety stop, always on: the device stops if force falls below this.')+`<div class="setup-field"><span class="setup-label" id="speed-label">Speed</span><div class="segmented" role="group" aria-labelledby="speed-label">${Object.entries(eccentricSpeeds).map(([key,speed])=>`<button id="setup-speed-${key}" class="${c.eccSpeed===key?'active':''}" data-action="setup-speed" data-value="${key}" aria-pressed="${c.eccSpeed===key}">${speed.label}</button>`).join('')}</div><p class="setup-help">How fast the device moves the pad.</p></div>`+setupNumberField('eccCap','Force cap',' kg',Math.ceil(c.weight)||1,75,1,'The rep stops if force goes above this.');
 return c.programLoad?`<div class="isok-program-source"><span class="setup-label">Target force</span><strong>Set by program, per direction</strong><p class="setup-help">${programLoadLabel({load:c.programLoad})}. Targets shown on the diagram.</p>${programTargetsValid()?'':'<p class="tilt-error">Targets are missing for one or more directions. Review the program before starting.</p>'}</div>`:setupForceField(forceHelp);
}
function splitDuringRepSection(){
 const c=state.setup;
 if(c.type==='rom')return '';
 if(c.type==='isokinetic')return `<div class="isok-movement"><h2>During each rep</h2><p>Push against the pad as it moves through the set tilt range. The rep ends at the end tilt.</p><div id="isok-stop-summary">${isokStopSummary()}</div><details class="isok-thresholds" ${c.isokRulesOpen?'open':''}><summary>Adjust movement threshold</summary><div class="isok-rule-fields">${setupChallengeField(c.challengeAuto?'Auto: 1 kg below target.':'Set for this session. <button class="text-button" data-action="challenge-auto" id="challenge-auto">Use automatic threshold</button>')}${setupNumberField('challengeHold','Stop if below for','s',1,5,1)}</div></details></div>`;
 if(c.type==='eccentric')return `<div class="isok-movement"><h2>During each rep</h2><p>Resist as the device moves the pad from start tilt back to end tilt. The rep ends when the pad reaches the end tilt.</p><p class="setup-help">${eccentricSpeeds[c.eccSpeed].label} return speed · Force must stay above ${isokForceText(c.challenge)} or the device stops.</p></div>`;
 const endurance=isIsometricEndurance(c);
 return `<div class="isok-movement"><h2>During each rep</h2><p>${endurance?setupModeLine.endurance:'Build to the target and hold. The pad stays fixed.'}</p>${endurance?'':`<p class="setup-help">Each rep ends after <strong>${c.holdSeconds} s</strong> on the timer.</p>`}</div>`;
}
function isokSessionPanel(forceHelp){
 return `${splitMainFields(forceHelp)}${programSetupPanel()}${splitDuringRepSection()}`;
}
function splitMainFields(forceHelp){
 const c=state.setup;
 const reps=c.type==='rom'?'':`<div class="setup-field"><span class="setup-label" id="reps-label">Reps per direction</span>${setupRepsControl()}</div>`;
 return `<div class="isok-main-fields"><div class="setup-field"><span class="setup-label" id="directions-label">Directions</span><div class="segmented" role="group" aria-labelledby="directions-label">${[4,8].map(n=>`<button id="setup-count-${n}" class="${c.positions===n?'active':''}" data-action="setup-positions" data-value="${n}" aria-pressed="${c.positions===n}">${n} directions</button>`).join('')}</div></div>${reps}${splitModeFieldsBlock(forceHelp)}</div>`;
}
function isokStopSummary(){const c=state.setup;return `<p class="isok-stop-copy">Movement starts above <strong>${isokForceText(c.challenge)}</strong>. The pad stops if effort stays below this for <strong>${c.challengeHold} s</strong>.</p>`;}
function isokineticSetupView(){
 const team=isTeamAssessmentSetupContext(),c=state.setup,tab=c.isokTab==='tilts'?'tilts':'session',bad=currentAngles().some(a=>!validTilt(setupTilt(a))),purpose=c.purpose==='assessment'?'assessment':'session',mode=sessionModes[c.type];
 const sub=team?'Team defaults for new assessments. Members still review tilts before Begin.':c.continuing?`${escapeHTML(c.programName)} · Session ${c.programSession} of ${c.programTotal}`:c.type==='strength'?setupIsometricModeLine(c):setupModeLine[c.type];
 const title=team?'Assessment protocol · '+mode.name:c.type==='rom'&&purpose==='assessment'?'Range of motion assessment':c.type==='strength'?`Isometric ${purpose}`:`${mode.name} ${purpose}`;
 const tiltKind=setupTiltKind();
 const tiltTab=tiltKind==='fixed'?'Positions':tiltKind==='limit'?'Limits':'Tilts';
 const invalidCopy=tiltKind==='fixed'?'Review the invalid position in Positions before starting.':tiltKind==='limit'?'Review the invalid limit in Limits before starting.':'Review the invalid range in Tilts before starting.';
 const readyCopy=team?`Starting value when no member baseline exists. ${bad?invalidCopy:'Save when you are done.'}`:!state.deviceReady?'Device unavailable. Mark it ready in Device before starting.':bad?invalidCopy:`${mode.name} ${purpose}`;
 const modeSelect=c.programLoad||c.type==='rom'?'':`<label class="setup-change"><span>Change mode</span><select id="setup-mode" aria-label="Change exercise mode">${standardExerciseModeKeys(c.purpose).map(key=>`<option value="${key}" ${c.type===key?'selected':''}>${sessionModes[key].name}</option>`).join('')}</select></label>`;
 const commit=c.type==='rom'?`<strong>${c.positions} directions · 1 movement each</strong>`:`<strong>${c.positions*c.reps} reps · ${c.positions} directions</strong>`;
 const footer=team?'':`<footer class="isok-start"><div class="isok-commit">${commit}<span>${readyCopy}</span></div>${button('Begin session','start-session','primary',`${!state.deviceReady||!setupIsValid()?'disabled':''} id="begin-session-button"`)}</footer>`;
 const forceHelp=team?'Starting target when no member baseline exists.':undefined;
 return `<div class="setup-page isok-setup ${team?'isok-setup--team':''}"><header class="session-title setup-heading"><div><div class="setup-title-row"><h1>${title}</h1>${team?'':c.type==='eccentric'?'<span class="badge setup-new">New</span>':''}${modeSelect}</div><p>${c.type==='strength'&&isIsometricEndurance(c)?'Endurance · ':''}${sub}</p></div></header><div class="isok-split"><section class="isok-controls" aria-label="Session setup"><div class="isok-tabs" role="tablist" aria-label="Setup sections">${[['session','Session'],['tilts',tiltTab]].map(([key,label])=>`<button role="tab" id="isok-tab-${key}" data-action="isok-tab" data-value="${key}" aria-selected="${tab===key}" aria-controls="isok-panel-${key}" tabindex="${tab===key?0:-1}">${label}${key==='tilts'&&bad?'<span class="isok-tab-error">Check</span>':''}</button>`).join('')}</div><div id="isok-panel-${tab}" role="tabpanel" aria-labelledby="isok-tab-${tab}">${tab==='session'?isokSessionPanel(forceHelp):isokTiltPanel()}</div></section><section class="isok-preview" id="isok-preview" aria-label="Session preview">${isokineticPreview()}</section></div>${footer}</div>`;
}
function refreshSplitSetupPreview(){
 if(!isSetupStageContext()||!splitSetupUsesSplitLayout())return;
 setupModeDefaults();
 const preview=$('#team-assessment-preview');if(preview)preview.innerHTML=isokineticPreview({title:'Your session',headingId:'team-assessment-preview-title',showRangeSummary:false,card:true});
 const splitPreview=$('#isok-preview');if(splitPreview)splitPreview.innerHTML=isokineticPreview();
 const stop=$('#isok-stop-summary');if(stop)stop.innerHTML=isokStopSummary();
 const fields=$('.isok-rule-fields');if(fields&&state.setup.type==='isokinetic')fields.innerHTML=setupChallengeField(state.setup.challengeAuto?'Auto: 1 kg below target.':'Set for this session. <button class="text-button" data-action="challenge-auto" id="challenge-auto">Use automatic threshold</button>')+setupNumberField('challengeHold','Stop if below for','s',1,5,1);
}
function teamAssessmentProtocolEditorActive(){
 return isTeamAssessmentSetupContext()&&typeof assessmentWorkspaceView==='function'&&assessmentWorkspaceView()==='editor'&&typeof assessmentWorkspaceTab==='function'&&assessmentWorkspaceTab()!=='rom';
}
Object.assign(setupActions,{
 'isok-tab':el=>{
  state.setup.isokTab=el.dataset.value==='tilts'?'tilts':'session';
  state.setup.valuePicker=null;
  if(isTeamAssessmentSetupContext())directoryUI().programs.teamTab=state.setup.isokTab;
  const team=isTeamAssessmentSetupContext()&&typeof assessmentWorkspaceView==='function'&&assessmentWorkspaceView()==='editor';
  const protocol=teamAssessmentProtocolEditorActive();
  renderSetupControl(protocol?'#isok-tab-'+state.setup.isokTab:team?(state.setup.isokTab==='tilts'?`[data-action="isok-direction"][data-angle="${state.setup.angle}"]`:'#assessment-radial-settings'):'#isok-tab-'+state.setup.isokTab);
 },
 'isok-direction':el=>{
  state.setup.angle=Number(el.dataset.angle);state.setup.isokTab='tilts';
  if(isTeamAssessmentSetupContext())directoryUI().programs.teamAngle=state.setup.angle;
  const team=isTeamAssessmentSetupContext()&&typeof assessmentWorkspaceView==='function'&&assessmentWorkspaceView()==='editor';
  const protocol=teamAssessmentProtocolEditorActive();
  renderSetupControl(protocol?'#isok-tab-tilts':team?`[data-action="isok-direction"][data-angle="${state.setup.angle}"]`:'#isok-tab-tilts');
 },
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