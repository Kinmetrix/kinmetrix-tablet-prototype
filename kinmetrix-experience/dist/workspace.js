/* Overview and session discovery. Motion explains the interaction, not device mechanics. */
const sessionModes = {
 strength:{name:'Isometric',mechanism:'Fixed position',short:'Push against a fixed position',purposes:['assessment','training'],description:'Measure force in each direction, or practice holding a target effort.',steps:['Build effort','Hold steady','Release'],cue:'Position stays fixed',trace:'M12 46L25 46L42 15L86 15L102 46L112 46'},
 endurance:{name:'Endurance',mechanism:'Isometric · untimed',short:'Hold effort, then release',purposes:['assessment','training'],description:'Measure how long you sustain effort. There’s no countdown; releasing effort ends the rep.',steps:['Build effort','Keep holding','Release to finish'],cue:'No countdown · release to finish',trace:'M12 46L24 46L38 15L88 15L100 46L112 46'},
 rom:{name:'Range of motion',mechanism:'Isokinetic assessment',short:'Find your movement limits',purposes:['assessment'],description:'Measure your available range. Your coach reviews the result before applying new working limits.',steps:['Move through range','Reach your limit','Stop automatically or manually'],cue:'Movement stops at your limit',trace:'M12 46L28 46L88 12L112 12'},
 eccentric:{name:'Eccentric',mechanism:'Resisted movement',short:'Resist as the device moves',purposes:['assessment','training'],description:'Measure or practice control while resisting movement in the opposite direction.',steps:['Device moves','You resist','Complete the movement'],cue:'Movement and effort oppose each other',trace:'M12 44L28 15L44 22L60 14L76 23L92 18L112 44'},
 isokinetic:{name:'Isokinetic',mechanism:'Controlled speed',short:'Move at a controlled speed',purposes:['assessment','training'],description:'Practice producing effort through your working range while movement stays at a set speed.',steps:['Begin moving','Keep a steady pace','Complete the range'],cue:'Movement keeps a steady pace',trace:'M12 46L112 12'}
};
const sessionModeOrder=['strength','isokinetic','rom','eccentric','endurance'];
const sessionModeKeys=purpose=>sessionModeOrder.filter(key=>sessionModes[key].purposes.includes(purpose));
const modePurposeCopy={
 assessment:{strength:'Measure strength at a fixed position in each direction.',isokinetic:'Measure strength through your range at a controlled speed.',rom:'Measure your available range. Your coach reviews new limits.',eccentric:'Measure control while resisting the device’s movement.',endurance:'Measure sustained effort without a countdown. Release to end the rep.'},
 training:{strength:'Practice holding a target effort against a fixed pad.',isokinetic:'Train through your working range at a controlled speed.',eccentric:'Practice resisting the pad as the device moves against you.',endurance:'Hold your effort without a countdown. Release to end the rep.'}
};

function memberWorkspaceView(){
 const p=person(),continuing=activeProgram(),backLabel=state.memberOrigin==='roster'?'Back to roster':state.memberOrigin==='programs'?'Back to programs':'Find another person';
 return `<div class="member-heading">${state.actor==='coach'?`<button class="icon-button member-find-another" data-action="show-roster" aria-label="${backLabel}" title="${backLabel}">${icon('back','icon-sm')}</button>`:''}${photoAvatar(p,'large')}<div class="member-identity"><h1>${escapeHTML(p.name)}</h1><p>${p.detail}${state.history.some(h=>h.personId===p.id)?' · Last visit Today':p.last?' · Last visit '+p.last:' · First visit'}</p></div>
 <div class="member-session-actions">${continuing&&state.tab!=='programs'?button(icon('play','icon-sm')+'<span>Continue program</span><span class="continue-session">'+(continuing.completed+1)+' / '+continuing.total+'</span>','continue-program','primary continue-program-button',`data-program-id="${continuing.id}" aria-label="Continue program, session ${continuing.completed+1} of ${continuing.total}"`):''}${button(icon('plus','icon-sm')+' New','new-session',continuing?'':'primary','aria-haspopup="dialog"')}</div></div>
 <nav class="member-tabs" aria-label="Member workspace">${['overview','history','programs','profile'].map(tab=>`<button class="member-tab ${state.tab===tab?'active':''}" data-action="member-tab" data-tab="${tab}" ${state.tab===tab?'aria-current="page"':''}>${tab[0].toUpperCase()+tab.slice(1)}</button>`).join('')}</nav>
 ${state.tab==='profile'?profileView():state.tab==='history'?memberHistoryView():state.tab==='programs'?personProgramsView():overviewView()}`;
}

function memberHistoryView(){return `<div class="member-history">${sessionHistoryView(state.history.filter(r=>r.personId===state.personId))}</div>`;}

function overviewResult(){return state.history.find(r=>r.personId===state.personId&&!r.partial)||(person()?.baseline?historyFixture('strength','9 Nov'):null);}
function overviewState(r){
 if(!state.overviewUI||state.overviewUI.personId!==r.personId||state.overviewUI.id!==r.id)state.overviewUI={personId:r.personId,id:r.id,direction:null};
 return state.overviewUI;
}
function overviewDirectionDetails(r){
 const index=overviewState(r).direction,d=index===null?null:reportData(r).directions[index];
 if(!d)return overviewWorthALook(r);
 const viewer={selected:null,visible:d.reps.map(rep=>rep.number),average:true,target:false,cursor:null,canvasWidth:360,canvasHeight:300,preview:true};
 return `<button type="button" class="overview-rep-chart" data-action="overview-open-reps" aria-label="Open detailed rep charts for ${d.angle} degrees, ${escapeHTML(d.name)}">${repForceChart(r,d,viewer)}</button><div class="overview-rep-heading" aria-live="polite"><div class="overview-rep-title"><h3>${d.angle}° · ${escapeHTML(d.name)}</h3><span class="overview-rep-unit">${r.type==='rom'?'Tilt · °':'Force · kg'}</span></div><p>${d.reps.length} repetitions · Tap chart for details</p>${button(icon('back','icon-sm')+' Back to summary','overview-clear-direction','small-button','id="overview-clear-direction"')}</div>`;
}
function overviewRadialView(r){const index=overviewState(r).direction,lowest=overviewLowestDirection(r);return `${reportRadial(r,{overlay:r.type==='rom'?'working':'stability',scaleLabels:true,direction:index??lowest?.index??null,directionAction:'overview-direction',pointCallout:index!==null})}<p class="overview-chart-hint">Tap a direction to see its reps.</p>`;}
// The Overview points at one thing to look at: the direction with the lowest value on the session's main measure.
// This is a plain lowest-value rule for the prototype, not a clinical judgement.
function overviewLowestDirection(r){
 const data=reportData(r),metric=reportMetric(r),values=data.directions.map(d=>d[metric.field]);
 if(values.length<2||!values.every(Number.isFinite))return null;
 const low=Math.min(...values),high=Math.max(...values),index=values.indexOf(low);
 if(high<=0||high===low)return null;
 return {index,direction:data.directions[index],value:low,highest:data.directions[values.indexOf(high)],below:Math.round((high-low)/high*100),metric};
}
function overviewWorthALook(r){
 const low=overviewLowestDirection(r);
 if(!low)return `<div class="overview-rep-helper"><h3>Reps by direction</h3><p>Tap a direction on the chart to see its reps.</p></div>`;
 const d=low.direction;
 return `<div class="overview-look"><div><p class="overview-look-title">Worth a look</p><p><strong>${escapeHTML(d.name)} (${d.angle}°)</strong> has the lowest ${low.metric.label.toLowerCase()}: ${low.value.toFixed(1)} ${low.metric.unit}, ${low.below}% below ${escapeHTML(low.highest.name.toLowerCase())}.</p></div>${button('See reps '+icon('chevron','icon-sm'),'overview-direction','small-button',`data-index="${low.index}"`)}</div>`;
}
function overviewDelta(current,previous,prior,unit,digits=1){
 if(!prior||!Number.isFinite(previous)||!Number.isFinite(current))return '';
 const change=Number((current-previous).toFixed(digits)),trend=change>0?'up':change<0?'down':'same';
 return `<span class="overview-delta ${trend}" title="Numerical change; may include measurement variation"><b>${trend==='same'?'No change':`${trend==='up'?'▲':'▼'} ${Math.abs(change).toFixed(digits)} ${unit==='points'&&Math.abs(change)===1?'point':unit}`}</b><span>since ${escapeHTML(sessionDate(prior).replace(/ \d{4}$/,''))}</span></span>`;
}
function overviewStatButton(label,value,unit,delta,metric){
 return `<button type="button" class="overview-stat" data-action="overview-open-report"${metric?` data-metric="${metric}"`:''} aria-label="${label}: ${value} ${unit}. Open this in the report"><span class="overview-stat-label">${label}</span><span class="overview-stat-value">${value} <small>${unit}</small></span>${delta||''}${icon('chevron','icon-sm overview-stat-go')}</button>`;
}
// Each measure opens the report on its own view. Movement modes reuse their existing measures and open the report's main view.
function overviewStats(r){
 if(isMovementMode(r.type))return modeOverviewMetrics(r).replace('<dl class="overview-measures">','<div class="overview-measures">').replace('</dl>','</div>').replace(/<div><dt>/g,'<button type="button" class="overview-stat" data-action="overview-open-report"><span class="overview-stat-label">').replace(/<\/dt><dd>/g,'</span><span class="overview-stat-value">').replace(/<\/dd><\/div>/g,`</span>${icon('chevron','icon-sm overview-stat-go')}</button>`);
 const data=reportData(r),metric=reportMetric(r),prior=reportPreviousSession(r),before=prior?reportData(prior):null,match=reportPairMatch(data),matchBefore=before?reportPairMatch(before):null;
 const rows=[[metric.label,data[metric.field].toFixed(1),metric.unit,overviewDelta(data[metric.field],before?.[metric.field],prior,metric.unit),'force'],['Stability',Math.round(data.stability),'%',overviewDelta(data.stability,before?before.stability:null,prior,'points',0),'stability'],...(match===null?[]:[['Force symmetry',Math.round(match),'% match',overviewDelta(match,matchBefore,prior,'points',0),'symmetry']])];
 return `<div class="overview-measures">${rows.map(row=>overviewStatButton(...row)).join('')}</div>${prior?'':'<p class="overview-baseline">First comparable session. Changes show after the next matching one.</p>'}`;
}


function selectOverviewDirection(index){
 const r=overviewResult();if(!r||!Number.isInteger(index)||!reportData(r).directions[index])return;
 overviewState(r).direction=index;
 const chart=$('#overview-radial'),details=$('#overview-direction');if(!chart||!details)return;
 chart.innerHTML=overviewRadialView(r);details.innerHTML=overviewDirectionDetails(r);details.closest('.overview-side')?.classList.add('has-direction');
 $(`[data-action="overview-direction"][data-index="${index}"]`,chart)?.focus({preventScroll:true});
}
function clearOverviewDirection(){
 const r=overviewResult();if(!r)return;
 overviewState(r).direction=null;
 const chart=$('#overview-radial'),details=$('#overview-direction');if(!chart||!details)return;
 chart.innerHTML=overviewRadialView(r);details.innerHTML=overviewDirectionDetails(r);details.closest('.overview-side')?.classList.remove('has-direction');
 $('.overview-look .button',details)?.focus({preventScroll:true});
}
function openOverviewReport(el){
 const r=overviewResult();if(!r)return;
 const metric=['force','stability','symmetry'].includes(el?.dataset?.metric)?el.dataset.metric:'force';
 state.result=r;state.stage='review';state.reportReturnTab='overview';state.showCompare=reportCanCompare(r);state.reportDetails=false;
 const ui=reportState();ui.page='radial';ui.metric=metric;ui.direction=overviewState(r).direction??0;ui.overlay=reportCanCompare(r)?'previous':'stability';render();window.scrollTo(0,0);
}
function openOverviewReps(){
 const r=overviewResult();if(!r||overviewState(r).direction===null)return;
 state.result=r;state.stage='review';state.reportReturnTab='overview';state.reportDetails=false;
 const ui=reportState();ui.page='radial';ui.direction=overviewState(r).direction;openRepReview();
}
function overviewView(){
 const pr=profile(),latest=overviewResult();
 const pending=pr.pending&&state.actor==='coach'?`<div class="notice"><span>A new range assessment is ready for review.</span>${button('Review limits','review-pending','small-button')}</div>`:'';
 if(!latest)return `${pending}<section class="overview-empty"><h2>No completed sessions yet</h2><p>Start with an assessment. Results and comparisons will appear here.</p>${button('Start an assessment '+icon('arrow','icon-sm'),'assess','primary')}</section>`;
 const modeName=latest.purpose==='training'&&latest.type==='strength'?'Isometric':protocols[latest.type].name;
 return `${pending}<section class="overview-latest" aria-label="Latest completed session"><header class="overview-latest-head"><div><p class="overview-eyebrow">Latest ${latest.purpose==='assessment'?'assessment':'session'}</p><h2>${modeName}${latest.purpose==='training'?' training':''} · ${latest.positions} directions</h2><p class="overview-when">${sessionStamp(latest)}${latest.clinicianName?' · with '+escapeHTML(latest.clinicianName):''}</p></div>${button('View full report '+icon('chevron','icon-sm'),'overview-open-report','small-button')}</header>
 <div class="overview-latest-body"><div class="overview-radial" id="overview-radial">${overviewRadialView(latest)}</div>
 <div class="overview-side ${overviewState(latest).direction===null?'':'has-direction'}"><div class="overview-stats">${overviewStats(latest)}</div><section class="overview-direction" id="overview-direction" aria-label="Reps for the selected direction">${overviewDirectionDetails(latest)}</section>${sessionNoteTop(latest)}</div></div></section>`;
}

function modeThumbnail(type){return `<svg class="mode-thumbnail" viewBox="0 0 124 60" aria-hidden="true"><path class="mode-trace-grid" d="M12 8V48H114"/><path class="mode-trace" d="${sessionModes[type].trace}"/>${type==='rom'?'<path class="mode-trace-limit" d="M88 5V49"/>':''}${type==='eccentric'?'<path class="mode-trace-limit" d="M20 51H104m-6-4 6 4-6 4M26 3H104m-72-4-6 4 6 4"/>':''}</svg>`;}

function movementPreview(type){
 const renderer=['strength','endurance'].includes(type)?RenderedIsometric:RenderedIsokinetic;
 return renderer.markup({mode:type,compact:true});
}

function pickerFrame(o,title,intro,body,footer='',compact=false){
 const back=o.step==='start'?'':`<button class="text-button picker-back" data-action="picker-back">${icon('back','icon-sm')} ${o.step==='create-program'?'Programs':'New'}</button>`;
 return `<div class="modal-backdrop session-picker-backdrop"><section class="dialog session-picker ${compact?'picker-compact':''} ${o.step==='create-program'?'program-editor-dialog':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="picker-intro"><header class="dialog-header"><div>${back}<h2 id="dialog-title" tabindex="-1">${title}</h2><p id="picker-intro">${intro}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${body}${footer?`<footer class="session-picker-footer">${footer}</footer>`:''}</section></div>`;
}
function sessionPickerView(o){
 const name=escapeHTML(person().name);
 if(o.step==='start')return pickerFrame(o,'New',`Choose what to start for ${name}.`,`<div class="new-task-list">${[
  ['assessment','Assessment','Measure current ability and compare results over time.','assessment'],
  ['training','Training session','Do a single session with your chosen mode and settings.','training'],
  ['program','Program','Continue a plan or create a sequence of training sessions.','library']
 ].map(([key,title,copy,symbol])=>`<button class="new-task-row" data-action="choose-session-task" data-task="${key}">${icon(symbol)}<span><strong>${title}</strong><small>${copy}</small></span>${icon('chevron','icon-sm')}</button>`).join('')}</div>`, '', true);
 if(o.step==='programs')return programPickerView(o);
 if(o.step==='create-program')return programCreateView(o);
 const mode=sessionModes[o.mode],isMeasure=o.purpose==='assessment',label=isMeasure?'Assessment':'Training session';
 return pickerFrame(o,label,`Choose a mode for ${name}.`,
 `<div class="session-picker-body"><div class="mode-choices" role="group" aria-label="${label} mode">${sessionModeKeys(o.purpose).map(key=>{const m=sessionModes[key];return `<button class="mode-choice ${key===o.mode?'selected':''}" data-action="choose-session-mode" data-mode="${key}" aria-pressed="${key===o.mode}" aria-controls="mode-detail"><span><strong>${m.name}</strong><small>${m.short}</small></span><span class="mode-choice-indicator" aria-hidden="true">${key===o.mode?icon('check','icon-sm'):icon('chevron','icon-sm')}</span></button>`;}).join('')}</div>
 <section class="mode-detail" id="mode-detail" aria-labelledby="mode-detail-title"><div class="mode-expanded-bar"><button type="button" class="text-button" data-action="collapse-mode-preview">${icon('back','icon-sm')} Back to modes</button><h3 id="expanded-preview-title">${mode.name}</h3></div><div class="mode-detail-heading"><h3 id="mode-detail-title">${mode.name}</h3></div>
 <p class="mode-description">${modePurposeCopy[o.purpose][o.mode]}</p>
 <div class="mode-animation ${o.paused?'is-paused':''}">${movementPreview(o.mode)}<div class="mode-render-controls"><button type="button" data-action="expand-mode-preview" aria-label="Open larger ${mode.name} example" title="Larger example">${icon('expand','icon-sm')}</button><button type="button" data-action="toggle-mode-preview" aria-label="${o.paused?'Play':'Pause'} animation" title="${o.paused?'Play':'Pause'} animation">${icon(o.paused?'play':'pause','icon-sm')}</button></div></div></section></div>`,
 `<div>${button('Cancel','close-modal')}${button((isMeasure?'Set up assessment':'Set up training')+' '+icon('arrow','icon-sm'),'confirm-session-mode','primary')}</div>`);

}
let modePreviewController=null;
function mountModePreview(){
 const root=$('.rendered-isometric,.rendered-isokinetic');if(!root)return;
 const renderer=root.matches('.rendered-isokinetic')?RenderedIsokinetic:RenderedIsometric;
 modePreviewController=renderer.mount(root,{paused:state.overlay?.paused,onPause(){
  const o=state.overlay;if(o?.type!=='session-picker')return;o.paused=true;
  const control=$('[data-action="toggle-mode-preview"]');if(control){control.innerHTML=icon('play','icon-sm');control.title='Play animation';control.setAttribute('aria-label','Play animation');}
 }});
 if(matchMedia('(max-width:620px)').matches)$('.mode-choice.selected')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function openSessionPicker(mode=null,purpose=null){
 if(!person())return;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 openModal('session-picker',{step:purpose?'modes':'start',mode:mode||'strength',purpose:purpose||'assessment',selections:{},paused:reducedMotion,reducedMotion});
}
function syncModalSurface(){
 const open=!!state.overlay;
 $('#app').inert=open;
 $('.prototype-bar').inert=open;
 document.body.classList.toggle('modal-open',open);
}
function updatePicker(focusSelector='#dialog-title'){
 renderOverlay();$('.session-picker').scrollTop=0;$(focusSelector)?.focus();
}
function expandModePreview(){
 const o=state.overlay,dialog=$('.session-picker');
 if(o?.type!=='session-picker'||o.step!=='modes'||o.previewExpanded||!dialog)return;
 o.previewScroll={top:dialog.scrollTop,left:$('.mode-choices').scrollLeft};
 o.previewExpanded=true;
 // Resize the existing scene so its frame and playback state stay intact.
 dialog.classList.add('is-preview-expanded');
 dialog.setAttribute('aria-labelledby','expanded-preview-title');
 dialog.removeAttribute('aria-describedby');
 $('#mode-detail').setAttribute('aria-labelledby','expanded-preview-title');
 dialog.scrollTop=0;
 $('[data-action="collapse-mode-preview"]').focus({preventScroll:true});
}
function collapseModePreview(){
 const o=state.overlay,dialog=$('.session-picker');
 if(o?.type!=='session-picker'||!o.previewExpanded||!dialog)return;
 o.previewExpanded=false;
 dialog.classList.remove('is-preview-expanded');
 dialog.setAttribute('aria-labelledby','dialog-title');
 dialog.setAttribute('aria-describedby','picker-intro');
 $('#mode-detail').setAttribute('aria-labelledby','mode-detail-title');
 dialog.scrollTop=o.previewScroll?.top||0;
 $('.mode-choices').scrollLeft=o.previewScroll?.left||0;
 $('[data-action="expand-mode-preview"]').focus({preventScroll:true});
}
function memberPrograms(personId=state.personId){
 state.programs??={};
 const p=people.find(p=>p.id===personId);if(!p)return [];
 if(!state.programs[p.id]){state.programs[p.id]=p.program?[{id:'program-'+p.id,templateId:'template-'+p.id,name:p.detail,type:'strength',load:{kind:'incremental',start:p.target||12,increase:5,percent:60},total:6,completed:2,positions:4,reps:3}]:[];state.programs[p.id].forEach(plan=>plan.exampleVisits=seedProgramVisits(plan,p));}
 return state.programs[p.id];
}
function activeProgram(){return memberPrograms().find(p=>p.completed<p.total);}
function programPickerView(o){
 const programs=memberPrograms(),active=programs.filter(p=>p.completed<p.total),complete=programs.filter(p=>p.completed>=p.total);
 return pickerFrame(o,'Programs',`Training plans for ${escapeHTML(person().name)}.`, `<div class="program-picker-content">${active.length?`<div class="program-list">${active.map(p=>`<article class="program-list-row"><div><h3>${escapeHTML(p.name)}</h3><p>${sessionModes[p.type].name} · ${p.positions} directions · ${p.reps} reps</p><span>Session ${p.completed+1} of ${p.total} · ${programLoadLabel(p)}</span></div>${button('Continue '+icon('play','icon-sm'),'continue-program','primary',`data-program-id="${p.id}" aria-label="Continue ${escapeHTML(p.name)}, session ${p.completed+1} of ${p.total}"`)}</article>`).join('')}</div>`:`<div class="program-empty"><h3>No active programs</h3><p>Create a plan to follow across several training sessions.</p></div>`}
 <button class="new-task-row new-program-row" data-action="new-program">${icon('plus')}<span><strong>Create a new program</strong><small>Choose a training mode, settings, and number of sessions.</small></span>${icon('chevron','icon-sm')}</button>${complete.length?`<p class="program-completed-note">Completed: ${complete.map(p=>escapeHTML(p.name)).join(', ')}</p>`:''}</div>`, '', true);
}
function programCreateView(o){
 const draft=o.programDraft||{name:'',type:'strength',total:6,positions:4,reps:3};o.programDraft=draft;
 return pickerFrame(o,'New program',`Create a training plan for ${escapeHTML(person().name)}.`, `<form id="program-form" class="program-form">${programFields(draft,'program',true)}</form>`, `<span>Saved in this demo only</span><div>${button('Back','picker-back')}${button('Create & set up '+icon('arrow','icon-sm'),'create-program','primary')}</div>`,true);
}
function beginProgram(id){
 const program=memberPrograms().find(p=>p.id===id)||(!id?activeProgram():null);
 if(!program||program.completed>=program.total)return;
 beginSetup('training',program.type,program.id);
}
function createProgram(){
 const form=$('#program-form');if(!form)return;
 const name=$('#program-name');name.setCustomValidity(name.value.trim()?'':'Enter a program name.');if(!form.reportValidity())return;
 const program={id:'program-'+Date.now(),name:name.value.trim(),type:$('#program-mode').value,total:Number($('#program-total').value),positions:Number($('#program-positions').value),reps:Number($('#program-reps').value),completed:0};
 if(!sessionModeKeys('training').includes(program.type))return;
 const load=validateProgramLoadForm('program',program.total);if(!load)return;program.load=load;
 memberPrograms().unshift(program);beginProgram(program.id);toast('Program created. Review the first session’s settings.');
}
function completedProgramSession(record,cfg){
 if(!cfg.programId)return;
 record.programId=cfg.programId;record.programName=cfg.programName;record.programSession=cfg.programSession;
 const program=memberPrograms().find(p=>p.id===cfg.programId);
 if(!record.partial&&program&&program.completed+1===cfg.programSession)program.completed=Math.min(program.total,program.completed+1);
}
const workspaceActions={
 'overview-direction':el=>selectOverviewDirection(Number(el.dataset.index)),
 'overview-open-report':openOverviewReport,
 'overview-clear-direction':clearOverviewDirection,
 'overview-open-reps':openOverviewReps,
 'new-session':()=>openSessionPicker(),
 'choose-session-task':el=>{const o=state.overlay;if(o?.type!=='session-picker')return;const task=el.dataset.task;if(task==='program'){o.step='programs';}else if(['assessment','training'].includes(task)){o.purpose=task;o.mode=o.selections[task]||'strength';o.step='modes';}else return;updatePicker();},
 'picker-back':()=>{const o=state.overlay;if(o?.type!=='session-picker')return;const previous=o.step;o.step=previous==='create-program'?'programs':'start';updatePicker(previous==='create-program'?'[data-action="new-program"]':`[data-task="${previous==='programs'?'program':o.purpose}"]`);},
 'new-program':()=>{const o=state.overlay;if(o?.type!=='session-picker')return;o.step='create-program';updatePicker('#program-name');},
 'create-program':createProgram,
 'choose-session-mode':el=>{const o=state.overlay;if(o?.type!=='session-picker'||!sessionModeKeys(o.purpose).includes(el.dataset.mode))return;o.mode=el.dataset.mode;o.selections[o.purpose]=o.mode;o.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;renderOverlay();$(`[data-action="choose-session-mode"][data-mode="${o.mode}"]`).focus();},
 'expand-mode-preview':expandModePreview,
 'collapse-mode-preview':collapseModePreview,
 'toggle-mode-preview':el=>{const o=state.overlay;if(o?.type!=='session-picker')return;o.paused=!o.paused;$('.mode-animation').classList.toggle('is-paused',o.paused);el.innerHTML=icon(o.paused?'play':'pause','icon-sm');el.title=(o.paused?'Play':'Pause')+' animation';el.setAttribute('aria-label',(o.paused?'Play':'Pause')+' animation');modePreviewController?.setPlaying(!o.paused);},
 'confirm-session-mode':()=>{const o=state.overlay;if(o?.type!=='session-picker'||!sessionModeKeys(o.purpose).includes(o.mode))return;beginSetup(o.purpose,o.mode);const heading=$('.session-title h1');heading?.setAttribute('tabindex','-1');heading?.focus();}
};
document.addEventListener('input',event=>{const field=event.target.dataset.programField,o=state.overlay;if(field&&o?.step==='create-program'){o.programDraft[field]=event.target.value;event.target.setCustomValidity('');}});
document.addEventListener('change',event=>{const field=event.target.dataset.programField,o=state.overlay;if(field&&o?.step==='create-program')o.programDraft[field]=event.target.value;});
document.addEventListener('submit',event=>{if(event.target.id==='program-form'){event.preventDefault();createProgram();}});

document.addEventListener('keydown',event=>{
 const point=event.target.closest('[data-action="overview-direction"]');if(!point||!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key))return;
 const r=overviewResult();if(!r)return;event.preventDefault();const count=reportData(r).directions.length,current=overviewState(r).direction??Number(point.dataset.index);
 selectOverviewDirection(event.key==='Home'?0:event.key==='End'?count-1:(current+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+count)%count);
});
