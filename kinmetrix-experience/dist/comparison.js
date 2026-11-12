/* Selection and comparison use the same synthetic report records as the reports. */
const comparisonColors=['var(--signal)','var(--ink)','var(--comparison-violet)','var(--comparison-amber)'];
const comparisonDashes=['','7 4','2 4','10 3 2 3'];
function comparisonSignature(r){return `${r.type}:${r.positions}`;}
function memberHistoryRecords(){return [...state.history.filter(r=>r.personId===state.personId),...reportFixtureHistory()].sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));}
function historyCompareUI(){
 state.historyCompareUI??={};
 const key=`${state.actor==='coach'?state.clinicianId:'member'}:${state.personId}`;
 const ui=state.historyCompareUI[key]??={view:'list',filter:'all',selected:[],trendGroup:null};
 const records=memberHistoryRecords();ui.selected=ui.selected.filter(id=>records.some(r=>r.id===id&&!r.partial));return ui;
}
function rosterCompareSelection(){
 const ui=directoryUI().roster,permitted=state.actor==='coach'?visiblePeople():[];
 ui.compareSelected=(ui.compareSelected||[]).filter(id=>permitted.some(p=>p.id===id&&directoryPersonSummary(p).assessment));return ui.compareSelected;
}
function comparisonItems(source){
 if(source==='roster')return rosterCompareSelection().map(id=>{const p=visiblePeople().find(p=>p.id===id);return {r:directoryPersonSummary(p).assessment,label:p.name};});
 const selected=historyCompareUI().selected;return memberHistoryRecords().filter(r=>selected.includes(r.id)).map(r=>({r,label:sessionStamp(r)+' · '+(r.purpose==='assessment'?'Assessment':'Training')}));
}
function comparisonSelectionReason(r,source){
 if(!r||r.partial)return source==='roster'?'No complete Isometric assessment yet.':'Incomplete sessions cannot be compared.';
 const items=comparisonItems(source),selected=items.some(item=>item.r.id===r.id&&item.r.personId===r.personId);
 if(selected)return '';
 if(items.length>=4)return 'Compare up to 4 at a time.';
 if(items.length&&comparisonSignature(items[0].r)!==comparisonSignature(r))return 'Choose results with the same mode and directions.';
 return '';
}
function comparisonCheckbox(source,id,r,label){
 const selected=source==='roster'?rosterCompareSelection():historyCompareUI().selected,reason=comparisonSelectionReason(r,source);
 return `<label class="comparison-checkbox" ${reason?`title="${escapeHTML(reason)}"`:''}><input type="checkbox" data-compare-source="${source}" value="${escapeHTML(id)}" aria-label="Select ${escapeHTML(label)} for comparison${reason?'. '+escapeHTML(reason):''}" ${selected.includes(id)?'checked':''} ${reason?'disabled':''}></label>`;
}
function comparisonSelectionTools(source){
 const count=comparisonItems(source).length;
 return `<div class="comparison-selection-tools"><span class="comparison-selection-count" role="status">${count?count+' selected':source==='roster'?'Select people to compare':'Select sessions to compare'}</span>${count?button('Clear','comparison-clear','ghost small-button',`data-source="${source}"`):''}${button('Compare'+(count?' ('+count+')':''),'comparison-open','small-button',`data-source="${source}" aria-haspopup="dialog" ${count<2?'disabled':''}`)}${source==='roster'?button('Columns','roster-columns','small-button','aria-haspopup="dialog"'):''}</div>`;
}
function memberHistoryPanel(){
 const ui=historyCompareUI(),all=memberHistoryRecords(),records=all.filter(r=>ui.filter==='all'||r.purpose===ui.filter),groups=historyTrendGroups(all);
 return `<section class="session-history" aria-label="Session history"><header class="history-panel-heading"><h2>Session history</h2><span class="muted small">${all.length} ${all.length===1?'session':'sessions'}</span></header>
 <div class="history-toolbar"><div class="segmented" role="group" aria-label="History view">${[['list','List'],['grid','Grid'],['trends','Trends']].map(([view,label])=>`<button data-action="history-view" data-view="${view}" class="${ui.view===view?'active':''}" aria-pressed="${ui.view===view}">${label}</button>`).join('')}</div>
 ${ui.view!=='trends'?`<label class="history-filter"><span class="sr-only">Session type</span><select id="history-purpose-filter">${[['all','All sessions'],['assessment','Assessments'],['training','Training']].map(([key,label])=>`<option value="${key}" ${ui.filter===key?'selected':''}>${label}</option>`).join('')}</select></label>${comparisonSelectionTools('history')}`:groups.length?`<label class="history-filter history-trend-filter"><span class="sr-only">Trend series</span><select id="history-trend-group">${groups.map(group=>`<option value="${group.key}" ${historyTrendGroup(all).key===group.key?'selected':''}>${group.label}</option>`).join('')}</select></label>`:''}</div>
 ${!all.length?'<div class="history-empty"><h3>No sessions yet</h3><p>Assessments and training sessions will appear here.</p></div>':ui.view==='trends'?historyTrendView(all):ui.view==='grid'?historySelectionGrid(records):historySelectionList(records)}</section>`;
}
function historySelectionList(records){
 if(!records.length)return '<div class="history-empty"><h3>No matching sessions</h3><p>Choose another session type to see more results.</p></div>';
 const selected=historyCompareUI().selected,scales=historyRadarScales(memberHistoryRecords());
 return `<div class="history-column-labels selectable-history-labels" aria-hidden="true"><span>Session · date & time</span><span>Clinician / note</span><span>Result</span><span></span></div><ul class="session-history-list">${records.map(r=>{
  const title=protocols[r.type].name+' '+(r.purpose==='assessment'?'assessment':'training'),m=reportMetric(r),data=r.partial?null:reportData(r),result=data?data[m.field].toFixed(1)+' '+m.unit:'Incomplete';
  return `<li class="selectable-history-row ${selected.includes(r.id)?'is-selected':''}">${comparisonCheckbox('history',r.id,r,title+', '+sessionStamp(r))}<button class="session-history-row" data-action="history-open-record" data-id="${escapeHTML(r.id)}" aria-label="Open ${escapeHTML(title)}, ${escapeHTML(sessionStamp(r))}. ${data?m.label+' '+result+(r.type==='rom'?'. Working limits '+(r.applied?'applied.':'awaiting review.'):', stability '+Math.round(data.stability)+' percent.'):'Incomplete session.'}"><span class="history-session-main">${historyRadar(r,scales[m.field])}<span class="history-session-label"><strong>${sessionStamp(r)}</strong><small>${title} · ${r.positions} directions · ${r.reps} ${r.reps===1?'rep':'reps'}${r.partial?' · Partial':''}</small></span></span><span class="history-completed"><span>${escapeHTML(r.clinicianName)}</span><small>${sessionNote(r)?.text?'Note · '+escapeHTML(sessionNote(r).text):''}</small></span><span class="history-result"><strong>${result}</strong><small>${data?(isMovementMode(r.type)?modeHistorySecondary(r,data):m.short+' · '+Math.round(data.stability)+'% stable'):r.completed+' / '+r.total+' reps'}${r.applied&&r.type!=='rom'?' · Limits applied':''}</small></span><span class="history-open" aria-hidden="true"><span>View</span>${icon('chevron','icon-sm')}</span></button></li>`;
 }).join('')}</ul>`;
}
function historyTrendKey(r){return `${r.type}:${r.purpose}:${r.positions}`;}
function historyTrendGroups(records){return [...new Map(records.filter(r=>!r.partial).map(r=>[historyTrendKey(r),{key:historyTrendKey(r),label:`${protocols[r.type].name} ${r.purpose==='assessment'?'assessment':'training'} · ${r.positions} directions`}])).values()];}
function historyTrendGroup(records){const groups=historyTrendGroups(records),ui=historyCompareUI();return groups.find(group=>group.key===ui.trendGroup)||groups[0];}
function historyTrendView(all){
 const group=historyTrendGroup(all);if(!group)return '<div class="history-empty"><h3>No completed sessions yet</h3><p>Trend charts appear after a completed session.</p></div>';
 const records=all.filter(r=>!r.partial&&historyTrendKey(r)===group.key).sort((a,b)=>a.completedAt-b.completedAt),metric=reportMetric(records[0]);
 const measures=[{label:metric.label,unit:metric.unit,value:r=>reportData(r)[metric.field],maximum:metric.field==='range'?45:null},{label:'Stability',unit:'%',value:r=>reportData(r).stability,maximum:100},{label:records[0].type==='rom'?'Range symmetry':records[0].type==='endurance'?'Hold symmetry':'Force symmetry',unit:'% pair match',value:r=>reportPairMatch(reportData(r)),maximum:100}];
 const start=records[0].completedAt,end=records.at(-1).completedAt,x=r=>records.length===1?390:70+640*(r.completedAt-start)/(end-start||1);
 return `<div class="history-trend"><p>${records.length===1?'One session. A trend appears after the next matching session.':'Tap a session point to open its report.'}</p><svg viewBox="0 0 760 525" role="group" aria-label="${escapeHTML(group.label)} history. ${records.length} sessions, oldest to newest.">${measures.map((measure,index)=>{
  const top=30+index*165,bottom=top+108,values=records.map(measure.value).filter(Number.isFinite),maximum=measure.maximum||Math.max(5,Math.ceil(Math.max(...values)/5)*5),y=value=>bottom-value/maximum*96;
  const valid=records.filter(r=>Number.isFinite(measure.value(r))),path=valid.map((r,i)=>`${i?'L':'M'}${x(r)} ${y(measure.value(r))}`).join(' ');
  return `<g><text x="70" y="${top-10}" class="trend-measure-title">${measure.label} · ${measure.unit}</text>${[0,.5,1].map(scale=>`<line x1="70" y1="${y(maximum*scale)}" x2="710" y2="${y(maximum*scale)}" stroke="var(--plot-grid)"/><text x="56" y="${y(maximum*scale)+4}" text-anchor="end" class="trend-tick">${Number((maximum*scale).toFixed(1))}</text>`).join('')}<path d="${path}" fill="none" stroke="var(--plot)" stroke-width="2"/>${valid.map(r=>`<g role="button" tabindex="0" data-action="history-open-record" data-id="${escapeHTML(r.id)}" aria-label="Open ${escapeHTML(sessionStamp(r))} report. ${measure.label}: ${measure.value(r).toFixed(1)} ${measure.unit}."><circle cx="${x(r)}" cy="${y(measure.value(r))}" r="32" fill="transparent"/><circle class="trend-point" cx="${x(r)}" cy="${y(measure.value(r))}" r="5" fill="var(--surface)" stroke="var(--plot)" stroke-width="2"/><title>${escapeHTML(sessionStamp(r))} · ${measure.value(r).toFixed(1)} ${measure.unit}</title></g>`).join('')}</g>`;
 }).join('')}${records.filter((r,index)=>index===0||index===records.length-1||records.length<=6).map(r=>`<text x="${x(r)}" y="506" text-anchor="middle" class="trend-tick">${sessionDate(r).replace(/ \d{4}$/,'')}<tspan x="${x(r)}" dy="14">${sessionTime(r)}</tspan></text>`).join('')}</svg></div>`;
}
function openHistoryRecord(id){
 const r=memberHistoryRecords().find(record=>record.id===id);if(!r)return;
 state.result=r;state.stage='review';state.reportReturnTab='history';state.showCompare=reportCanCompare(r);state.reportDetails=false;render();window.scrollTo(0,0);
}
function openComparison(source){
 const items=comparisonItems(source);if(items.length<2||items.length>4||items.some(item=>comparisonSignature(item.r)!==comparisonSignature(items[0].r)))return;
 openModal('comparison',{source,metric:'primary',relative:false,angle:null});
}
function comparisonDialog(o){
 const items=comparisonItems(o.source),primary=reportMetric(items[0].r),field=o.metric==='stability'?'stability':primary.field,relative=o.relative&&o.metric==='primary'&&['force','duration'].includes(field),unit=relative?'% of own peak':o.metric==='stability'?'%':primary.unit;
 return `<div class="modal-backdrop"><section class="dialog comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><div><h2 id="dialog-title">${o.source==='roster'?'Compare people':'Compare sessions'}</h2><p>${o.source==='roster'?'Latest Isometric assessment per person':'Selected '+protocols[items[0].r.type].name.toLowerCase()+' sessions'} · ${items[0].r.positions} directions</p></div><button class="icon-button" data-action="close-modal" aria-label="Close comparison">${icon('close')}</button></header><div class="comparison-toolbar"><div class="segmented" role="group" aria-label="Comparison measure">${[['primary',primary.label],['stability','Stability']].map(([key,label])=>`<button data-action="comparison-metric" data-metric="${key}" class="${o.metric===key?'active':''}" aria-pressed="${o.metric===key}">${label}</button>`).join('')}</div>${o.metric==='primary'&&['force','duration'].includes(primary.field)?`<label class="comparison-relative"><input type="checkbox" id="comparison-relative" ${relative?'checked':''}>Relative shape</label>`:''}</div><div class="comparison-layout"><div class="comparison-plot"><p class="comparison-axis-title">${o.metric==='stability'?'Stability':primary.short} · ${unit}</p>${comparisonRadar(items,field,relative,o.angle)}<p class="comparison-hint">${relative?'Each session’s highest direction = 100%.':'All results use the same scale.'} Tap an angle for its values.</p></div><section class="comparison-readings" aria-live="polite"><div class="comparison-readings-heading"><h3>${o.angle===null?'Session averages':o.angle+'° · '+reportDirectionNames[o.angle/45]}</h3>${o.angle===null?'':button('All directions','comparison-reset-angle','ghost small-button')}</div><div class="comparison-table-scroll"><table class="data-table comparison-table"><thead><tr><th scope="col">${o.source==='roster'?'Person':'Session'}</th><th scope="col">${primary.short} · ${primary.unit}</th><th scope="col">Stability</th></tr></thead><tbody>${items.map((item,index)=>{const data=reportData(item.r),values=o.angle===null?data:data.directions.find(d=>d.angle===o.angle);return `<tr><th scope="row"><span class="comparison-series" style="--series-color:${comparisonColors[index]}">${comparisonLineKey(index)}<span>${escapeHTML(item.label)}<small>${o.source==='roster'?escapeHTML(sessionStamp(item.r))+' · ':''}${item.r.reps} reps / direction</small></span></span></th><td>${values[primary.field].toFixed(1)}</td><td>${Math.round(values.stability)}%</td></tr>`;}).join('')}</tbody></table></div><p class="comparison-table-note">${relative?'Readings show original units. ':''}Solid and dashed lines identify the selected results.</p></section></div></section></div>`;
}
function comparisonLineKey(index){return `<svg viewBox="0 0 28 10" aria-hidden="true"><path d="M0 5H28" fill="none" stroke="var(--series-color)" stroke-width="2.5" stroke-dasharray="${comparisonDashes[index]}"/></svg>`;}
function comparisonRadar(items,field,relative,angle){
 const data=items.map(item=>reportData(item.r)),peaks=data.map(session=>Math.max(...session.directions.map(d=>d[field]))),maximum=relative||field==='stability'?100:field==='range'?45:Math.max(5,Math.ceil(Math.max(...peaks)/5)*5);
 const value=(d,index)=>relative?d[field]/(peaks[index]||1)*100:d[field];
 return `<svg class="comparison-radial" viewBox="0 15 440 400" role="group" aria-label="Overlaid directional ${field} comparison${relative?', scaled to each session peak':''}.">${[.25,.5,.75,1].map(scale=>`<circle cx="220" cy="215" r="${150*scale}" fill="none" stroke="var(--plot-grid)"/><text x="210" y="${215-150*scale-4}" text-anchor="end" class="radial-scale">${Number((maximum*scale).toFixed(1))}</text>`).join('')}${data[0].directions.map(d=>{const [x,y]=radialPoint(d.angle,1,1);return `<line x1="220" y1="215" x2="${x}" y2="${y}" stroke="var(--plot-grid)"/>`;}).join('')}${data.map((session,index)=>`<polygon points="${session.directions.map(d=>radialPoint(d.angle,value(d,index),maximum).join(',')).join(' ')}" fill="none" stroke="${comparisonColors[index]}" stroke-width="2.3" stroke-dasharray="${comparisonDashes[index]}"/>`).join('')}${angle===null?'':data.map((session,index)=>{const d=session.directions.find(d=>d.angle===angle),[x,y]=radialPoint(angle,value(d,index),maximum);return `<circle cx="${x}" cy="${y}" r="5" fill="var(--surface)" stroke="${comparisonColors[index]}" stroke-width="2"/>`;}).join('')}${data[0].directions.map(d=>{const [x,y]=radialPoint(d.angle,1,1,220,215,174);return `<g role="button" tabindex="0" data-action="comparison-angle" data-angle="${d.angle}" aria-label="Compare ${d.name}, ${d.angle} degrees" aria-pressed="${angle===d.angle}"><circle cx="${x}" cy="${y}" r="30" fill="transparent"/><text x="${x}" y="${y+5}" text-anchor="middle" class="radial-angle" fill="${angle===d.angle?'var(--signal)':'var(--muted)'}">${d.angle}°</text></g>`;}).join('')}${personOrientation(220,215,.85)}</svg>`;
}
function refreshComparison(source,focusId=null){
 if(source==='roster')refreshRoster();else render();
 if(focusId!==null)$(`input[data-compare-source="${source}"][value="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});
}
const comparisonActions={
 'history-view':el=>{const ui=historyCompareUI();ui.view=['list','grid','trends'].includes(el.dataset.view)?el.dataset.view:'list';render();$(`[data-action="history-view"][data-view="${ui.view}"]`)?.focus({preventScroll:true});},
 'history-open-record':el=>openHistoryRecord(el.dataset.id),
 'comparison-open':el=>openComparison(el.dataset.source),
 'comparison-clear':el=>{const source=el.dataset.source;if(source==='roster')directoryUI().roster.compareSelected=[];else historyCompareUI().selected=[];refreshComparison(source);$(`[data-action="comparison-open"][data-source="${source}"]`)?.focus({preventScroll:true});},
 'comparison-metric':el=>{if(state.overlay?.type!=='comparison')return;state.overlay.metric=el.dataset.metric==='stability'?'stability':'primary';renderOverlay();$(`[data-action="comparison-metric"][data-metric="${state.overlay.metric}"]`)?.focus({preventScroll:true});},
 'comparison-angle':el=>{if(state.overlay?.type!=='comparison')return;state.overlay.angle=Number(el.dataset.angle);renderOverlay();$(`[data-action="comparison-angle"][data-angle="${state.overlay.angle}"]`)?.focus({preventScroll:true});},
 'comparison-reset-angle':()=>{if(state.overlay?.type!=='comparison')return;state.overlay.angle=null;renderOverlay();$('[data-action="comparison-metric"]')?.focus({preventScroll:true});}
};
document.addEventListener('change',event=>{
 const el=event.target,source=el.dataset.compareSource;
 if(source==='history'||source==='roster'){
  const r=source==='roster'?visiblePeople().filter(()=>state.actor==='coach').map(p=>({p,r:directoryPersonSummary(p).assessment})).find(item=>item.p.id===el.value)?.r:memberHistoryRecords().find(r=>r.id===el.value);
  const reason=el.checked?comparisonSelectionReason(r,source):'',selected=source==='roster'?rosterCompareSelection():historyCompareUI().selected;
  if(el.checked&&!reason&&!selected.includes(el.value))selected.push(el.value);else if(!el.checked){const index=selected.indexOf(el.value);if(index>=0)selected.splice(index,1);}
  refreshComparison(source,el.value);
 }else if(el.id==='history-purpose-filter'){historyCompareUI().filter=el.value;render();$('#history-purpose-filter')?.focus({preventScroll:true});}
 else if(el.id==='history-trend-group'){historyCompareUI().trendGroup=el.value;render();$('#history-trend-group')?.focus({preventScroll:true});}
 else if(el.id==='comparison-relative'&&state.overlay?.type==='comparison'){state.overlay.relative=el.checked;renderOverlay();$('#comparison-relative')?.focus({preventScroll:true});}
});
