/* Report interaction model. All readings and stability values are synthetic.
   The score 4/6 is an example from the supplied report, not a clinical rule. */
const reportDirectionNames=['Forward flexion','Right diagonal flexion','Right flexion','Right diagonal extension','Rear extension','Left diagonal extension','Left flexion','Left diagonal flexion'];
const reportReference={force:[19.9,14.6,15.6,13.7,19.0,18.8,15.8,15.9],stability:[95,94,92,89,90,92,85,89],duration:[24.8,23.3,25.6,21.7,27.2,23.8,26.0,23.5]};
const reportPairDefinitions=[
 {name:'Flexion ↔ extension',a:0,b:180},
 {name:'Left ↔ right lateral',a:270,b:90},
 {name:'Back-left ↔ front-right',a:225,b:45},
 {name:'Front-left ↔ back-right',a:315,b:135},
 {name:'Front-left ↔ front-right',a:315,b:45},
 {name:'Back-left ↔ back-right',a:225,b:135}
];
function mean(numbers){return numbers.reduce((sum,n)=>sum+n,0)/numbers.length;}
function reportData(r){
 if(isMovementMode(r.type))return modeReportData(r);
 if(r.analysis)return r.analysis;
 const directions=Array.from({length:r.positions},(_,i)=>{
  const angle=i*360/r.positions,j=angle/45,earlier=r.fixture&&r.type==='strength'&&r.date==='2 Nov',force=Number(((earlier?[19.1,13.7,14.5,12.9,18.4,18.2,15.5,15.0]:reportReference.force)[j]*recordTarget(r,angle)/12).toFixed(1)),stability=reportReference.stability[j]-(earlier?3:0);
  const reps=Array.from({length:r.reps},(_,k)=>({number:k+1,force:Number((force*(1+(k-(r.reps-1)/2)*.045)).toFixed(1)),stability:Math.min(100,stability+k-(r.reps-1)/2),seconds:r.type==='endurance'?Number((reportReference.duration[j]+(k-(r.reps-1)/2)*1.2).toFixed(1)):6,range:Math.min(100,(r.values?.[i]||80)+k-(r.reps-1)/2)}));
  const recorded=(r.repRecords||[]).filter(rep=>rep.angle===angle);
  if(recorded.length)reps.forEach((rep,index)=>{const actual=recorded[index];if(actual){rep.force=Number(actual.value.toFixed(1));rep.seconds=actual.seconds;}});
  return {angle,name:reportDirectionNames[j],force:Number(mean(reps.map(x=>x.force)).toFixed(1)),stability:mean(reps.map(x=>x.stability)),duration:mean(reps.map(x=>x.seconds)),range:mean(reps.map(x=>x.range)),reps};
 });
 const pairs=reportPairDefinitions.filter(p=>directions.some(d=>d.angle===p.a)&&directions.some(d=>d.angle===p.b)).map(p=>{const a=directions.find(d=>d.angle===p.a),b=directions.find(d=>d.angle===p.b);return {...p,first:a.force,second:b.force,percent:Math.round(Math.min(a.force,b.force)/Math.max(a.force,b.force)*100)};});
 const frontBack=mean(directions.filter(d=>[0,180].includes(d.angle)).map(d=>d.force)),leftRight=mean(directions.filter(d=>[90,270].includes(d.angle)).map(d=>d.force));
 r.analysis={directions,pairs,force:mean(directions.map(d=>d.force)),stability:mean(directions.map(d=>d.stability)),duration:mean(directions.map(d=>d.duration)),range:mean(directions.map(d=>d.range)),ratio:frontBack/leftRight,exampleScore:r.positions===8?'4 / 6':null};
 return r.analysis;
}
function reportState(){
 if(!state.reportUI||state.reportUI.id!==state.result.id||state.reportUI.personId!==state.result.personId)state.reportUI={id:state.result.id,personId:state.result.personId,page:'radial',metric:'force',direction:0,pair:0,overlay:reportCanCompare(state.result)?'previous':'stability'};
 state.reportNotes??={};return state.reportUI;
}
function reportMetric(r){if(isMovementMode(r.type))return modeReportMetric(r);return r.type==='endurance'?{field:'duration',label:'Sustained effort',short:'Endurance',unit:'s'}:r.type==='rom'?{field:'range',label:'Directional range',short:'Range',unit:'%'}:{field:'force',label:'Avg peak force',short:'Force',unit:'kg'};}
function historyFixture(type='strength',date='9 Nov',personId=state.personId){
 const p=people.find(p=>p.id===personId);
 return {id:'fixture-'+type+'-'+date,personId,clinicianName:clinicians.find(c=>c.id===p.assigned).name,type,purpose:date==='6 Nov'?'training':'assessment',positions:8,reps:3,weight:p.target||12,values:exampleValues(type,8),partial:false,date,completedAt:Date.UTC(2026,10,parseInt(date,10),type==='rom'?16:14,30),completed:24,total:24,applied:type==='rom',fixture:true};
}
function historyRadarScales(records){
 const scales={force:0,duration:0,range:45};
 records.filter(r=>!r.partial).forEach(r=>{const field=reportMetric(r).field;if(field==='range')return;const maximum=Math.max(...reportData(r).directions.map(d=>d[field]));scales[field]=Math.max(scales[field],Math.ceil(maximum/5)*5);});
 return scales;
}
function historyRadar(r,maximum){
 if(r.partial)return `<span class="history-radar-unavailable" aria-hidden="true">—</span>`;
 const data=reportData(r),field=reportMetric(r).field,point=(angle,value,max)=>radialPoint(angle,value,max,38,40,28),polygon=(key,max)=>data.directions.map(d=>point(d.angle,d[key],max).join(',')).join(' ');
 return `<svg class="history-radar" viewBox="0 0 76 76" aria-hidden="true" focusable="false">
 <circle cx="38" cy="40" r="28" class="history-radar-grid"/><circle cx="38" cy="40" r="14" class="history-radar-grid"/>
 ${data.directions.map(d=>{const [x,y]=point(d.angle,1,1);return `<line x1="38" y1="40" x2="${x}" y2="${y}" class="history-radar-grid"/>`;}).join('')}
 <path d="M38 4V9" class="history-radar-forward"/>
 <polygon points="${r.type==='rom'?data.directions.map(d=>point(d.angle,modeWorkingLimit(d,r.appliedPercent||80),maximum).join(',')).join(' '):polygon('stability',100)}" class="history-radar-stability"/>
 <polygon points="${polygon(field,maximum)}" class="history-radar-measure"/>
 ${personOrientation(38,40,.17)}</svg>`;
}
function sessionHistoryView(){return memberHistoryPanel();}
function reportFixtureHistory(personId=state.personId){return [...(people.find(p=>p.id===personId)?.baseline?[historyFixture('strength','9 Nov',personId),historyFixture('strength','6 Nov',personId),historyFixture('strength','2 Nov',personId),historyFixture('rom','2 Nov',personId)]:[]),...memberPrograms(personId).flatMap(plan=>plan.exampleVisits||[])];}
function reportPreviousSession(r){
 if(r.partial)return null;
 const time=r.completedAt??Number(r.id?.replace('session-',''));
 return [...state.history,...reportFixtureHistory()].filter(previous=>previous.personId===r.personId&&previous.id!==r.id&&!previous.partial&&previous.type===r.type&&previous.purpose===r.purpose&&previous.positions===r.positions&&previous.reps===r.reps&&(previous.completedAt??Number(previous.id?.replace('session-','')))<time).sort((a,b)=>(b.completedAt??Number(b.id.replace('session-','')))-(a.completedAt??Number(a.id.replace('session-',''))))[0]||null;
}
function reportCanCompare(r){return !!reportPreviousSession(r);}
function reportPairMatch(data){return data.pairs.length?mean(data.pairs.map(pair=>pair.percent)):null;}
function reportChange(current,previous,points=false){
 if(!Number.isFinite(previous)||!Number.isFinite(current)||(!points&&previous===0))return null;
 const change=points?current-previous:(current-previous)/previous*100,rounded=Number(change.toFixed(points?0:1));
 return {trend:rounded>0?'up':rounded<0?'down':'same',text:rounded===0?'No change':`${rounded>0?'+':'−'}${Math.abs(rounded)}${points?' pts':'%'}`};
}
function reportChangeMarkup(current,previous,prior,points=false,neutral=false){
 if(!prior)return '<span class="metric-change baseline">First comparable session</span>';
 const change=reportChange(current,previous,points);
 return `<span class="metric-change ${neutral?'same':change?.trend||'same'}" title="Numerical change; may include measurement variation"><b>${change?.text||'No comparison'}</b><span>vs ${escapeHTML(sessionStamp(prior))}</span></span>`;
}
function radialPoint(angle,value,maximum,cx=220,cy=215,radius=150){const rad=(angle-90)*Math.PI/180,dist=radius*value/maximum;return [cx+Math.cos(rad)*dist,cy+Math.sin(rad)*dist];}
function reportRadialMaximum(r,field=reportMetric(r).field,previous=null){
 return field==='stability'?100:field==='range'?45:Math.max(5,Math.ceil(Math.max(...[...reportData(r).directions,...(previous?.directions||[])].map(d=>Math.max(d[field],...d.reps.map(rep=>field==='duration'?rep.seconds:rep[field]))))/5)*5);
}
function radialValueCallout(d,value,unit,x,y,detail=null){
 const width=130,height=56,bx=x<220?Math.max(74,x-width-16):Math.min(244,x+16),by=y>250?y-height-14:y+14;
 const tx=Math.max(bx,Math.min(bx+width,x)),ty=y<by?by:by+height;
 return `<g class="radial-value-callout" pointer-events="none" aria-hidden="true"><path d="M${x} ${y}L${tx} ${ty}" fill="none" stroke="var(--signal)" stroke-width="1.5"/><rect x="${bx}" y="${by}" width="${width}" height="${height}" rx="7" fill="var(--surface)" stroke="var(--signal)" stroke-width="1"/><text x="${bx+12}" y="${by+24}" class="radial-callout-value">${value.toFixed(1)} ${unit}</text><text x="${bx+12}" y="${by+43}" class="radial-callout-detail">${escapeHTML(detail||Math.round(d.stability)+'% stability')}</text></g>`;
}
function reportRadial(r,{metric='force',overlay='none',direction=0,pair=0,compact=false,interactive=true,orientation='down',forceUnit='kg',scaleLabels=!compact,directionAction='report-direction',pointCallout=false}={}){
 const data=reportData(r),primary=reportMetric(r),field=metric==='stability'?'stability':['symmetry','peakforce'].includes(metric)?'force':primary.field;
 const unit=field==='force'?exportForceUnits[forceUnit].label:metric==='stability'?'%':primary.unit,factor=field==='force'?exportForceUnits[forceUnit].factor:1;
 const offset=orientation==='up'?180:0,point=(angle,...args)=>radialPoint(angle+offset,...args);
 const prior=overlay==='previous'?reportPreviousSession(r):null,previous=prior?reportData(prior):null;
 const max=reportRadialMaximum(r,field,previous);
 const selectedPair=data.pairs[pair]||data.pairs[0],selectedAngle=data.directions[direction]?.angle??0;
 const highlighted=metric==='symmetry'?[selectedPair.a,selectedPair.b]:direction===null?[]:[selectedAngle];
 const polygon=(key,earlier=false)=>data.directions.map(d=>point(d.angle,earlier?previous.directions.find(old=>old.angle===d.angle)[key]:d[key],key==='stability'?100:max).join(',')).join(' ');
 const compare=!!previous,showStability=overlay==='stability'&&metric==='force'&&r.type!=='rom';
 return `<svg class="report-radial ${compact?'compact':''}" viewBox="${directionAction==='overview-direction'?'0 15 440 400':'0 0 440 430'}" role="${interactive?'group':'img'}" aria-label="${interactive?'Interactive ':''}${metric==='symmetry'?'force symmetry':field} radial${showStability?' with stability layer':''}${compare?', comparing '+r.date+' with '+prior.date:''}. Person viewed from above, facing forward toward 0 degrees at the ${orientation==='up'?'bottom':'top'}">
 ${[.25,.5,.75,1].map(scale=>`<circle cx="220" cy="215" r="${150*scale}" fill="none" stroke="var(--plot-grid)" stroke-width="1"/>`).join('')}
 ${data.directions.map(d=>{const [x,y]=point(d.angle,1,1);return `<line x1="220" y1="215" x2="${x}" y2="${y}" stroke="var(--plot-grid)" stroke-width="1"/>`;}).join('')}
 ${showStability?`<polygon class="stability-area" points="${polygon('stability')}" fill="var(--plot-reference)" fill-opacity=".12" stroke="var(--plot-reference)" stroke-width="1.5" stroke-dasharray="2 4"/>`:''}
 ${overlay==='working'&&r.type==='rom'?`<polygon points="${data.directions.map(d=>point(d.angle,modeWorkingLimit(d,r.appliedPercent||80),max).join(',')).join(' ')}" fill="none" stroke="var(--plot-reference)" stroke-width="2" stroke-dasharray="6 5"/>`:''}
 ${compare?`<polygon class="report-previous-polygon" points="${polygon(field,true)}" fill="none" stroke="var(--plot-reference)" stroke-width="2" stroke-dasharray="6 5"/>`:''}
 <polygon class="report-current-polygon" points="${polygon(field)}" fill="${compare?'var(--signal-fill)':'var(--plot-fill)'}" stroke="${compare?'var(--signal)':'var(--plot)'}" stroke-width="2.2"/>
 ${metric==='symmetry'?highlighted.map(angle=>{const d=data.directions.find(x=>x.angle===angle),[x,y]=point(angle,d.force,max);return `<line x1="220" y1="215" x2="${x}" y2="${y}" stroke="var(--signal)" stroke-width="3"/>`;}).join(''):''}
 ${scaleLabels&&directionAction==='overview-direction'?`<g><line x1="60" y1="33" x2="78" y2="33" stroke="var(--plot)" stroke-width="2.2"/><text x="86" y="37" class="radial-scale radial-scale-heading">${primary.short} · ${unit}</text>${showStability?'<line x1="280" y1="33" x2="298" y2="33" stroke="var(--plot-reference)" stroke-width="1.5" stroke-dasharray="2 4"/><text x="306" y="37" class="radial-scale radial-scale-heading">Stability · %</text>':''}</g>`:''}
 ${scaleLabels?(directionAction==='overview-direction'?[0,.25,.5,.75,1]:[.25,.5,.75,1]).map(scale=>`<text x="${directionAction==='overview-direction'?195:190}" y="${215-150*scale+14}" text-anchor="end" class="radial-scale">${Number((max*scale*factor).toFixed(1))}${directionAction==='overview-direction'?'':' '+unit}</text>${showStability?`<text x="${directionAction==='overview-direction'?245:250}" y="${215-150*scale+14}" class="radial-scale">${scale*100}${directionAction==='overview-direction'?'':'%'}</text>`:''}`).join(''):''}
 ${data.directions.map((d,i)=>{const [x,y]=point(d.angle,d[field],max),[lx,ly]=point(d.angle,1,1,220,215,174),active=highlighted.includes(d.angle);return `<g ${interactive?`role="button" tabindex="0" data-action="${directionAction}" data-index="${i}" aria-label="${escapeHTML(d.name)}, ${d.angle} degrees, ${(d[field]*factor).toFixed(1)} ${unit}${r.type==='rom'?', working limit '+modeWorkingLimit(d,r.appliedPercent||80)+' degrees':', stability '+Math.round(d.stability)+' percent'}" aria-pressed="${active}"`:''} class="radial-direction ${active?'selected':''}">${interactive?`<circle cx="${x}" cy="${y}" r="${directionAction==='overview-direction'?30:21}" fill="transparent"/>${showStability?`<circle cx="${point(d.angle,d.stability,100)[0]}" cy="${point(d.angle,d.stability,100)[1]}" r="${directionAction==='overview-direction'?30:21}" fill="transparent"/>`: ""}`:''}<circle cx="${x}" cy="${y}" r="${active?6:4}" fill="${active?'var(--signal)':'var(--surface)'}" stroke="${active||compare?'var(--signal)':'var(--plot)'}" stroke-width="2"/><circle cx="${lx}" cy="${ly}" r="${directionAction==='overview-direction'?30:21}" fill="transparent"/><text x="${lx}" y="${ly+5}" text-anchor="middle" class="radial-angle" fill="${active?'var(--signal)':'var(--muted)'}">${d.angle+'°'}</text></g>`}).join('')}
 <g transform="rotate(${offset} 220 215)">${personOrientation(220,215,.85)}</g>${pointCallout?(()=>{const d=data.directions[direction]||data.directions[0],[x,y]=point(d.angle,d[field],max);return radialValueCallout(d,d[field]*factor,unit,x,y,r.type==='rom'?modeWorkingLimit(d,r.appliedPercent||80)+'° working limit':r.type==='endurance'?d.force.toFixed(1)+' kg peak force':null);})():''}</svg>`;
}
function reportSummary(r,ui){
 const data=reportData(r),m=reportMetric(r),prior=reportPreviousSession(r),previous=prior?reportData(prior):null;
 return `<div class="report-metric-tabs" role="group" aria-label="Radial metric">${[
 ['force',m.label,data[m.field],m.unit,previous?.[m.field],m.field==='range'],
 ['stability','Stability',data.stability,'%',previous?.stability,true],
 ['symmetry','Force symmetry',reportPairMatch(data),'% pair match',previous?reportPairMatch(previous):null,true]
 ].map(([key,label,value,unit,before,points])=>`<button data-action="report-metric" data-metric="${key}" aria-pressed="${ui.metric===key&&ui.page==='radial'}" class="metric-tab ${ui.metric===key&&ui.page==='radial'?'active':''}"><span>${label}</span><strong>${r.partial?'—':Number(value).toFixed(key==='force'?1:0)} <small>${r.partial?'':unit}</small></strong>${r.partial?'':reportChangeMarkup(value,before,prior,points,key==='symmetry')}</button>`).join('')}</div>`;
}
function reportView(){
 if(isMovementMode(state.result.type))return modeReportView(state.result);
 const r=state.result,ui=reportState(),data=reportData(r),m=reportMetric(r);
 if(ui.page==='reps'&&!r.partial)return repReviewView(r,ui);
 return `<div class="report-screen"><div class="report-title-row"><div><h1>${sessionStamp(r)}</h1><p>${protocols[r.type].name} ${r.purpose}${r.partial?' · Ended early':''}${r.programName?' · '+escapeHTML(r.programName):''} · ${r.completed} / ${r.total} reps</p></div><div class="button-row"><span class="note-action">${sessionNoteTop(r)}</span>${sessionPlanReportButton(r)}${button('Export','export-report','small-button')}${button(state.actor==='member'||state.guided?'Finish':'Done','finish-review','primary small-button')}</div></div>
 ${r.partial?'<div class="notice">Incomplete session. Directional comparisons and profile changes are unavailable.</div>':''}
 ${sessionNoteLine(r)}${sessionProgramSummary(r)}${reportSummary(r,ui)}
 <nav class="report-navigation" aria-label="Report views">${[['radial','Radial overview'],['directions','Directions & reps'],['history','History & notes']].map(([key,label])=>`<button data-action="report-page" data-page="${key}" class="${ui.page===key?'active':''}" ${ui.page===key?'aria-current="page"':''}>${label}</button>`).join('')}<span class="report-data-label">Synthetic example data</span></nav>
 ${r.partial?`<div class="empty-state"><h2>${r.completed} reps recorded</h2><p>Complete a session to see a full directional report. This partial example cannot update working settings.</p></div>`:ui.page==='radial'?reportRadialView(r,ui):ui.page==='directions'?reportDirectionsView(r,ui):reportHistoryView(r,ui)}
 ${r.type==='rom'&&!r.partial?reportROMReview(r):''}
 <details class="report-methods"><summary>About these measures</summary><p>Average peak force and stability are shown for each direction. Direction values aggregate the displayed example reps. Stability percentages are fixtures: the production calculation is not implemented. Pair percentages show the smaller force divided by the larger; 100% means the two values match. The headline symmetry percentage is the average match across the listed pairs. Changes in stability, range, and pair match are percentage points (pts); force and endurance changes are relative percentages. Comparisons use the most recent earlier complete session with the same person, mode, purpose, directions, and rep count. Reference ratios and coach alert tolerances are explained in the symmetry panel. Green and red indicate numerical direction, not a statistically significant change. A matching percentage is not a clinical judgement. All measurements and history here are simulated.</p></details></div>${reportPrintView(r)}`;
}
function reportRadialView(r,ui){
 const data=reportData(r),m=reportMetric(r),d=data.directions[ui.direction]||data.directions[0],symmetry=ui.metric==='symmetry',stability=ui.metric==='stability';
 const prior=reportPreviousSession(r),previous=prior?reportData(prior).directions.find(old=>old.angle===d.angle):null,comparing=ui.overlay==='previous'&&!!prior;
 return `<div class="report-explore"><section class="report-chart-region"><div class="report-chart-toolbar"><h2>${symmetry?'Paired directions':stability?'Stability by direction':m.label+' by direction'}</h2><div class="report-layer-controls">${!stability&&!symmetry?`<button data-action="report-overlay" data-overlay="stability" aria-pressed="${ui.overlay==='stability'}">Stability layer</button>`:''}<button data-action="report-overlay" data-overlay="previous" aria-pressed="${comparing}" ${!prior?'disabled':''}>Previous session</button></div></div>
 <div class="chart-legend"><span class="legend-item"><span class="legend-swatch ${comparing?'current-comparison':''}"></span>This session · ${escapeHTML(sessionStamp(r))}</span>${comparing?`<span class="legend-item"><span class="legend-swatch previous"></span>Previous · ${escapeHTML(sessionStamp(prior))}</span>`:''}${ui.overlay==='stability'&&!stability&&!symmetry?'<span class="legend-item"><span class="stability-swatch"></span>Stability · %</span>':''}</div>
 ${reportRadial(r,{metric:ui.metric,overlay:ui.overlay,direction:ui.direction,pair:ui.pair})}
 <p class="report-chart-hint">${symmetry?'Choose a pair to highlight it on the radial.':'Tap a direction to explore its results.'}</p></section>
 <aside class="report-inspector">${symmetry?reportSymmetryPanel(r,ui):`<div class="inspector-heading"><span>${d.angle}°</span><h2>${d.name}</h2></div><div class="direction-metrics"><div><span>Avg peak force</span><strong>${d.force.toFixed(1)} <small>kg</small></strong>${reportChangeMarkup(d.force,previous?.force,prior)}</div><div><span>Stability</span><strong>${Math.round(d.stability)}<small>%</small></strong>${reportChangeMarkup(d.stability,previous?.stability,prior,true)}</div>${m.field!=='force'?`<div><span>${m.label}</span><strong>${d[m.field].toFixed(1)} <small>${m.unit}</small></strong>${reportChangeMarkup(d[m.field],previous?.[m.field],prior,m.field==='range')}</div>`:''}</div>${button('Explore '+r.reps+' reps '+icon('chevron','icon-sm'),'report-reps','small-button')}<div class="report-context"><h3>${prior?'Compared with '+escapeHTML(sessionStamp(prior)):'First comparable session'}</h3><p>${prior?`Same ${r.purpose}, ${r.positions} directions and ${r.reps} reps per direction.`:'This session establishes a baseline. Change will appear after a matching session.'}</p></div>`}</aside></div>`;
}
function reportSymmetryPanel(r,ui){return symmetryPanel(r,ui);}
function reportDirectionsView(r,ui){const data=reportData(r),d=data.directions[ui.direction]||data.directions[0],m=reportMetric(r),sparkScale=repSparklineScale(r);return `<div class="report-direction-layout"><section><div class="section-title"><h2>Every direction, in detail</h2><span class="small muted">Select a row</span></div><div class="table-scroll"><table class="data-table direction-table"><thead><tr><th scope="col">Direction</th><th scope="col" class="rep-sparkline-column" title="Average force over time. Same scale across directions.">Avg rep</th><th>Avg peak force</th><th>Stability</th>${m.field!=='force'?`<th>${m.label}</th>`:''}<th>Reps</th></tr></thead><tbody>${data.directions.map((row,i)=>`<tr class="${i===ui.direction?'selected':''}"><td><button data-action="report-direction-row" data-index="${i}" aria-pressed="${i===ui.direction}"><strong>${row.name}</strong><small>${row.angle}°</small></button></td><td class="rep-sparkline-column">${repSparkline(r,row,sparkScale)}</td><td>${row.force.toFixed(1)} kg</td><td>${Math.round(row.stability)}%</td>${m.field!=='force'?`<td>${row[m.field].toFixed(1)} ${m.unit}</td>`:''}<td>${row.reps.length}</td></tr>`).join('')}</tbody></table></div></section><aside class="report-rep-panel"><h2>${d.name}</h2><p class="small muted">${d.angle}° · ${r.reps} repetitions</p>${reportRadial(r,{direction:ui.direction,metric:'force',compact:true})}<table class="data-table rep-table"><thead><tr><th>Rep</th><th>Peak force</th><th>Stability</th>${m.field!=='force'?`<th>${m.unit}</th>`:''}</tr></thead><tbody>${d.reps.map(rep=>`<tr><td><button data-action="rep-inspect" data-rep="${rep.number}" aria-label="Inspect rep ${rep.number}">${rep.number}</button></td><td>${rep.force.toFixed(1)} kg</td><td>${Math.round(rep.stability)}%</td>${m.field!=='force'?`<td>${(m.field==='duration'?rep.seconds:rep.range).toFixed(1)}</td>`:''}</tr>`).join('')}</tbody></table>${button('Compare rep charts '+icon('chevron','icon-sm'),'report-reps','small-button')}<p class="small muted">Example repetitions; production scoring is not connected.</p></aside></div>`;}
function reportNoteKey(r){return `${r.personId}:${r.id}`;}
function reportHistoryView(r,ui){const prior=reportPreviousSession(r),note=state.reportNotes[reportNoteKey(r)],canWrite=state.actor==='coach'&&!state.guided;return `<div class="report-history-layout"><section><h2>Session history</h2><p class="muted">Compare sessions with the same mode, directions, and rep count.</p><div class="history-session current"><span><strong>${sessionStamp(r)} · This session</strong><small>${protocols[r.type].name} · ${r.positions} directions · ${r.reps} reps</small></span><span class="badge neutral">Current</span></div>${reportCanCompare(r)?`<div class="history-session"><span><strong>${escapeHTML(sessionStamp(prior))} · Previous session</strong><small>Same mode, purpose, directions and rep count</small></span>${button('Compare','report-compare','small-button')}</div>`:`<div class="report-context"><h3>No previous session</h3><p>No previous comparable example is available for this member.</p></div>`}<div class="history-chart-preview">${reportRadial(r,{metric:'force',overlay:reportCanCompare(r)?'previous':'none',compact:true,interactive:false})}</div></section><section class="report-notes"><h2>Session notes</h2><p class="muted">Record positioning, effort, or interruptions.</p>${canWrite?`<label class="field-label" for="session-note">Note for this session</label><textarea id="session-note" rows="6" maxlength="2000" placeholder="Positioning, effort, interruptions, or context for next time…">${escapeHTML(note?.text||'')}</textarea><div class="button-row">${button('Save note','save-report-note','primary small-button')}</div>`:`<div class="read-only-note">${note?escapeHTML(note.text):'No note has been added to this example.'}</div>`}${note?`<p class="note-saved">Saved by ${escapeHTML(note.author)} · ${escapeHTML(note.time)}</p>`:''}<p class="small muted">Notes stay in this browser session and are included in print and CSV export. Resetting the demo clears them.</p></section></div>`;}
function reportROMReview(r){return `<section class="report-rom-review"><div><h3>${r.fixture?'Personal working range':r.applied?'Working range updated':'Personal working range'}</h3><p>${r.fixture?'This example is the source of the current working settings.':r.applied?'Future sessions use '+workingRangeLabel()+' of the accepted assessed range.':'Measurements are saved separately. A coach reviews them before changing future settings.'}</p></div>${state.actor==='coach'&&!state.guided&&!r.applied&&!r.fixture?button('Review & apply limits','apply-limits','small-button'):r.applied?`<span class="badge neutral">Applied by ${escapeHTML(profile().reviewer)}</span>`:''}</section>`;}
function reportPrintView(r){if(isMovementMode(r.type))return modePrintView(r);const settings=reportExportSettings(),unit=exportForceUnits[settings.unit].label,f=value=>exportForce(value,settings.unit),data=reportData(r),note=state.reportNotes?.[reportNoteKey(r)];return `<article class="report-print-only">${fullBrand()}<h1>${escapeHTML(person().name)}</h1><p>${protocols[r.type].name} ${r.purpose} · ${sessionStamp(r)} · ${escapeHTML(r.programName||'Standard program · example')}</p><p class="print-export-settings">Force unit: ${unit} · ${exportOrientationLabel(settings.orientation)}</p><p>Synthetic example data. ${r.partial?'Incomplete session: directional results excluded.':''}</p>${r.partial?'':`<div class="print-summary"><span>Avg peak force <strong>${f(data.force)} ${unit}</strong></span><span>Stability <strong>${Math.round(data.stability)}%</strong></span><span>Symmetry <strong>${Math.round(reportPairMatch(data))}% pair match</strong></span></div><div class="print-radials"><div><h2>Avg peak force</h2>${reportRadial(r,{metric:'peakforce',overlay:'none',compact:true,interactive:false,orientation:settings.orientation,forceUnit:settings.unit})}</div><div><h2>Stability by direction</h2>${reportRadial(r,{metric:'stability',compact:true,interactive:false,orientation:settings.orientation,forceUnit:settings.unit})}</div></div><h2>Direction results</h2><table class="data-table"><thead><tr><th>Direction</th><th>Angle</th><th>Avg peak force</th><th>Stability</th><th>Reps</th></tr></thead><tbody>${data.directions.map(d=>`<tr><td>${d.name}</td><td>${d.angle}°</td><td>${f(d.force)} ${unit}</td><td>${Math.round(d.stability)}%</td><td>${d.reps.length}</td></tr>`).join('')}</tbody></table><h2>Force symmetry</h2><table class="data-table"><tbody>${data.pairs.map(p=>`<tr><td>${p.name}</td><td>${p.a}° / ${p.b}°</td><td>${p.percent}%</td></tr>`).join('')}<tr><td>Front–back : left–right</td><td colspan="2">${data.ratio.toFixed(1)} : 1</td></tr></tbody></table><section class="print-reps"><h2>Repetitions</h2><table class="data-table"><thead><tr><th>Direction</th><th>Rep</th><th>Peak force</th><th>Stability</th><th>Duration</th><th>Range</th></tr></thead><tbody>${data.directions.flatMap(d=>d.reps.map(rep=>`<tr><td>${d.name} · ${d.angle}°</td><td>${rep.number}</td><td>${f(rep.force)} ${unit}</td><td>${Math.round(rep.stability)}%</td><td>${rep.seconds.toFixed(1)} s</td><td>${rep.range.toFixed(1)}% demo scale</td></tr>`)).join('')}</tbody></table></section>${repStablePrint(r,settings.unit)}`}<h2>Session notes</h2><p>${note?escapeHTML(note.text):'No session note.'}</p>${note?`<p>${escapeHTML(note.author)} · ${escapeHTML(note.time)}</p>`:''}<p>All readings are illustrative. Stability and the symmetry score are not validated calculations. Pair percentages compare the smaller force with the larger; they do not establish a clinical threshold.</p></article>`;}
function reportExportRows(r,settings=reportExportSettings()){
 if(isMovementMode(r.type))return modeExportRows(r,settings);
 const data=reportData(r),note=state.reportNotes?.[reportNoteKey(r)],unit=exportForceUnits[settings.unit].label,f=value=>exportForce(value,settings.unit);
 return [['Kinmetrix synthetic example report'],['Member',person().name],['Session',protocols[r.type].name],['Date and time',sessionStamp(r)],['Force unit',unit],['PDF chart orientation',exportOrientationLabel(settings.orientation)],['Avg peak force ('+unit+')',f(data.force)],['Stability (%)',Math.round(data.stability)],['Mean pair match (%)',Math.round(reportPairMatch(data))],[],['Direction','Angle','Avg peak force ('+unit+')','Stability (%)','Reps'],...data.directions.map(d=>[d.name,d.angle,f(d.force),Math.round(d.stability),d.reps.length]),[],['Symmetry pair','First angle','Second angle','Match (%)'],...data.pairs.map(p=>[p.name,p.a,p.b,p.percent]),['Front-back : left-right ratio',data.ratio.toFixed(1)+':1'],[],['Direction','Rep','Peak force ('+unit+')','Stability (%)','Duration (s)','Range (% demo scale)'],...data.directions.flatMap(d=>d.reps.map(rep=>[d.name,rep.number,f(rep.force),Math.round(rep.stability),rep.seconds.toFixed(1),rep.range.toFixed(1)])),...repStableExportRows(r,settings.unit),...programExportRows(r,settings.unit),[],['Session note',note?.text||''],['Author',note?.author||''],['Scoring','Synthetic values. Stability and symmetry score rules are not implemented.']];
}
function reportCSV(rows){return rows.map(row=>row.map(cell=>{let value=String(cell);if(/^[=+@\-]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
function downloadReportCSV(){
 const r=state.result;if(!r||r.partial)return;
 const csv=reportCSV(reportExportRows(r)),link=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='kinmetrix-example-report-'+reportExportSettings().unit+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('CSV downloaded.');
}
const reportActions={
 'report-metric':el=>{const ui=reportState();ui.metric=el.dataset.metric;ui.page='radial';render();window.scrollTo(0,0);},
 'report-page':el=>{reportState().page=el.dataset.page;render();window.scrollTo(0,0);},
 'report-overlay':el=>{const ui=reportState(),next=el.dataset.overlay;if(next==='previous'&&!reportCanCompare(state.result))return;ui.overlay=ui.overlay===next?'none':next;render();},
 'report-direction':el=>{const ui=reportState();ui.direction=Number(el.dataset.index);if(ui.metric==='symmetry'){const data=reportData(state.result),angle=data.directions[ui.direction].angle;ui.pair=Math.max(0,data.pairs.findIndex(p=>p.a===angle||p.b===angle));}render();},
 'report-direction-row':el=>{const ui=reportState();ui.direction=Number(el.dataset.index);render();},
 'report-pair':el=>{reportState().pair=Number(el.dataset.pair);render();},
 'report-reps':()=>{reportState().page='directions';render();window.scrollTo(0,0);},
 'report-compare':()=>{const ui=reportState();ui.page='radial';ui.metric='force';ui.overlay='previous';render();window.scrollTo(0,0);},
 'save-report-note':()=>saveSessionNote(state.result,$('#session-note').value),
 'export-report':()=>openReportExport()
};
