/* Synthetic traces for interaction design, not device telemetry or a detection algorithm.
   Stable-window boundaries are authored fixtures; statistics describe those traces only. */
const repDashPatterns=['','9 4','2 4','12 4 2 4','5 3'];
function repHasStableWindow(r){return r.type==='strength';}
function repTrace(r,d,rep){
 if(isMovementMode(r.type))return modeTrace(r,d,rep);
 if(rep.trace)return rep.trace;
 const duration=rep.seconds,stableStart=Number((.92+rep.number*.12).toFixed(2)),stableEnd=Number((duration*(r.type==='endurance'?.87:.95)).toFixed(2));
 const points=Array.from({length:181},(_,i)=>{
  const time=duration*i/180,t=time/duration,k=rep.number;
  const texture=.009*Math.sin(i*1.7+k)+.007*Math.sin(i*.53+k*.9)+.004*Math.cos(i*2.9);
  let value;
  if(repHasStableWindow(r)){
   const ramp=Math.min(1,Math.max(0,(time-.06*k)/(stableStart*.83)));
   value=(.08+.92*Math.sin(ramp*Math.PI/2))*(1-.065*Math.max(0,time-stableStart)/duration)+texture;
   if(r.type==='endurance'&&time>stableEnd)value*=Math.max(.03,1-(time-stableEnd)/(duration-stableEnd));
  }else value=.12+.87*Math.pow(Math.sin(Math.PI*t),.8)+texture;
  return {time,force:Math.max(0,value)};
 });
 const maximum=Math.max(...points.map(p=>p.force));points.forEach(p=>p.force=p.force/maximum*rep.force);
 const at=time=>{
  const index=Math.min(points.length-2,Math.max(0,Math.floor(time/duration*180))),a=points[index],b=points[index+1],mix=Math.min(1,Math.max(0,(time-a.time)/(b.time-a.time)));
  return a.force+(b.force-a.force)*mix;
 };
 const stablePoints=[{time:stableStart,force:at(stableStart)},...points.filter(p=>p.time>stableStart&&p.time<stableEnd),{time:stableEnd,force:at(stableEnd)}];
 const area=stablePoints.slice(1).reduce((sum,p,i)=>sum+(p.time-stablePoints[i].time)*(p.force+stablePoints[i].force)/2,0),stableTime=stableEnd-stableStart,stableValue=area/stableTime;
 const variance=stablePoints.slice(1).reduce((sum,p,i)=>sum+(p.time-stablePoints[i].time)*((p.force-stableValue)**2+(stablePoints[i].force-stableValue)**2)/2,0)/stableTime;
 return rep.trace={points,at,stablePoints,stableStart,stableEnd,stableTime,stableValue,area,stdDev:Math.sqrt(variance)};
}
function repViewerState(r,d){
 const ui=reportState(),key=reportNoteKey(r)+':'+d.angle;
 ui.repViews??={};
 return ui.repViews[key]??=( {selected:null,visible:d.reps.map(x=>x.number),average:true,target:false,cursor:null} );
}
function repAverageTrace(r,d,reps=d.reps){
 if(!reps.length)return [];
 const maxTime=Math.max(...reps.map(rep=>rep.seconds));
 return Array.from({length:181},(_,i)=>{
  const time=Math.min(maxTime,maxTime*i/180),available=reps.filter(rep=>time<=rep.seconds);
  return {time,force:mean(available.map(rep=>repTrace(r,d,rep).at(time)))};
 });
}
function repSparklineScale(r){
 const reps=reportData(r).directions.flatMap(d=>d.reps);
 return {time:Math.max(1,...reps.map(rep=>rep.seconds)),force:Math.max(5,Math.ceil(Math.max(0,...reps.map(rep=>rep.force))/5)*5)};
}
function repSparkline(r,d,scale){
 if(isMovementMode(r.type))return modeRepSparkline(r,d);
 const points=repAverageTrace(r,d);
 if(!points.length)return '<span class="rep-sparkline-empty" aria-label="No rep trace available">—</span>';
 const path=points.map((p,i)=>`${i?'L':'M'}${(3+p.time/scale.time*106).toFixed(2)},${(33-p.force/scale.force*29).toFixed(2)}`).join(' ');
 return `<svg class="rep-sparkline" viewBox="0 0 112 38" role="img" aria-label="Average force over time for ${escapeHTML(d.name)}, ${d.angle} degrees, ${d.reps.length} reps. Same force and time scale across directions."><path d="${path}"/></svg>`;
}
function repMetricStrip(r,d,v,forceUnit='kg'){
 if(isMovementMode(r.type))return modeRepMetricStrip(r,d,v,forceUnit);
 const unit=exportForceUnits[forceUnit],f=(value,digits=1)=>exportForce(value,forceUnit,digits);
 const selected=d.reps.find(rep=>rep.number===v.selected),t=selected?repTrace(r,d,selected):null;
 const values=selected&&repHasStableWindow(r)?[
  ['Stable force',f(t.stableValue,2),unit.label],['Stability',Math.round(selected.stability),'%'],['Ramp',t.stableStart.toFixed(1),'s'],['Stable time',t.stableTime.toFixed(1),'s'],['Std deviation',f(t.stdDev,2),unit.label],['Stable area',f(t.area),unit.area]
 ]:selected?[
  ['Peak force',f(selected.force),unit.label],['Stability',Math.round(selected.stability),'%'],['Rep duration',selected.seconds.toFixed(1),'s'],...(r.type==='rom'?[['Range',selected.range.toFixed(1),'% demo scale']]:[])
 ]:[['Avg peak force',f(d.force),unit.label],['Stability',Math.round(d.stability),'%'],['Repetitions',d.reps.length,'recorded']];
 return `<dl class="rep-measurements ${values.length===6?'six':''}">${values.map(([label,value,unit])=>`<div><dt>${label}</dt><dd>${value} <small>${unit}</small></dd></div>`).join('')}</dl>`;
}
function repForceChart(r,d,v,forceUnit='kg'){
 if(isMovementMode(r.type))return modeRepChart(r,d,v,forceUnit);
 const unit=exportForceUnits[forceUnit],f=value=>exportForce(value,forceUnit);
 const width=v.canvasWidth||800,height=v.canvasHeight||390,left=width<500?38:58,right=width-(width<500?12:24),top=35,bottom=height-46,maxTime=Math.max(...d.reps.map(rep=>rep.seconds));
 const maxForce=Math.ceil(Math.max(...d.reps.map(rep=>rep.force),v.target?recordTarget(r,d.angle):0)/5)*5;
 const x=time=>left+time/maxTime*(right-left),y=force=>bottom-force/maxForce*(bottom-top),line=points=>points.map((p,i)=>`${i?'L':'M'}${x(p.time).toFixed(2)},${y(p.force).toFixed(2)}`).join(' ');
 const selected=d.reps.find(rep=>rep.number===v.selected),trace=selected?repTrace(r,d,selected):null,stable=selected&&repHasStableWindow(r),visible=d.reps.filter(rep=>v.visible.includes(rep.number));
 const average=repAverageTrace(r,d,visible);
 const sampleTime=v.cursor==null?null:Math.min(v.cursor,maxTime);
 return `<svg class="rep-force-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Force in ${unit.spoken} over time in seconds for ${d.name}, ${d.angle} degrees. ${selected?'Inspecting rep '+selected.number:'Comparing '+visible.length+' reps'}. ${v.preview?'The bold line is the average; grey lines are individual reps. Open the detailed rep chart for exact readings.':'Use the time slider for exact readings.'}">
 ${Array.from({length:6},(_,i)=>{const value=maxForce*i/5,py=y(value);return `<line x1="${left}" x2="${right}" y1="${py}" y2="${py}" class="rep-grid"/><text x="${left-13}" y="${py+5}" text-anchor="end">${Number(f(value))}</text>`;}).join('')}
 ${v.preview?'':`<text x="${left}" y="17" class="rep-axis-title">Force · ${unit.label}</text>`}
 ${Array.from({length:7},(_,i)=>{const time=maxTime*i/6;return `<text x="${x(time)}" y="${bottom+24}" text-anchor="middle">${Number(time.toFixed(1))}</text>`;}).join('')}<text x="${right}" y="${height-2}" text-anchor="end" class="rep-axis-title">Time · seconds</text>
 ${stable?`<path d="${line(trace.stablePoints)} L${x(trace.stableEnd)},${bottom} L${x(trace.stableStart)},${bottom} Z" fill="var(--signal-fill)"/><line x1="${x(trace.stableStart)}" x2="${x(trace.stableStart)}" y1="${top}" y2="${bottom}" class="rep-window-line"/><line x1="${x(trace.stableEnd)}" x2="${x(trace.stableEnd)}" y1="${top}" y2="${bottom}" class="rep-window-line"/><text x="${x(trace.stableStart)+7}" y="21" class="rep-window-label">Stable start</text><text x="${x(trace.stableEnd)-7}" y="21" text-anchor="end" class="rep-window-label">Stable end</text><line x1="${x(trace.stableStart)}" x2="${x(trace.stableEnd)}" y1="${y(trace.stableValue)}" y2="${y(trace.stableValue)}" class="rep-stable-line"/>`:''}
 ${v.target&&visible.length?`<line x1="${left}" x2="${right}" y1="${y(recordTarget(r,d.angle))}" y2="${y(recordTarget(r,d.angle))}" class="rep-target-line"/><text x="${right-6}" y="${y(recordTarget(r,d.angle))+18}" text-anchor="end">Target ${f(recordTarget(r,d.angle))} ${unit.label}</text>`:''}
 ${visible.map(rep=>`<path class="rep-trace ${selected?(selected.number===rep.number?'focused':'context'):''}" data-rep="${rep.number}" d="${line(repTrace(r,d,rep).points)}" fill="none" stroke-dasharray="${v.preview||selected?.number===rep.number?'':repDashPatterns[rep.number-1]}"/>`).join('')}
 ${v.average&&visible.length>0&&(v.preview||visible.length>1)?`<path d="${line(average)}" class="rep-average-line ${selected?'context':''}" fill="none"/>`:''}
 ${sampleTime!=null&&visible.length?`<line x1="${x(sampleTime)}" x2="${x(sampleTime)}" y1="${top}" y2="${bottom}" class="rep-cursor-line"/>${visible.filter(rep=>sampleTime<=rep.seconds).map(rep=>`<circle cx="${x(sampleTime)}" cy="${y(repTrace(r,d,rep).at(sampleTime))}" r="4" fill="var(--surface)" stroke="${selected?.number===rep.number?'var(--signal)':'var(--ink)'}" stroke-width="2"/>`).join('')}`:''}
 ${!visible.length?`<text x="${width/2}" y="${height/2}" text-anchor="middle">Select a rep to show its trace.</text>`:''}</svg>`;
}
function repSampleReadout(r,d,v){
 if(isMovementMode(r.type))return modeSampleReadout(r,d,v);
 if(v.cursor==null)return 'Drag across the chart or use the time slider to inspect force.';
 return d.reps.filter(rep=>v.visible.includes(rep.number)).map(rep=>`Rep ${rep.number}: ${v.cursor>rep.seconds?'ended':repTrace(r,d,rep).at(v.cursor).toFixed(2)+' kg'}`).join(' · ')||'Select a rep to inspect its readings.';
}
function repReviewView(r,ui){
 const data=reportData(r),d=data.directions[ui.direction],v=repViewerState(r,d),maxTime=Math.max(...d.reps.map(rep=>rep.seconds)),selected=d.reps.find(rep=>rep.number===v.selected);
 return `<section class="rep-review ${isMovementMode(r.type)?'mode-rep-review':''}"><header class="rep-review-heading"><button class="text-button" data-action="rep-back">${icon('back','icon-sm')} Report</button><div class="rep-angle-heading"><button class="icon-button" data-action="rep-angle-step" data-step="-1" aria-label="Previous angle" ${ui.direction===0?'disabled':''}>${icon('back')}</button><div><h1>${d.angle}° <span>${d.name}</span></h1><p>${isMovementMode(r.type)?protocols[r.type].name:protocols[r.type].mode} · Angle ${ui.direction+1} of ${r.positions}</p></div><button class="icon-button" data-action="rep-angle-step" data-step="1" aria-label="Next angle" ${ui.direction===r.positions-1?'disabled':''}>${icon('arrow')}</button></div>${button('Export','export-report','small-button')}</header>
 <div class="rep-review-layout"><div class="rep-plot-column">${repMetricStrip(r,d,v)}
 <div class="rep-chart-toolbar"><h2>${selected?'Rep '+selected.number+' · '+(repHasStableWindow(r)?'stable window':r.type==='rom'?'tilt trace':'force trace'):'Compare reps'}</h2><div class="rep-chart-layers"><button data-action="rep-layer" data-layer="average" aria-pressed="${v.average}" ${v.visible.length<2?'disabled':''}><span class="rep-line-key average"></span>Average</button>${r.type==='rom'?'':`<button data-action="rep-layer" data-layer="target" aria-pressed="${v.target}"><span class="rep-line-key target"></span>${r.type==='endurance'?'End threshold':'Target'}</button>`}</div></div>
 <div id="rep-plot-slot">${repForceChart(r,d,v)}</div>
 <div class="rep-scrubber"><label for="rep-time">Inspect time</label><input id="rep-time" type="range" min="0" max="${maxTime}" step="0.01" value="${v.cursor??0}" aria-describedby="rep-readout"><output id="rep-time-value" for="rep-time">${(v.cursor??0).toFixed(2)} s</output></div><p class="rep-readout" id="rep-readout">${repSampleReadout(r,d,v)}</p>
 <p class="rep-data-note">Synthetic traces${selected&&repHasStableWindow(r)?' · Example stable window; detection and stability scoring are not connected.':'. Measurements are illustrative.'}</p></div>
 <aside class="rep-selection"><div class="rep-angle-map">${reportRadial(r,{metric:isMovementMode(r.type)?'force':'peakforce',direction:ui.direction,compact:true})}</div><div class="rep-list-heading"><h2>Repetitions</h2><span>${v.visible.length} / ${d.reps.length} shown</span></div>
 <div class="rep-selector-row all ${v.selected===null?'selected':''}"><input id="rep-all" type="checkbox" data-action="rep-toggle-all" aria-label="Show all reps" ${v.visible.length===d.reps.length?'checked':''}><button data-action="rep-compare" aria-pressed="${v.selected===null}"><strong>Compare reps</strong><small>Overlay and compare efforts</small></button></div>
 ${d.reps.map(rep=>`<div class="rep-selector-row ${v.selected===rep.number?'selected':''}"><input type="checkbox" data-action="rep-toggle" data-rep="${rep.number}" aria-label="Show rep ${rep.number}" ${v.visible.includes(rep.number)?'checked':''}><button data-action="rep-inspect" data-rep="${rep.number}" aria-pressed="${v.selected===rep.number}" aria-label="Inspect rep ${rep.number}"><span class="rep-row-title"><svg viewBox="0 0 28 8" aria-hidden="true"><path d="M0 4H28" stroke="currentColor" stroke-width="2" stroke-dasharray="${repDashPatterns[rep.number-1]}"/></svg><strong>Rep ${rep.number}</strong>${icon('chevron','icon-sm')}</span><small>${isMovementMode(r.type)?escapeHTML(modeRepCaption(r,rep)):rep.force.toFixed(1)+' kg peak · '+Math.round(rep.stability)+'% stable'}</small></button></div>`).join('')}
 <p class="rep-selection-help">Check to show a trace.<br>Select a rep for its measurements.</p></aside></div></section>${reportPrintView(r)}${repPrintDetail(r,d,v)}`;
}
function repPrintDetail(r,d,v){const unit=reportExportSettings().unit;return `<section class="report-print-only rep-print-detail"><h2>${d.angle}° · ${d.name} · ${v.selected?'Rep '+v.selected:'Rep comparison'}</h2>${repMetricStrip(r,d,v,unit)}${repForceChart(r,d,{...v,canvasWidth:800,canvasHeight:390},unit)}<p>Synthetic traces. Stable-window boundaries are examples.</p></section>`;}
function repStableExportRows(r,forceUnit='kg'){
 if(!repHasStableWindow(r))return [];
 const unit=exportForceUnits[forceUnit],f=value=>exportForce(value,forceUnit,2);
 return [[],['Synthetic stable-window detail'],['Direction','Angle','Rep',`Stable force (${unit.label})`,'Ramp (s)','Stable start (s)','Stable end (s)','Stable time (s)',`Std deviation (${unit.label})`,`Stable area (${unit.area})`],...reportData(r).directions.flatMap(d=>d.reps.map(rep=>{const t=repTrace(r,d,rep);return [d.name,d.angle,rep.number,f(t.stableValue),t.stableStart.toFixed(2),t.stableStart.toFixed(2),t.stableEnd.toFixed(2),t.stableTime.toFixed(2),f(t.stdDev),f(t.area)];}))];
}
function repStablePrint(r,forceUnit='kg'){if(!repHasStableWindow(r))return '';const rows=repStableExportRows(r,forceUnit).slice(3),unit=exportForceUnits[forceUnit];return `<section class="print-reps"><h2>Stable-window measurements</h2><p>Statistics from synthetic traces within example window boundaries.</p><table class="data-table"><thead><tr>${['Angle / rep',`Stable force · ${unit.label}`,'Ramp · s','Stable time · s',`Std dev · ${unit.label}`,`Stable area · ${unit.area}`].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${[row[1]+'° / '+row[2],row[3],row[4],row[7],row[8],row[9]].map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;}
function renderRepControl(selector){render();if(selector)$(selector)?.focus({preventScroll:true});}
function openRepReview(rep=null){const ui=reportState();if(ui.page!=='reps')ui.repReturn=ui.page;ui.page='reps';const d=reportData(state.result).directions[ui.direction],v=repViewerState(state.result,d);v.selected=rep;if(rep&&!v.visible.includes(rep))v.visible.push(rep);render();window.scrollTo(0,0);$('.rep-review-heading [data-action="rep-back"]')?.focus({preventScroll:true});}
const repActions={
 'report-reps':()=>openRepReview(),
 'rep-back':()=>{const ui=reportState();ui.page=ui.repReturn||'radial';render();window.scrollTo(0,0);$('[data-action="report-reps"]')?.focus({preventScroll:true});},
 'rep-angle-step':el=>{const ui=reportState();ui.direction=Math.max(0,Math.min(state.result.positions-1,ui.direction+Number(el.dataset.step)));renderRepControl(`[data-action="rep-angle-step"][data-step="${el.dataset.step}"]`);},
 'rep-inspect':el=>{const rep=Number(el.dataset.rep);if(reportState().page!=='reps'){openRepReview(rep);return;}const d=reportData(state.result).directions[reportState().direction],v=repViewerState(state.result,d);v.selected=rep;if(!v.visible.includes(rep))v.visible.push(rep);renderRepControl(`[data-action="rep-inspect"][data-rep="${rep}"]`);},
 'rep-compare':()=>{const d=reportData(state.result).directions[reportState().direction];repViewerState(state.result,d).selected=null;renderRepControl('[data-action="rep-compare"]');},
 'rep-toggle':el=>{const d=reportData(state.result).directions[reportState().direction],v=repViewerState(state.result,d),rep=Number(el.dataset.rep);v.visible=el.checked?[...new Set([...v.visible,rep])]:v.visible.filter(n=>n!==rep);if(!el.checked&&v.selected===rep)v.selected=null;renderRepControl(`[data-action="rep-toggle"][data-rep="${rep}"]`);},
 'rep-toggle-all':el=>{const d=reportData(state.result).directions[reportState().direction],v=repViewerState(state.result,d);v.visible=el.checked?d.reps.map(rep=>rep.number):[];if(!el.checked)v.selected=null;renderRepControl('#rep-all');},
 'rep-layer':el=>{const d=reportData(state.result).directions[reportState().direction],v=repViewerState(state.result,d);v[el.dataset.layer]=!v[el.dataset.layer];renderRepControl(`[data-action="rep-layer"][data-layer="${el.dataset.layer}"]`);}
};
function setRepCursor(time){
 const r=state.result,d=reportData(r).directions[reportState().direction],v=repViewerState(r,d);v.cursor=Math.max(0,Math.min(time,Math.max(...d.reps.map(rep=>rep.seconds))));
 $('#rep-plot-slot').innerHTML=repForceChart(r,d,v);$('#rep-time').value=v.cursor;$('#rep-time-value').textContent=v.cursor.toFixed(2)+' s';$('#rep-readout').textContent=repSampleReadout(r,d,v);
}
document.addEventListener('input',event=>{if(event.target.id==='rep-time')setRepCursor(Number(event.target.value));});
function repPointerSample(event,slot){const bounds=slot.getBoundingClientRect(),r=state.result,d=reportData(r).directions[reportState().direction],left=bounds.width<500?38:58,right=bounds.width-(bounds.width<500?12:24),maxTime=Math.max(...d.reps.map(rep=>rep.seconds));setRepCursor((event.clientX-bounds.left-left)/(right-left)*maxTime);}
document.addEventListener('pointerdown',event=>{const slot=event.target.closest('#rep-plot-slot');if(!slot)return;slot.setPointerCapture(event.pointerId);repPointerSample(event,slot);});
document.addEventListener('pointermove',event=>{const slot=event.target.closest('#rep-plot-slot');if(slot?.hasPointerCapture(event.pointerId))repPointerSample(event,slot);});

function syncRepChartLayout(){
 const slot=document.querySelector('#rep-plot-slot');if(!slot)return;
 const r=state.result,d=reportData(r).directions[reportState().direction],v=repViewerState(r,d),bounds=slot.getBoundingClientRect();
 v.canvasWidth=bounds.width;v.canvasHeight=bounds.height;slot.innerHTML=repForceChart(r,d,v);
 const all=document.querySelector('#rep-all');all.indeterminate=v.visible.length>0&&v.visible.length<d.reps.length;
}
window.addEventListener('resize',syncRepChartLayout);
