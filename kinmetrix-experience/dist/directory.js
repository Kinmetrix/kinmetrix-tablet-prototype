/* Clinic navigation and plan management. All identities and plans are demo data. */
function directoryUI(){
 state.directoryUI??={};
 return state.directoryUI[state.clinicianId]??={roster:{query:'',clinician:'all',status:'all',sort:'name',descending:false},programs:{tab:'templates',query:'',library:null}};
}
function visitDirectory(page,keepLibrary=false){
 if(state.actor!=='coach'||!['roster','programs'].includes(page))return;
 if(page==='programs'&&!keepLibrary)directoryUI().programs.library=null;
 state.nav=page;state.personId=null;state.pendingSetup=null;state.memberOrigin=page;render();window.scrollTo(0,0);
}
function openDirectoryPerson(id,origin='find',tab='overview'){
 if(state.actor!=='coach'||!visiblePeople().some(p=>p.id===id))return false;
 state.personId=id;state.nav='people';state.memberOrigin=origin;state.tab=tab;
 state.recentPeople[state.clinicianId]=[id,...(state.recentPeople[state.clinicianId]||[]).filter(key=>key!==id)].slice(0,3);
 const pending=state.pendingSetup;state.pendingSetup=null;
 if(pending){beginSetup(pending.purpose,pending.type,pending.continuing);return true;}
 render();window.scrollTo(0,0);return true;
}
function returnToDirectory(){
 if(['roster','programs'].includes(state.memberOrigin))visitDirectory(state.memberOrigin,true);else showPeopleFinder();
}
const rosterColumnDefinitions=[
 {key:'sessions',label:'Sessions',width:80},{key:'force',label:'Avg peak force',width:126},{key:'stability',label:'Stability',width:92},{key:'visit',label:'Last activity',width:110},{key:'program',label:'Program',width:180},
 {key:'clinician',label:'Clinician',width:150},{key:'height',label:'Height',width:88},{key:'weight',label:'Body weight',width:100},{key:'activity',label:'Activity level',width:110}
];
const rosterDefaultColumns=['sessions','force','stability','visit','program'];
function rosterColumns(){const ui=directoryUI().roster;ui.columns??=[...rosterDefaultColumns];return rosterColumnDefinitions.filter(col=>ui.columns.includes(col.key));}
function directoryPersonSummary(p){
 const records=[...state.history.filter(r=>r.personId===p.id),...reportFixtureHistory(p.id)].sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
 const assessment=records.find(r=>!r.partial&&r.type==='strength'&&r.purpose==='assessment');
 const latest=records[0],data=assessment?reportData(assessment):null;
 return {sessions:records.length,force:data?.force??null,stability:data?.stability??null,assessment,visit:latest?{label:latest.date,order:latest.completedAt||0}:p.last?{label:p.last,order:Date.UTC(2026,10,parseInt(p.last),12)}:{label:'No activity',order:0}};
}
function rosterModel(){
 const ui=directoryUI().roster,query=ui.query.trim().toLowerCase(),permitted=visiblePeople();
 const rows=permitted.map(p=>({p,clinician:clinicians.find(c=>c.id===p.assigned),...directoryPersonSummary(p),program:memberPrograms(p.id).find(pr=>pr.completed<pr.total),details:state.memberDetails[p.id]||profileExampleDetails[p.id]||{}})).filter(row=>
  (!query||query.split(/\s+/).every(word=>row.p.name.toLowerCase().includes(word)))&&
  (ui.clinician==='all'||row.p.assigned===ui.clinician)&&
  (ui.status==='all'||(ui.status==='active'?!!row.program:ui.status==='none'?!row.program:!row.assessment))
 );
 const value=row=>ui.sort==='clinician'?row.clinician.name:ui.sort==='visit'?row.visit.order:ui.sort==='program'?(row.program?.name||null):ui.sort==='height'?(row.details.heightCm??null):ui.sort==='weight'?(row.details.bodyWeightKg??null):ui.sort==='activity'?(row.details.activityLevel||null):['sessions','force','stability'].includes(ui.sort)?row[ui.sort]:row.p.name;
 rows.sort((a,b)=>{const av=value(a),bv=value(b);if(av===null)return bv===null?0:1;if(bv===null)return -1;return (typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*(ui.descending?-1:1);});
 return {rows,permitted};
}
function directorySearch(id,label,value,placeholder){return `<div class="search-wrap directory-search">${icon('search')}<label class="sr-only" for="${id}">${label}</label><input id="${id}" type="search" value="${escapeHTML(value)}" placeholder="${placeholder}" autocomplete="off"></div>`;}
function rosterPage(){
 if(state.actor!=='coach')return peopleView();
 const ui=directoryUI().roster,permitted=visiblePeople(),scope=state.rosterPolicy==='assigned'&&!isAdmin()?'Members assigned to '+clinician().name:'All clinic members';
 const allowedClinicians=clinicians.filter(c=>permitted.some(p=>p.assigned===c.id));
 return `<main class="directory-page"><header class="directory-heading"><div><h1>Roster</h1><p>${escapeHTML(scope)}</p></div><div class="directory-heading-actions"><span class="directory-total">${permitted.length} members</span>${button(icon('plus','icon-sm')+' Add person','add-person','primary','aria-haspopup="dialog"')}</div></header>
 <div class="directory-toolbar">${directorySearch('directory-search','Search roster',ui.query,'Search names')}<label class="directory-filter">Clinician<select id="roster-clinician">${[['all','All clinicians'],...allowedClinicians.map(c=>[c.id,c.name])].map(([value,label])=>`<option value="${value}" ${value===ui.clinician?'selected':''}>${label}</option>`).join('')}</select></label><label class="directory-filter">Program<select id="roster-program-filter">${[['all','Any status'],['active','Active program'],['none','No active program'],['new','No assessment yet']].map(([value,label])=>`<option value="${value}" ${value===ui.status?'selected':''}>${label}</option>`).join('')}</select></label></div>
 <div id="roster-results">${rosterResults()}</div><p class="directory-footnote">Force and stability use the latest complete Isometric assessment. Values are synthetic. Open a name for their workspace or Profile for personal details.</p></main>`;
}
function rosterCell(row,key){
 const missing='<span class="muted" aria-label="Not recorded">—</span>';
 if(key==='sessions')return row.sessions;
 if(key==='force')return row.force===null?missing:row.force.toFixed(1)+' kg';
 if(key==='stability')return row.stability===null?missing:Math.round(row.stability)+'%';
 if(key==='visit')return row.visit.label;
 if(key==='program')return row.program?`<strong>${escapeHTML(row.program.name)}</strong><small>${row.program.completed} of ${row.program.total} sessions</small>`:'<span class="muted">No active program</span>';
 if(key==='clinician')return escapeHTML(row.clinician.name);
 if(key==='height')return row.details.heightCm?escapeHTML(row.details.heightCm)+' cm':missing;
 if(key==='weight')return row.details.bodyWeightKg?escapeHTML(row.details.bodyWeightKg)+' kg':missing;
 if(key==='activity')return row.details.activityLevel?escapeHTML(profileOptionLabel(activityOptions,row.details.activityLevel).split(' · ')[0]):missing;
 return missing;
}
function rosterResults(){
 const {rows,permitted}=rosterModel(),ui=directoryUI().roster,columns=rosterColumns();
 const heading=(key,label,width)=>`<th scope="col" style="min-width:${width}px" aria-sort="${ui.sort===key?(ui.descending?'descending':'ascending'):'none'}"><button data-action="sort-roster" data-sort="${key}">${label}${ui.sort===key?icon('down','sort-icon '+(ui.descending?'descending':'ascending')):''}</button></th>`;
 return `<div class="directory-selection-row"><p class="directory-result-count" role="status">${rows.length} of ${permitted.length} members</p>${comparisonSelectionTools('roster')}</div>${rows.length?`<div class="directory-table-scroll" tabindex="0" role="region" aria-label="Roster table, scroll for more columns"><table class="data-table directory-table roster-grid" style="min-width:${304+columns.reduce((sum,col)=>sum+col.width,0)}px"><caption class="sr-only">Clinic member roster</caption><thead><tr><th scope="col" class="comparison-select-column"><span class="sr-only">Compare</span></th>${heading('name','Name',195)}${columns.map(col=>heading(col.key,col.label,col.width)).join('')}<th scope="col"><span class="sr-only">Profile</span></th></tr></thead><tbody>${rows.map(row=>`<tr class="${rosterCompareSelection().includes(row.p.id)?'is-selected':''}"><td class="comparison-select-column">${comparisonCheckbox('roster',row.p.id,row.assessment,row.p.name)}</td><th scope="row"><div class="directory-identity">${photoAvatar(row.p,'mini')}<button class="directory-person" data-action="open-roster-person" data-id="${row.p.id}"><span>${escapeHTML(row.p.name)}</span></button></div></th>${columns.map(col=>`<td>${rosterCell(row,col.key)}</td>`).join('')}<td><button class="text-button" data-action="open-roster-profile" data-id="${row.p.id}" aria-label="Open ${escapeHTML(row.p.name)} profile">Profile</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="directory-empty"><h2>No matching members</h2><p>Try another name or clear the filters.</p>${button('Clear filters','clear-roster-filters','small-button')}</div>`}`;
}
function rosterColumnsDialog(){const selected=rosterColumns().map(col=>col.key);return `<div class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">Roster columns</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><p class="directory-dialog-intro">Name and Profile stay visible.</p><div class="roster-column-options">${rosterColumnDefinitions.map(col=>`<label class="check-label"><input type="checkbox" name="roster-column" value="${col.key}" ${selected.includes(col.key)?'checked':''}>${col.label}${col.key==='weight'?' · kg':''}${col.key==='force'?' · kg':''}</label>`).join('')}</div><footer class="directory-dialog-footer">${button('Cancel','close-modal')}${button('Apply columns','apply-roster-columns','primary')}</footer></section></div>`;}
function refreshRoster(){const slot=$('#roster-results');if(slot)slot.innerHTML=rosterResults();}
function newPersonClinicians(){return state.rosterPolicy==='assigned'&&!isAdmin()?[clinician()]:clinicians;}
function addPersonDialog(){return `<div class="modal-backdrop"><section class="dialog directory-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="add-person-intro"><header class="dialog-header"><h2 id="dialog-title">Add person</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><p id="add-person-intro" class="directory-dialog-intro">Add a photo and name. Personal details can follow.</p><form id="add-person-form">${photoCaptureControl('new-person',state.overlay)}<label class="field-label" for="new-person-name">Full name</label><input id="new-person-name" name="name" type="text" autocomplete="off" required maxlength="80" placeholder="First and last name"><label class="field-label" for="new-person-clinician">Assigned clinician</label><select id="new-person-clinician">${newPersonClinicians().map(c=>`<option value="${c.id}" ${c.id===state.clinicianId?'selected':''}>${escapeHTML(c.name)}</option>`).join('')}</select><p class="program-form-note">Saved for this demo only.</p><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" class="button primary">Add person</button></footer></form></section></div>`;}
function saveNewPerson(){
 if(state.actor!=='coach'||state.overlay?.type!=='add-person'||state.overlay.photoLoading)return;
 const form=$('#add-person-form'),field=$('#new-person-name'),name=field.value.trim().replace(/\s+/g,' '),assigned=$('#new-person-clinician').value;
 field.setCustomValidity(name?'':'Enter a name.');if(!form.reportValidity()||!newPersonClinicians().some(c=>c.id===assigned))return;
 const words=name.split(' '),initials=[words[0],...(words.length>1?[words.at(-1)]:[])].map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
 const member={id:'person-'+crypto.randomUUID(),name,initials,assigned,color:'',detail:'New member',status:'First visit',last:null,target:null,program:false,baseline:false,createdInDemo:true};
 people.push(member);if(state.overlay.photo)state.memberPhotos[member.id]=state.overlay.photo;state.overlay=null;
 Object.assign(directoryUI().roster,{query:'',clinician:'all',status:'all'});
 openDirectoryPerson(member.id,'roster','profile');
 $('.member-identity h1')?.setAttribute('tabindex','-1');$('.member-identity h1')?.focus({preventScroll:true});toast(name+' added.');
}
function clinicProgramTemplates(){
 return state.programTemplates??=people.filter(p=>p.program).map(p=>({id:'template-'+p.id,name:p.detail,type:'strength',load:{kind:'incremental',start:p.target||12,increase:5,percent:60},total:6,positions:4,reps:3,example:true}));
}
function clinicSessionTemplates(){
 return state.sessionTemplates??=[
  {id:'light',name:'Light',detail:'50% · 10 reps',percent:50},
  {id:'strength',name:'Strength',detail:'65% · 8 reps',percent:65},
  {id:'performance',name:'Performance',detail:'75% · 4 reps',percent:75},
  {id:'return-to-play',name:'Return to Play',detail:'40% · 12 reps',percent:40},
  {id:'in-season',name:'In-Season Maintenance',detail:'55% · 10 reps',percent:55},
  {id:'off-season',name:'Off-Season Build',detail:'70% · 6 reps',percent:70},
  {id:'deload',name:'Deload',detail:'45% · 10 reps',percent:45}
 ];
}
function clinicAssessmentTemplates(){
 return sessionModeKeys('assessment').map(key=>({id:key,name:sessionModes[key].name,detail:sessionModes[key].short,description:sessionModes[key].description}));
}
function assignedPrograms(){if(state.actor!=='coach')return [];return visiblePeople().flatMap(p=>memberPrograms(p.id).map(program=>({p,program})));}
const TEMPLATE_LIBRARIES=[
 {id:'assessments',label:'Assessments',description:'Protocols the team runs from this workspace.'},
 {id:'sessions',label:'Sessions',description:'Session setups shared across the roster.'},
 {id:'programs',label:'Programs',description:'Multi-day plans assigned from this workspace.'}
];
function programFields(draft,prefix='plan',tracked=false){
 const field=name=>tracked?`data-program-field="${name}"`:'';
 return `<div class="program-editor-grid"><fieldset class="program-basics"><legend>Session settings</legend><label>Program name<input id="${prefix}-name" ${field('name')} type="text" required maxlength="60" autocomplete="off" placeholder="e.g. Endurance practice" value="${escapeHTML(draft.name)}"></label><div class="program-form-grid"><label>Training mode<select id="${prefix}-mode" ${field('type')}>${sessionModeKeys('training').map(key=>`<option value="${key}" ${draft.type===key?'selected':''}>${sessionModes[key].name}</option>`).join('')}</select></label><label>Number of sessions<select id="${prefix}-total" ${field('total')}>${[2,4,6,8,12].map(n=>`<option value="${n}" ${Number(draft.total)===n?'selected':''}>${n} sessions</option>`).join('')}</select></label><label>Directions<select id="${prefix}-positions" ${field('positions')}>${[4,8].map(n=>`<option value="${n}" ${Number(draft.positions)===n?'selected':''}>${n} directions</option>`).join('')}</select></label><label>Reps per direction<select id="${prefix}-reps" ${field('reps')}>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(draft.reps)===n?'selected':''}>${n} ${n===1?'rep':'reps'}</option>`).join('')}</select></label></div></fieldset>${programProgressionFields(draft,prefix)}</div>`;
}
function programsPage(){
 if(state.actor!=='coach')return peopleView();
 const ui=directoryUI().programs;
 if(ui.library==='assessments')return assessmentTemplatesPage();
 if(ui.library==='sessions')return sessionTemplatesPage();
 if(ui.library==='programs')return programLibraryPage();
 return `<main class="directory-page settings-page">
  <header class="directory-heading"><div><h1>Templates</h1><p>Assessments, sessions, and programs for this team.</p></div></header>
  <nav class="settings-links" aria-label="Template libraries">
   ${TEMPLATE_LIBRARIES.map(item=>`<button type="button" class="settings-link" data-action="templates-library" data-library="${item.id}">
    <span><strong>${item.label}</strong><small>${item.description}</small></span>${icon('chevron')}
   </button>`).join('')}
  </nav>
 </main>`;
}
function templatesBack(){
 return `<button class="text-button settings-back" data-action="templates-home">${icon('back','icon-sm')} Templates</button>`;
}
function assessmentTemplatesPage(){
 const rows=clinicAssessmentTemplates();
 return `<main class="directory-page">
  <header class="directory-heading"><div>${templatesBack()}<h1>Assessments</h1><p>Protocols the team runs from this workspace.</p></div></header>
  <div class="directory-table-scroll" tabindex="0" role="region" aria-label="Assessment templates">
   <table class="data-table directory-table"><caption class="sr-only">Assessment templates</caption>
    <thead><tr><th scope="col">Assessment</th><th scope="col">Purpose</th></tr></thead>
    <tbody>${rows.map(row=>`<tr><th scope="row"><strong>${escapeHTML(row.name)}</strong><small>${escapeHTML(row.detail)}</small></th><td>${escapeHTML(row.description)}</td></tr>`).join('')}</tbody>
   </table>
  </div>
  <p class="directory-footnote">These are the assessment modes available at the station. Editing a protocol is not in this prototype.</p>
 </main>`;
}
function sessionTemplatesPage(){
 const rows=clinicSessionTemplates();
 return `<main class="directory-page">
  <header class="directory-heading"><div>${templatesBack()}<h1>Sessions</h1><p>Session setups shared across the roster.</p></div></header>
  <div class="directory-table-scroll" tabindex="0" role="region" aria-label="Session templates">
   <table class="data-table directory-table"><caption class="sr-only">Session templates</caption>
    <thead><tr><th scope="col">Session</th><th scope="col">Load</th></tr></thead>
    <tbody>${rows.map(row=>`<tr><th scope="row">${escapeHTML(row.name)}</th><td>${escapeHTML(row.detail)}</td></tr>`).join('')}</tbody>
   </table>
  </div>
  <p class="directory-footnote">Session plan defaults in Settings use this list. New plans start from the selected template.</p>
 </main>`;
}
function programLibraryPage(){
 const ui=directoryUI().programs;
 return `<main class="directory-page"><header class="directory-heading"><div>${templatesBack()}<h1>Programs</h1><p>Reusable plans and the people following them.</p></div>${button(icon('plus','icon-sm')+' New program','new-template','primary')}</header><nav class="directory-tabs" aria-label="Program views">${[['templates','Templates'],['assigned','Assigned']].map(([key,label])=>`<button data-action="programs-tab" data-tab="${key}" ${ui.tab===key?'aria-current="page"':''}>${label}<span>${key==='templates'?clinicProgramTemplates().length:assignedPrograms().length}</span></button>`).join('')}</nav><div class="directory-toolbar program-toolbar">${directorySearch('programs-search','Search programs',ui.query,ui.tab==='templates'?'Search programs':'Search programs or people')}<p>${ui.tab==='templates'?'Assign a copy to a person.':'Assigned programs keep their own settings and progress.'}</p></div><div id="programs-results">${programsResults()}</div><p class="directory-footnote">${ui.tab==='templates'?'Example templates use the existing demo plans.':'Only members you can access are shown.'} Changes are saved in this demo only.</p></main>`;
}
function programsResults(){
 const ui=directoryUI().programs,q=ui.query.trim().toLowerCase(),assigned=ui.tab==='assigned';
 const rows=assigned?assignedPrograms().filter(({p,program})=>(program.name+' '+p.name+' '+sessionModes[program.type].name).toLowerCase().includes(q)):clinicProgramTemplates().filter(p=>(p.name+' '+sessionModes[p.type].name).toLowerCase().includes(q));
 if(!rows.length)return `<div class="directory-empty"><h2>${q?'No matching programs':assigned?'No assigned programs':'No program templates'}</h2><p>${q?'Try another name or mode.':assigned?'Choose a template and assign it to a member.':'Create a reusable plan to assign to people.'}</p>${q?button('Clear search','clear-programs-search','small-button'):assigned?button('Browse templates','browse-templates','small-button'):button('New program','new-template','small-button')}</div>`;
 return `<div class="directory-table-scroll" tabindex="0" role="region" aria-label="${assigned?'Assigned programs':'Program templates'}, scroll for more columns"><table class="data-table directory-table program-grid"><caption class="sr-only">${assigned?'Assigned programs':'Program templates'}</caption><thead><tr><th scope="col">${assigned?'Person':'Program'}</th><th scope="col">${assigned?'Program':'Mode'}</th><th scope="col">${assigned?'Progress':'Sessions'}</th><th scope="col">Setup</th><th scope="col">Target progression</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map(row=>{const p=assigned?row.program:row,member=assigned?row.p:null;return `<tr><th scope="row">${assigned?`<div class="directory-identity">${photoAvatar(member,'mini')}<button class="directory-person" data-action="program-member" data-id="${member.id}"><span>${escapeHTML(member.name)}</span></button></div>`:`<button class="program-name-button" data-action="edit-template" data-id="${p.id}">${escapeHTML(p.name)}${icon('chevron','icon-sm')}</button>`}</th><td>${assigned?`<strong>${escapeHTML(p.name)}</strong><small>${sessionModes[p.type].name}</small>`:sessionModes[p.type].name}</td><td>${assigned?`<strong>${p.completed} / ${p.total}</strong><small>${p.completed>=p.total?'Completed':'Sessions completed'}</small>`:p.total}</td><td>${p.positions} directions<small>${p.reps} reps per direction</small></td><td>${programLoadLabel(p)}</td><td>${assigned?(p.completed<p.total?button('Continue','continue-assigned','small-button',`data-id="${member.id}" data-program-id="${p.id}" aria-label="Continue ${escapeHTML(p.name)} for ${escapeHTML(member.name)}"`):button('Open person','program-member','small-button',`data-id="${member.id}"`)):button('Assign','assign-template','small-button',`data-id="${p.id}" aria-label="Assign ${escapeHTML(p.name)}"`)}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function directoryDialog(o){
 const template=clinicProgramTemplates().find(p=>p.id===o.id),editing=o.type==='program-editor',draft=template||{name:'',type:'strength',total:6,positions:4,reps:3};
 const title=editing?(template?'Edit program':'New program'):'Assign program';
 const content=editing?`<p class="directory-dialog-intro">${template?'Changes apply to future assignments. Existing assigned programs keep their settings.':'Create a reusable template, then assign it to people.'}</p><form id="template-form" class="program-form">${programFields(draft)}</form><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" form="template-form" class="button primary">Save program</button></footer>`:`<p class="directory-dialog-intro"><strong>${escapeHTML(draft.name)}</strong><br>${sessionModes[draft.type].name} · ${draft.total} sessions · ${draft.positions} directions · ${draft.reps} reps</p><form id="assign-program-form"><label class="field-label" for="assign-person">Assign to</label><select id="assign-person" required><option value="">Choose a person</option>${visiblePeople().map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}</select><p class="program-form-note">This adds a program to their workspace. No session starts until the settings are reviewed.</p><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" form="assign-program-form" class="button primary">Assign program</button></footer></form>`;
 return `<div class="modal-backdrop"><section class="dialog directory-dialog ${editing?'program-editor-dialog':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${content}</section></div>`;
}
function saveProgramTemplate(){
 if(state.actor!=='coach'||state.overlay?.type!=='program-editor')return;
 const form=$('#template-form'),name=$('#plan-name');name.setCustomValidity(name.value.trim()?'':'Enter a program name.');if(!form.reportValidity())return;
 const draft={name:name.value.trim(),type:$('#plan-mode').value,total:Number($('#plan-total').value),positions:Number($('#plan-positions').value),reps:Number($('#plan-reps').value)};
 if(!sessionModeKeys('training').includes(draft.type)||![2,4,6,8,12].includes(draft.total)||![4,8].includes(draft.positions)||![1,2,3,4,5].includes(draft.reps))return;
 const load=validateProgramLoadForm('plan',draft.total);if(!load)return;draft.load=load;
 const templates=clinicProgramTemplates(),existing=templates.find(p=>p.id===state.overlay.id);
 if(existing)Object.assign(existing,draft,{example:false});else templates.unshift({...draft,id:'template-'+Date.now(),example:false});
 state.overlay=null;directoryUI().programs={tab:'templates',query:''};render();$('[data-action="new-template"]')?.focus();toast('Program template saved.');
}
function assignProgramTemplate(){
 if(state.actor!=='coach'||state.overlay?.type!=='program-assign')return;
 const field=$('#assign-person'),template=clinicProgramTemplates().find(p=>p.id===state.overlay.id),member=visiblePeople().find(p=>p.id===field.value);
 if(!template||!member){$('#assign-program-form').reportValidity();return;}
 if(memberPrograms(member.id).some(p=>p.templateId===template.id&&p.completed<p.total)){field.setCustomValidity('This person already has an active copy of this program.');field.reportValidity();return;}
 memberPrograms(member.id).unshift({id:'program-'+Date.now(),templateId:template.id,name:template.name,type:template.type,total:template.total,positions:template.positions,reps:template.reps,load:{...programLoad(template)},completed:0});
 state.overlay=null;Object.assign(directoryUI().programs,{tab:'assigned',query:'',library:'programs'});openDirectoryPerson(member.id,'programs');toast('Program assigned to '+member.name+'.');
}
const directoryActions={
 'add-person':()=>{if(state.actor!=='coach')return;openModal('add-person');$('#new-person-name')?.focus();},
 'roster-columns':()=>{if(state.actor==='coach')openModal('roster-columns');},
 'apply-roster-columns':()=>{if(state.actor!=='coach'||state.overlay?.type!=='roster-columns')return;const ui=directoryUI().roster;ui.columns=$$('input[name="roster-column"]:checked').map(el=>el.value).filter(key=>rosterColumnDefinitions.some(col=>col.key===key));if(!ui.columns.includes(ui.sort))ui.sort='name';state.overlay=null;render();$('[data-action="roster-columns"]')?.focus();},
 'nav-roster':()=>visitDirectory('roster'),'nav-programs':()=>visitDirectory('programs'),
 'open-roster-person':el=>openDirectoryPerson(el.dataset.id,'roster'),
 'open-roster-profile':el=>openDirectoryPerson(el.dataset.id,'roster','profile'),
 'sort-roster':el=>{const ui=directoryUI().roster,key=el.dataset.sort;if(key!=='name'&&!rosterColumnDefinitions.some(col=>col.key===key))return;ui.descending=ui.sort===key?!ui.descending:false;ui.sort=key;refreshRoster();$(`[data-sort="${key}"]`)?.focus();},
 'clear-roster-filters':()=>{Object.assign(directoryUI().roster,{query:'',clinician:'all',status:'all',sort:'name',descending:false});render();$('#directory-search')?.focus();},
 'templates-library':el=>{if(!TEMPLATE_LIBRARIES.some(item=>item.id===el.dataset.library))return;directoryUI().programs.library=el.dataset.library;render();},
 'templates-home':()=>{directoryUI().programs.library=null;render();$('[data-action="templates-library"]')?.focus();},
 'programs-tab':el=>{if(!['templates','assigned'].includes(el.dataset.tab))return;Object.assign(directoryUI().programs,{tab:el.dataset.tab,query:'',library:'programs'});render();$(`[data-tab="${el.dataset.tab}"]`)?.focus();},
 'browse-templates':()=>{Object.assign(directoryUI().programs,{tab:'templates',query:'',library:'programs'});render();},
 'clear-programs-search':()=>{directoryUI().programs.query='';render();$('#programs-search')?.focus();},
 'new-template':()=>{if(state.actor==='coach')openModal('program-editor');},
 'edit-template':el=>{if(state.actor==='coach'&&clinicProgramTemplates().some(p=>p.id===el.dataset.id))openModal('program-editor',{id:el.dataset.id});},
 'assign-template':el=>{if(state.actor==='coach'&&clinicProgramTemplates().some(p=>p.id===el.dataset.id))openModal('program-assign',{id:el.dataset.id});},
 'program-member':el=>openDirectoryPerson(el.dataset.id,'programs'),
 'continue-assigned':el=>{if(state.actor!=='coach'||!visiblePeople().some(p=>p.id===el.dataset.id)||!memberPrograms(el.dataset.id).some(p=>p.id===el.dataset.programId&&p.completed<p.total))return;openDirectoryPerson(el.dataset.id,'programs');beginProgram(el.dataset.programId);}
};
document.addEventListener('input',event=>{
 const el=event.target;if(el.id==='directory-search'){directoryUI().roster.query=el.value;refreshRoster();}
 if(el.id==='programs-search'){directoryUI().programs.query=el.value;$('#programs-results').innerHTML=programsResults();}
 if(el.id==='plan-name'||el.id==='new-person-name')el.setCustomValidity('');
});
document.addEventListener('change',event=>{
 const el=event.target;if(el.id==='roster-clinician'){directoryUI().roster.clinician=el.value;refreshRoster();}
 if(el.id==='roster-program-filter'){directoryUI().roster.status=el.value;refreshRoster();}
 if(el.id==='assign-person')el.setCustomValidity('');
});
document.addEventListener('submit',event=>{
 if(event.target.id==='add-person-form'){event.preventDefault();saveNewPerson();}
 if(event.target.id==='template-form'){event.preventDefault();saveProgramTemplate();}
 if(event.target.id==='assign-program-form'){event.preventDefault();assignProgramTemplate();}
});
