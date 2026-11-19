/* Clinic navigation and plan management. All identities and plans are demo data. */
function directoryUI(){
 state.directoryUI??={};
 return state.directoryUI[state.clinicianId]??={roster:{query:'',filterKind:'all',filterValue:'all',sort:'name',descending:false},programs:{tab:'templates',query:'',library:null,libraryFocus:'assessments',assessmentTab:'protocol',sessionTab:'templates'}};
}
function visitDirectory(page,keepLibrary=false){
 if(state.actor!=='coach')return;
 if(page==='pulse'){visitPulse();return;}
 if(page==='programs'){
  if(!keepLibrary)Object.assign(directoryUI().programs,{library:'assessments',query:''});
  visitTeamHub(keepLibrary?(directoryUI().programs.library||'assessments'):null);
  return;
 }
 if(page!=='roster')return;
 rosterUI().filterOpen=false;
 state.nav=page;state.personId=null;state.pendingSetup=null;state.memberOrigin=page;render();window.scrollTo(0,0);
}
function openDirectoryPerson(id,origin='find',tab='overview'){
 if(state.actor!=='coach'||!visiblePeople().some(p=>p.id===id))return false;
 state.personId=id;state.nav='people';state.memberOrigin=origin;state.tab=(tab==='history'||tab==='programs')&&!memberHasSessionData(id)?'overview':tab;
 const pending=state.pendingSetup;state.pendingSetup=null;
 if(pending){beginSetup(pending.purpose,pending.type,pending.continuing);return true;}
 render();window.scrollTo(0,0);return true;
}
function returnToDirectory(){
 if(state.memberOrigin==='programs'||state.memberOrigin==='team')visitTeamHub(directoryUI().programs.library||'assessments');
 else if(['pulse','roster'].includes(state.memberOrigin))visitDirectory(state.memberOrigin,true);
 else showGlobalFind();
}
const rosterColumnDefinitions=[
 {key:'sessions',label:'Sessions',width:80},{key:'force',label:'Avg peak force',width:126},{key:'stability',label:'Stability',width:92},{key:'visit',label:'Last activity',width:110},{key:'program',label:'Program',width:180},
 {key:'clinician',label:'Clinician',width:150},{key:'height',label:'Height',width:88},{key:'weight',label:'Body weight',width:100},{key:'activity',label:'Activity level',width:110}
];
const rosterDefaultColumns=['sessions','force','stability','visit','program'];
const ROSTER_IMPORT_MAX_ROWS=200;
const ROSTER_IMPORT_HEADERS=['name','email'];
const ROSTER_SORT_KEYS=new Set(['name','sessions','force','stability','visit','program','clinician','height','weight','activity']);
function rosterImportTemplateText(){return ROSTER_IMPORT_HEADERS.join(',')+'\r\nTaylor Brooks,taylor@example.com\r\n';}
function parseCsvFieldLine(line){
 const cells=[];let cur='',inQuotes=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(inQuotes){if(ch==='"'&&line[i+1]==='"'){cur+='"';i++;continue;}if(ch==='"'){inQuotes=false;continue;}cur+=ch;continue;}
  if(ch==='"'){inQuotes=true;continue;}
  if(ch===','){cells.push(cur);cur='';continue;}
  cur+=ch;
 }
 cells.push(cur);
 return cells.map(cell=>cell.trim());
}
function parseRosterImportCSV(text){
 const normalized=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
 const raw=normalized.split('\n').filter(line=>line.trim()!=='');
 if(!raw.length)return {error:'This file is empty.'};
 const headerCells=parseCsvFieldLine(raw[0]);
 if(headerCells.length!==ROSTER_IMPORT_HEADERS.length||headerCells.some((cell,index)=>cell.trim().toLowerCase()!==ROSTER_IMPORT_HEADERS[index])){
  if(headerCells.length===1&&headerCells[0].includes(';'))return {error:'This file uses semicolons. Save the sheet as comma-separated CSV (UTF-8), or use the downloaded template.'};
  return {error:'Use the downloaded template.'};
 }
 const dataLines=raw.slice(1);
 if(!dataLines.length)return {error:'Add at least one member row under the header.'};
 if(dataLines.length>ROSTER_IMPORT_MAX_ROWS)return {error:'This prototype accepts up to 200 rows.'};
 return {rows:dataLines.map((line,index)=>({line:index+2,name:(parseCsvFieldLine(line)[0]??'').trim(),email:(parseCsvFieldLine(line)[1]??'').trim()}))};
}
function rosterImportEmailShapeOk(email){const value=email.trim();if(!value)return true;const at=value.indexOf('@');return at>0&&at<value.length-1;}
function memberStoredEmail(personId){return String(state.memberDetails[personId]?.email||'').trim().toLowerCase();}
function buildRosterImportPreview(rows){
 const rosterNames=new Set(people.map(p=>p.name.trim().toLowerCase()));
 const rosterEmails=new Set(people.map(p=>memberStoredEmail(p.id)).filter(Boolean));
 const seenNames=new Set(),seenEmails=new Set();
 return rows.map(row=>{
  const name=row.name.trim().replace(/\s+/g,' ');
  const email=row.email.trim(),emailKey=email.toLowerCase();
  let issue='';
  if(!name)issue='Enter a name.';
  else if(rosterNames.has(name.toLowerCase()))issue='Already on roster.';
  else if(seenNames.has(name.toLowerCase()))issue='Duplicate name in this file.';
  else if(email&&!rosterImportEmailShapeOk(email))issue='Enter a valid email.';
  else if(emailKey&&rosterEmails.has(emailKey))issue='Email already on roster.';
  else if(emailKey&&seenEmails.has(emailKey))issue='Duplicate email in this file.';
  if(!issue){seenNames.add(name.toLowerCase());if(emailKey)seenEmails.add(emailKey);}
  return {name,email,status:issue?'Blocked':'Ready',issue};
 });
}
function downloadRosterImportTemplate(){
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+rosterImportTemplateText()],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='kinmetrix-roster-import-template.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function rosterImportWizardSteps(active){
 const steps=[['prepare','Prepare'],['review','Review'],['result','Done']];
 return `<ol class="roster-import-steps" aria-label="Import steps">${steps.map(([id,label])=>`<li class="${id===active?'is-active':''}">${label}</li>`).join('')}</ol>`;
}
function rosterImportDialog(){
 const o=state.overlay,step=o.step||'prepare',clinicianName=escapeHTML(clinician().name);
 if(step==='prepare'){
  return `<div class="modal-backdrop"><section class="dialog directory-dialog roster-import-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">Import members</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${rosterImportWizardSteps('prepare')}<p class="directory-dialog-intro">Add many members from a CSV file. New members will be assigned to <strong>${clinicianName}</strong>.</p><div class="roster-import-prepare"><button type="button" class="button" data-action="roster-import-download-template">${icon('download','icon-sm')} Download template</button><label class="roster-import-upload button" for="roster-import-file">${icon('upload','icon-sm')} Choose CSV file</label><input id="roster-import-file" type="file" accept=".csv,text/csv" class="sr-only"></div>${o.fileError?`<p class="form-error" role="alert">${escapeHTML(o.fileError)}</p>`:''}${o.fileName?`<p class="small muted">Selected: ${escapeHTML(o.fileName)}</p>`:''}<footer class="directory-dialog-footer">${button('Cancel','close-modal')}</footer></section></div>`;
 }
 if(step==='review'){
  const preview=o.preview||[],ready=preview.filter(row=>row.status==='Ready');
  const body=`<div class="directory-table-scroll roster-import-preview-scroll"><table class="data-table directory-table"><caption class="sr-only">Import preview</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Issue</th></tr></thead><tbody>${preview.length?preview.map(row=>`<tr><th scope="row">${escapeHTML(row.name||'—')}</th><td>${row.email?escapeHTML(row.email):'<span class="muted">—</span>'}</td><td>${row.status==='Ready'?'<span class="badge neutral">Ready</span>':'<span class="badge amber">Blocked</span>'}</td><td>${row.issue?escapeHTML(row.issue):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">No rows in this file.</td></tr>'}</tbody></table></div>`;
  return `<div class="modal-backdrop"><section class="dialog directory-dialog roster-import-dialog wide" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">Import members</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${rosterImportWizardSteps('review')}${body}<footer class="directory-dialog-footer">${button('Back','roster-import-back')}${button('Import '+ready.length+' members','roster-import-confirm','primary',ready.length?'':'disabled')}</footer></section></div>`;
 }
 const added=o.added??0,skipped=o.skipped??0;
 return `<div class="modal-backdrop"><section class="dialog directory-dialog roster-import-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">Import members</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${rosterImportWizardSteps('result')}<p class="directory-dialog-intro">Added <strong>${added}</strong> members · Skipped <strong>${skipped}</strong> with issues.</p><p class="small muted">New members are assigned to ${clinicianName}. Saved for this demo only.</p><footer class="directory-dialog-footer">${button('Done','close-modal','primary')}</footer></section></div>`;
}
function readRosterImportFile(file){
 if(state.overlay?.type!=='roster-import')return;
 if(!/\.csv$/i.test(file.name)){state.overlay.fileError='Choose a CSV file.';state.overlay.fileName='';renderOverlay();return;}
 file.text().then(text=>{
  const parsed=parseRosterImportCSV(text);
  if(parsed.error){state.overlay={...state.overlay,step:'prepare',fileError:parsed.error,preview:null,fileName:file.name};renderOverlay();return;}
  state.overlay={...state.overlay,step:'review',fileError:'',fileName:file.name,preview:buildRosterImportPreview(parsed.rows),sourceRows:parsed.rows};
  renderOverlay();
 }).catch(()=>{state.overlay.fileError='Could not read this file.';renderOverlay();});
}
function confirmRosterImport(){
 const o=state.overlay;
 if(state.actor!=='coach'||o?.type!=='roster-import'||o.step!=='review'||!o.preview)return;
 const valid=o.preview.filter(row=>row.status==='Ready'),skipped=o.preview.length-valid.length;
 for(const row of valid){
  const name=row.name.trim().replace(/\s+/g,' '),words=name.split(' '),initials=[words[0],...(words.length>1?[words.at(-1)]:[])].map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
  const member={id:'person-'+crypto.randomUUID(),name,initials,assigned:state.clinicianId,color:'',detail:'New member',status:'First visit',last:null,target:null,program:false,baseline:false,createdInDemo:true};
  people.push(member);
  if(row.email.trim())state.memberDetails[member.id]={...(state.memberDetails[member.id]||{}),email:row.email.trim()};
 }
 state.overlay={type:'roster-import',step:'result',added:valid.length,skipped};
 render();
 renderOverlay();
 toast('Import complete.');
}
const ROSTER_FILTER_KINDS=[
 {id:'all',label:'All members',values:[['all','All']]},
 {id:'programStatus',label:'Program status',values:[['active','Active program'],['none','No active program'],['new','No assessment yet']]},
 {id:'programName',label:'Current program',values:[]},
 {id:'lastActivity',label:'Last activity',values:[['recent','Within 7 days'],['quiet','8–30 days ago'],['stale','Over 30 days'],['none','No activity']]},
 {id:'sessions',label:'Sessions',values:[['none','0 sessions'],['few','1–3 sessions'],['many','4 or more']]}
];
function rosterUI(){const ui=directoryUI().roster;if(ui.status&&ui.status!=='all'&&!ui.filterKind){ui.filterKind='programStatus';ui.filterValue=ui.status;delete ui.status;}ui.filterKind??='all';ui.filterValue??='all';if(ui.filterKind==='all')ui.filterValue='all';return ui;}
function rosterProgramOptions(permitted){const names=new Map();for(const p of permitted){const plan=memberPrograms(p.id).find(pr=>pr.completed<pr.total);if(plan)names.set(plan.id,plan.name);}return [...names.entries()].map(([id,name])=>[id,name]);}
function rosterFilterValueOptions(kind,permitted){const def=ROSTER_FILTER_KINDS.find(item=>item.id===kind)||ROSTER_FILTER_KINDS[0];if(kind==='programName'){const programs=rosterProgramOptions(permitted);return programs.length?programs:[['none','No active programs']];}return def.values;}
function rosterPassesFilter(row,ui){
 if(ui.filterKind==='all'||ui.filterValue==='all')return true;
 if(ui.filterKind==='programStatus'){
  if(ui.filterValue==='active')return !!row.program;
  if(ui.filterValue==='none')return !row.program;
  if(ui.filterValue==='new')return !row.assessment;
 }
 if(ui.filterKind==='programName'){if(ui.filterValue==='none')return false;return row.program?.id===ui.filterValue;}
 if(ui.filterKind==='lastActivity'){
  const order=row.visit.order,now=Date.UTC(2026,10,13,12),days=order?(now-order)/86400000:null;
  if(ui.filterValue==='none')return !order;
  if(ui.filterValue==='recent')return days!==null&&days<=7;
  if(ui.filterValue==='quiet')return days!==null&&days>7&&days<=30;
  if(ui.filterValue==='stale')return days===null||days>30;
 }
 if(ui.filterKind==='sessions'){
  const n=row.sessions;
  if(ui.filterValue==='none')return n===0;
  if(ui.filterValue==='few')return n>=1&&n<=3;
  if(ui.filterValue==='many')return n>=4;
 }
 return true;
}
function rosterColumns(){const ui=rosterUI();ui.columns??=[...rosterDefaultColumns];return rosterColumnDefinitions.filter(col=>ui.columns.includes(col.key));}
function rosterHeadToolsMarkup(){
 const count=rosterCompareSelection().length;
 return `<div class="roster-head-tools" id="roster-head-tools">${count?button('Clear','comparison-clear','ghost small-button',`data-source="roster"`):''}${button(icon('compare','icon-sm')+' Compare'+(count?` (${count})`:''),'comparison-open',count>=2?'small-button':'small-button','data-source="roster" aria-haspopup="dialog" '+(count<2?'disabled':''))}</div>`;
}
function rosterFilterFieldsMarkup(permitted){
 const ui=rosterUI(),valueOptions=rosterFilterValueOptions(ui.filterKind,permitted),showValue=ui.filterKind!=='all';
 return `<label class="directory-filter" for="roster-filter-kind">Filter by<select id="roster-filter-kind">${ROSTER_FILTER_KINDS.map(item=>`<option value="${item.id}" ${ui.filterKind===item.id?'selected':''}>${item.label}</option>`).join('')}</select></label>${showValue?`<label class="directory-filter" for="roster-filter-value">Value<select id="roster-filter-value">${valueOptions.map(([value,label])=>`<option value="${value}" ${ui.filterValue===value?'selected':''}>${label}</option>`).join('')}</select></label>`:''}`;
}
function rosterFilterPopoverMarkup(permitted){
 const ui=rosterUI(),active=ui.filterKind!=='all';
 return `${rosterFilterFieldsMarkup(permitted)}${active?`<div class="roster-filter-popover-footer">${button('Clear filters','clear-roster-filters','ghost small-button')}</div>`:''}`;
}
function rosterFilterActiveLabel(ui){
 if(ui.filterKind==='all')return 'Filter roster';
 const kind=ROSTER_FILTER_KINDS.find(item=>item.id===ui.filterKind)?.label||'Filter';
 if(ui.filterKind==='programName'){const match=rosterFilterValueOptions(ui.filterKind,visiblePeople()).find(([value])=>value===ui.filterValue);return match?`Filter roster · ${match[1]}`:`Filter roster · ${kind}`;}
 const value=rosterFilterValueOptions(ui.filterKind,visiblePeople()).find(([id])=>id===ui.filterValue)?.[1];
 return value&&value!=='All'?`Filter roster · ${kind}: ${value}`:`Filter roster · ${kind}`;
}
function rosterFilterToolbar(permitted){
 const ui=rosterUI(),active=ui.filterKind!=='all',open=!!ui.filterOpen;
 const popover=open?`<div class="roster-filter-popover" id="roster-filter-popover" role="dialog" aria-label="Filter roster">${rosterFilterPopoverMarkup(permitted)}</div>`:'';
 return `<div class="directory-toolbar roster-toolbar">${directorySearch('directory-search','Search roster',ui.query,'Search names')}<div class="roster-toolbar-filters"><div class="roster-filter-anchor"><button type="button" class="icon-button roster-filter-button roster-toolbar-icon-button" data-action="roster-filters" aria-label="${escapeHTML(rosterFilterActiveLabel(ui))}" aria-haspopup="dialog" aria-expanded="${open}"${open?' aria-controls="roster-filter-popover"':''} aria-pressed="${active}">${icon(active?'filterFilled':'filter')}</button>${popover}</div><button type="button" class="icon-button roster-columns-button roster-toolbar-icon-button" data-action="roster-columns" aria-label="Choose visible columns" aria-haspopup="dialog">${icon('columns')}</button></div></div>`;
}
function directoryPersonSummary(p){
 const records=[...state.history.filter(r=>r.personId===p.id),...reportFixtureHistory(p.id)].sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
 const assessment=records.find(r=>!r.partial&&r.type==='strength'&&r.purpose==='assessment');
 const latest=records[0],data=assessment?reportData(assessment):null;
 return {sessions:records.length,force:data?.force??null,stability:data?.stability??null,assessment,visit:latest?{label:latest.date,order:latest.completedAt||0}:p.last?{label:p.last,order:Date.UTC(2026,10,parseInt(p.last),12)}:{label:'No activity',order:0}};
}
function rosterModel(){
 const ui=rosterUI(),query=ui.query.trim().toLowerCase(),permitted=visiblePeople();
 const rows=permitted.map(p=>({p,clinician:clinicians.find(c=>c.id===p.assigned),...directoryPersonSummary(p),program:memberPrograms(p.id).find(pr=>pr.completed<pr.total),details:state.memberDetails[p.id]||profileExampleDetails[p.id]||{}})).filter(row=>
  (!query||query.split(/\s+/).every(word=>row.p.name.toLowerCase().includes(word)))&&
  rosterPassesFilter(row,ui)
 );
 const value=row=>ui.sort==='clinician'?row.clinician.name:ui.sort==='visit'?row.visit.order:ui.sort==='program'?(row.program?.name||null):ui.sort==='height'?(row.details.heightCm??null):ui.sort==='weight'?(row.details.bodyWeightKg??null):ui.sort==='activity'?(row.details.activityLevel||null):['sessions','force','stability'].includes(ui.sort)?row[ui.sort]:row.p.name;
 rows.sort((a,b)=>{const av=value(a),bv=value(b);if(av===null)return bv===null?0:1;if(bv===null)return -1;return (typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*(ui.descending?-1:1);});
 return {rows,permitted};
}
function directorySearch(id,label,value,placeholder){return `<div class="search-wrap directory-search">${icon('search')}<label class="sr-only" for="${id}">${label}</label><input id="${id}" type="search" value="${escapeHTML(value)}" placeholder="${placeholder}" autocomplete="off"></div>`;}
function rosterPage(){
 if(state.actor!=='coach')return peopleView();
 const permitted=visiblePeople(),scope=state.rosterPolicy==='assigned'&&!isAdmin()?'Members assigned to '+clinician().name:'All clinic members';
 return `<main class="directory-page roster-workspace templates-hub staff-single-pane"><div class="settings-hub-pane" aria-label="Roster"><header class="settings-pane-head"><div class="settings-pane-head-row"><div class="settings-pane-head-text"><h1>Roster</h1><p class="settings-pane-desc">${escapeHTML(scope)}</p></div><div class="settings-pane-head-actions">${rosterHeadToolsMarkup()}${button('Import','roster-import-open','small-button')}${button(icon('plus','icon-sm')+' Add person','add-person','primary','aria-haspopup="dialog"')}</div></div></header>
 ${rosterFilterToolbar(permitted)}
 <div id="roster-results">${rosterResults()}</div></div></main>`;
}
function rosterCell(row,key){
 const missing='<span class="muted" aria-label="Not recorded">—</span>';
 if(key==='sessions')return row.sessions;
 if(key==='force')return row.force===null?missing:row.force.toFixed(1)+' kg';
 if(key==='stability')return row.stability===null?missing:Math.round(row.stability)+'%';
 if(key==='visit')return row.visit.label;
 if(key==='program'){
  if(!row.program)return '<span class="muted">No active program</span>';
  const progress=`${row.program.completed} of ${row.program.total} sessions`;
  return `<div class="roster-program-cell"><button type="button" class="program-name-button roster-program-button" data-action="open-roster-program" data-id="${row.p.id}" aria-label="Open ${escapeHTML(row.program.name)} program for ${escapeHTML(row.p.name)}, ${progress}"><strong>${escapeHTML(row.program.name)}</strong></button><small class="muted">${progress}</small></div>`;
 }
 if(key==='clinician')return escapeHTML(row.clinician.name);
 if(key==='height')return row.details.heightCm?escapeHTML(row.details.heightCm)+' cm':missing;
 if(key==='weight')return row.details.bodyWeightKg?escapeHTML(row.details.bodyWeightKg)+' kg':missing;
 if(key==='activity')return row.details.activityLevel?escapeHTML(profileOptionLabel(activityOptions,row.details.activityLevel).split(' · ')[0]):missing;
 return missing;
}
function rosterResults(){
 const {rows,permitted}=rosterModel(),ui=rosterUI(),columns=rosterColumns(),compareCount=rosterCompareSelection().length;
 const footer=`<footer class="roster-table-footer"><p class="directory-result-count" role="status">${rows.length} of ${permitted.length} members</p>${compareCount?`<p class="roster-compare-hint muted small">${compareCount} selected for compare</p>`:''}</footer>`;
 if(!rows.length)return `<div class="directory-empty"><h2>No matching members</h2><p>Try another name or clear the filters.</p>${button('Clear filters','clear-roster-filters','small-button')}</div>`;
 return `<div class="roster-table-shell"><div class="directory-table-scroll roster-table-scroll" tabindex="0" role="region" aria-label="Roster table, scroll for more columns"><table class="data-table directory-table roster-grid" style="min-width:${252+columns.reduce((sum,col)=>sum+col.width,0)}px"><caption class="sr-only">Clinic member roster</caption><thead><tr><th scope="col" class="comparison-select-column roster-sticky-head"><span class="sr-only">Compare</span></th><th scope="col" class="roster-sticky-head" style="min-width:195px" aria-sort="${ui.sort==='name'?(ui.descending?'descending':'ascending'):'none'}"><button type="button" data-action="sort-roster" data-sort="name">Name${ui.sort==='name'?icon('down','sort-icon '+(ui.descending?'descending':'ascending')):''}</button></th>${columns.map(col=>`<th scope="col" class="roster-sticky-head" style="min-width:${col.width}px" aria-sort="${ui.sort===col.key?(ui.descending?'descending':'ascending'):'none'}"><button type="button" data-action="sort-roster" data-sort="${col.key}">${col.label}${ui.sort===col.key?icon('down','sort-icon '+(ui.descending?'descending':'ascending')):''}</button></th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr class="${rosterCompareSelection().includes(row.p.id)?'is-selected':''}"><td class="comparison-select-column">${comparisonCheckbox('roster',row.p.id,row.assessment,row.p.name)}</td><th scope="row"><div class="directory-identity">${photoAvatar(row.p,'mini')}<button type="button" class="directory-person" data-action="open-roster-person" data-id="${row.p.id}"><span>${escapeHTML(row.p.name)}</span></button></div></th>${columns.map(col=>`<td>${rosterCell(row,col.key)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${footer}</div>`;
}
function rosterColumnsDialog(){const selected=rosterColumns().map(col=>col.key);return `<div class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">Roster columns</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><p class="directory-dialog-intro">Name stays visible.</p><div class="roster-column-options">${rosterColumnDefinitions.map(col=>`<label class="check-label"><input type="checkbox" name="roster-column" value="${col.key}" ${selected.includes(col.key)?'checked':''}>${col.label}${col.key==='weight'?' · kg':''}${col.key==='force'?' · kg':''}</label>`).join('')}</div><footer class="directory-dialog-footer">${button('Cancel','close-modal')}${button('Apply columns','apply-roster-columns','primary')}</footer></section></div>`;}
function refreshRoster({refreshToolbar=false}={}){
 const slot=$('#roster-results');
 if(slot)slot.innerHTML=rosterResults();
 const tools=$('#roster-head-tools');
 if(tools)tools.outerHTML=rosterHeadToolsMarkup();
 if(refreshToolbar){const toolbar=$('.roster-toolbar');if(toolbar)toolbar.outerHTML=rosterFilterToolbar(visiblePeople());}
}
function newPersonClinicians(){return state.rosterPolicy==='assigned'&&!isAdmin()?[clinician()]:clinicians;}
function addPersonDialog(){return `<div class="modal-backdrop"><section class="dialog directory-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="add-person-intro"><header class="dialog-header"><h2 id="dialog-title">Add person</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header><p id="add-person-intro" class="directory-dialog-intro">Add a photo and name. Personal details can follow.</p><form id="add-person-form">${photoCaptureControl('new-person',state.overlay)}<label class="field-label" for="new-person-name">Full name</label><input id="new-person-name" name="name" type="text" autocomplete="off" required maxlength="80" placeholder="First and last name"><label class="field-label" for="new-person-email">Email <span class="muted">(optional)</span></label><input id="new-person-email" name="email" type="email" autocomplete="off" maxlength="120" placeholder="name@example.com"><label class="field-label" for="new-person-clinician">Assigned clinician</label><select id="new-person-clinician">${newPersonClinicians().map(c=>`<option value="${c.id}" ${c.id===state.clinicianId?'selected':''}>${escapeHTML(c.name)}</option>`).join('')}</select><p class="program-form-note">Saved for this demo only.</p><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" class="button primary">Add person</button></footer></form></section></div>`;}
function saveNewPerson(){
 if(state.actor!=='coach'||state.overlay?.type!=='add-person'||state.overlay.photoLoading)return;
 const form=$('#add-person-form'),field=$('#new-person-name'),name=field.value.trim().replace(/\s+/g,' '),email=$('#new-person-email').value.trim(),assigned=$('#new-person-clinician').value;
 field.setCustomValidity(name?'':'Enter a name.');
 const emailField=$('#new-person-email');
 if(email&&!rosterImportEmailShapeOk(email)){emailField.setCustomValidity('Enter a valid email.');}else emailField.setCustomValidity('');
 if(!form.reportValidity()||!newPersonClinicians().some(c=>c.id===assigned))return;
 const words=name.split(' '),initials=[words[0],...(words.length>1?[words.at(-1)]:[])].map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
 const member={id:'person-'+crypto.randomUUID(),name,initials,assigned,color:'',detail:'New member',status:'First visit',last:null,target:null,program:false,baseline:false,createdInDemo:true};
 people.push(member);if(state.overlay.photo)state.memberPhotos[member.id]=state.overlay.photo;if(email)state.memberDetails[member.id]={...(state.memberDetails[member.id]||{}),email};state.overlay=null;
 Object.assign(directoryUI().roster,{query:'',filterKind:'all',filterValue:'all'});
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
function assignedPrograms(){if(state.actor!=='coach')return [];return visiblePeople().flatMap(p=>memberPrograms(p.id).map(program=>({p,program})));}
const TEMPLATE_LIBRARIES=[
 {id:'assessments',label:'Assessment',description:'Protocol defaults for assessments at the station.'},
 {id:'sessions',label:'Sessions',description:'Reusable load presets for sessions and for session plans.'},
 {id:'programs',label:'Programs',description:'Multi-day plans assigned from this workspace.'}
];
function programHoldTimeField(draft,prefix,field){
 const holdStyle=draft.holdStyle||'timed';
 const timed=holdStyle==='timed';
 return `<label class="program-field program-field-hold program-hold-time-label">Hold<div class="hold-time-row${timed?'':' hold-time-row--endurance'}"><select id="${prefix}-hold-style" ${field('holdStyle')} aria-label="Timed hold or endurance"><option value="timed" ${holdStyle==='timed'?'selected':''}>Timed</option><option value="endurance" ${holdStyle==='endurance'?'selected':''}>Endurance</option></select><div class="weight-input hold-seconds-inline"${timed?'':' hidden'}><input id="${prefix}-hold-seconds" ${field('holdSeconds')} type="number" min="2" max="15" step="1" value="${draft.holdSeconds??6}" inputmode="numeric" aria-label="Hold length in seconds"><span>s</span></div></div></label>`;
}
function captureProgramBasicsDraft(prefix,draft={}){
 return {...draft,name:$('#'+prefix+'-name')?.value??draft.name??'',type:$('#'+prefix+'-mode')?.value??draft.type??'strength',holdStyle:$('#'+prefix+'-hold-style')?.value==='endurance'?'endurance':'timed',holdSeconds:Number($('#'+prefix+'-hold-seconds')?.value??draft.holdSeconds??6),total:Number($('#'+prefix+'-total')?.value??draft.total??6),positions:Number($('#'+prefix+'-positions')?.value??draft.positions??4),reps:Number($('#'+prefix+'-reps')?.value??draft.reps??3),load:typeof readProgramLoad==='function'?readProgramLoad(prefix):draft.load};
}
function refreshProgramEditorForm(focusSelector){
 const o=state.overlay;
 if(o?.type!=='program-editor')return;
 const template=clinicProgramTemplates().find(p=>p.id===o.id);
 o.editorDraft=captureProgramBasicsDraft('plan',template||o.editorDraft);
 renderOverlay();
 syncProgramHoldSecondsRow('plan');
 if(focusSelector) $(focusSelector)?.focus({preventScroll:true});
}
function programDraftSetupCfg(draft){
 return {purpose:'session',type:draft.type,holdStyle:draft.holdStyle,holdSeconds:draft.holdSeconds,positions:draft.positions,reps:draft.reps,weight:12,angle:0,isokTab:'session',tiltOverrides:{},accepted:true,continuing:false,programLoad:null,forceEdited:false,challenge:1.5,challengeAuto:draft.type==='isokinetic',challengeHold:1,eccSpeed:'slow',eccCap:18};
}
function programSetupPreviewMarkup(draft){
 if(!splitSetupTypes.has(draft.type))return '';
 const prevSetup=state.setup,prevStage=state.stage;
 state.setup=programDraftSetupCfg(draft);
 setupModeDefaults();
 const html=`<aside class="program-setup-preview" aria-label="Session layout preview"><p class="program-setup-preview-label">How each session opens</p>${isokineticPreview()}</aside>`;
 state.setup=prevSetup;state.stage=prevStage;
 return html;
}
function programFields(draft,prefix='plan',tracked=false){
 const field=name=>tracked?`data-program-field="${name}"`:'';
 const isometric=draft.type==='strength';
 const grid=`<div class="program-editor-grid"><fieldset class="program-basics"><legend>Session settings</legend><div class="program-basics-layout"><label class="program-field program-field-name">Program name<input id="${prefix}-name" ${field('name')} type="text" required maxlength="60" autocomplete="off" placeholder="e.g. Endurance practice" value="${escapeHTML(draft.name)}"></label><div class="program-mode-block${isometric?' program-mode-block--isometric':''}"><label class="program-field program-field-mode">Mode<select id="${prefix}-mode" ${field('type')}>${sessionModeKeys('session').map(key=>`<option value="${key}" ${draft.type===key?'selected':''}>${sessionModes[key].name}</option>`).join('')}</select></label>${isometric?programHoldTimeField(draft,prefix,field):''}</div><div class="program-structure-grid"><label class="program-field">Directions<select id="${prefix}-positions" ${field('positions')}>${[4,8].map(n=>`<option value="${n}" ${Number(draft.positions)===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="program-field">Reps / direction<select id="${prefix}-reps" ${field('reps')}>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(draft.reps)===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="program-field program-field-sessions">Sessions in plan<select id="${prefix}-total" ${field('total')}>${[2,4,6,8,12].map(n=>`<option value="${n}" ${Number(draft.total)===n?'selected':''}>${n}</option>`).join('')}</select></label></div></div></fieldset>${programProgressionFields(draft,prefix)}</div>`;
 const preview=programSetupPreviewMarkup(draft);
 return preview?`<div class="program-editor-split">${grid}${preview}</div>`:grid;
}
function templatesHubRail(activeLibraryId){
 return `<nav class="settings-hub-rail" aria-label="Template libraries">
  <p class="settings-rail-caption" aria-hidden="true">Templates</p>
  ${TEMPLATE_LIBRARIES.map(item=>`<button type="button" class="settings-hub-rail-item ${item.id===activeLibraryId?'is-active':''}" data-action="templates-library" data-library="${item.id}" ${item.id===activeLibraryId?'aria-current="true"':''}>${item.label}</button>`).join('')}
 </nav>`;
}
function templatesPaneHead(active,library){
 const saveAssessment=library==='assessments'?button('Save','save-assessment-workspace','primary'):'';
 const saveSessionPlan=library==='sessions'&&sessionWorkspaceTab()==='session-plan'?button('Save','save-session-workspace','primary'):'';
 const createByLibrary={
  sessions:{action:'new-session-template',ariaLabel:'New session template'},
  programs:{action:'new-template',ariaLabel:'New program template'}
 };
 const create=createByLibrary[library];
 const showCreate=create&&!(library==='sessions'&&sessionWorkspaceTab()==='session-plan');
 const action=saveAssessment||saveSessionPlan||(showCreate?button(icon('plus','icon-sm')+' New template',create.action,'primary',`aria-label="${create.ariaLabel}"`):'');
 const desc=active.description?`<p class="settings-pane-desc">${escapeHTML(active.description)}</p>`:'';
 return `<header class="settings-pane-head">
  <div class="settings-pane-head-row">
   <div class="settings-pane-head-text"><h1>${escapeHTML(active.label)}</h1>${desc}</div>
   ${action?`<div class="settings-pane-head-actions">${action}</div>`:''}
  </div>
 </header>`;
}
function templatesPaneSubnav(activeLibraryId){
 return `<nav class="settings-pane-subtabs settings-pane-subtabs--sections" aria-label="Template libraries">
  ${TEMPLATE_LIBRARIES.map(item=>`<button type="button" data-action="templates-library" data-library="${item.id}" ${item.id===activeLibraryId?'aria-current="page"':''}>${item.label}</button>`).join('')}
 </nav>`;
}
function templatesLibraryPane(library){
 if(library==='assessments')return assessmentWorkspaceBody();
 if(library==='sessions')return teamSessionWorkspaceMarkup();
 Object.assign(directoryUI().programs,{library:'programs',tab:directoryUI().programs.tab||'templates'});
 return programLibraryBody();
}
function programsPage(){
 if(state.actor!=='coach')return peopleView();
 const ui=directoryUI().programs;
 ui.library=TEMPLATE_LIBRARIES.some(item=>item.id===ui.library)?ui.library:'assessments';
 return teamHubPage();
}
function assessmentWorkspaceBody(){
 return teamAssessmentWorkspaceMarkup();
}
function programLibraryBody(){
 const ui=directoryUI().programs;
 return `<nav class="settings-pane-subtabs settings-pane-subtabs--secondary" aria-label="Program views">${[['templates','Templates'],['assigned','Assigned']].map(([key,label])=>`<button type="button" data-action="programs-tab" data-tab="${key}" ${ui.tab===key?'aria-current="page"':''}>${label}<span class="settings-pane-subtab-count">${key==='templates'?clinicProgramTemplates().length:assignedPrograms().length}</span></button>`).join('')}</nav>
  <div class="directory-toolbar program-toolbar">${directorySearch('programs-search','Search programs',ui.query,ui.tab==='templates'?'Search programs':'Search programs or people')}<p>${ui.tab==='templates'?'Assign a copy to a person.':'Assigned programs keep their own settings and progress.'}</p></div>
  <div id="programs-results">${programsResults()}</div>
  <p class="directory-footnote">${ui.tab==='templates'?'Example templates use the existing demo plans.':'Only members you can access are shown.'} Changes are saved in this demo only.</p>`;
}
function programsResults(){
 const ui=directoryUI().programs,q=ui.query.trim().toLowerCase(),assigned=ui.tab==='assigned';
 const rows=assigned?assignedPrograms().filter(({p,program})=>(program.name+' '+p.name+' '+programModeLabel(program)).toLowerCase().includes(q)):clinicProgramTemplates().filter(p=>(p.name+' '+programModeLabel(p)).toLowerCase().includes(q));
 if(!rows.length)return `<div class="directory-empty"><h2>${q?'No matching programs':assigned?'No assigned programs':'No program templates'}</h2><p>${q?'Try another name or mode.':assigned?'Choose a template and assign it to a member.':'Create a reusable plan to assign to people.'}</p>${q?button('Clear search','clear-programs-search','small-button'):assigned?button('Browse templates','browse-templates','small-button'):button('New template','new-template','small-button','aria-label="New program template"')}</div>`;
 return `<div class="directory-table-scroll" tabindex="0" role="region" aria-label="${assigned?'Assigned programs':'Program templates'}, scroll for more columns"><table class="data-table directory-table program-grid"><caption class="sr-only">${assigned?'Assigned programs':'Program templates'}</caption><thead><tr><th scope="col">${assigned?'Person':'Program'}</th><th scope="col">${assigned?'Program':'Mode'}</th><th scope="col">${assigned?'Progress':'Sessions'}</th><th scope="col">Setup</th><th scope="col">Target progression</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map(row=>{const p=assigned?row.program:row,member=assigned?row.p:null;return `<tr><th scope="row">${assigned?`<div class="directory-identity">${photoAvatar(member,'mini')}<button class="directory-person" data-action="program-member" data-id="${member.id}"><span>${escapeHTML(member.name)}</span></button></div>`:`<button class="program-name-button" data-action="edit-template" data-id="${p.id}">${escapeHTML(p.name)}${icon('chevron','icon-sm')}</button>`}</th><td>${assigned?`<strong>${escapeHTML(p.name)}</strong><small>${programModeLabel(p)}</small>`:programModeLabel(p)}</td><td>${assigned?`<strong>${p.completed} / ${p.total}</strong><small>${p.completed>=p.total?'Completed':'Sessions completed'}</small>`:p.total}</td><td>${p.positions} directions<small>${p.reps} reps per direction</small></td><td>${programLoadLabel(p)}</td><td>${assigned?(p.completed<p.total?button('Continue','continue-assigned','small-button',`data-id="${member.id}" data-program-id="${p.id}" aria-label="Continue ${escapeHTML(p.name)} for ${escapeHTML(member.name)}"`):button('Open person','program-member','small-button',`data-id="${member.id}"`)):button('Assign','assign-template','small-button',`data-id="${p.id}" aria-label="Assign ${escapeHTML(p.name)}"`)}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function directoryDialog(o){
 const template=clinicProgramTemplates().find(p=>p.id===o.id),editing=o.type==='program-editor',draft=o.editorDraft||template||{name:'',type:'strength',holdStyle:'timed',holdSeconds:6,total:6,positions:4,reps:3,load:{kind:'assessment',percent:60,increase:0,increaseKind:'percent'}};
 const title=editing?(template?'Edit program template':'New program template'):'Assign program';
 const content=editing?`<p class="directory-dialog-intro">${template?'Changes apply to future assignments. Existing assigned programs keep their settings.':'Create a reusable template, then assign it to people.'}</p><form id="template-form" class="program-form">${programFields(draft)}</form><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" form="template-form" class="button primary">Save program</button></footer>`:`<p class="directory-dialog-intro"><strong>${escapeHTML(draft.name)}</strong><br>${sessionModes[draft.type].name} · ${draft.total} sessions · ${draft.positions} directions · ${draft.reps} reps</p><form id="assign-program-form"><label class="field-label" for="assign-person">Assign to</label><select id="assign-person" required><option value="">Choose a person</option>${visiblePeople().map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}</select><p class="program-form-note">This adds a program to their workspace. No session starts until the settings are reviewed.</p><footer class="directory-dialog-footer">${button('Cancel','close-modal')}<button type="submit" form="assign-program-form" class="button primary">Assign program</button></footer></form>`;
 return `<div class="modal-backdrop"><section class="dialog directory-dialog ${editing?'program-editor-dialog':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></header>${content}</section></div>`;
}
function saveProgramTemplate(){
 if(state.actor!=='coach'||state.overlay?.type!=='program-editor')return;
 const form=$('#template-form'),name=$('#plan-name');name.setCustomValidity(name.value.trim()?'':'Enter a program name.');if(!form.reportValidity())return;
 const draft={name:name.value.trim(),type:$('#plan-mode').value,holdStyle:$('#plan-hold-style')?.value==='endurance'?'endurance':'timed',holdSeconds:Number($('#plan-hold-seconds')?.value),total:Number($('#plan-total').value),positions:Number($('#plan-positions').value),reps:Number($('#plan-reps').value)};
 if(draft.type!=='strength'){draft.holdStyle='timed';delete draft.holdSeconds;}
 else if(draft.holdStyle==='endurance')delete draft.holdSeconds;
 if(!sessionModeKeys('session').includes(draft.type)||![2,4,6,8,12].includes(draft.total)||![4,8].includes(draft.positions)||![1,2,3,4,5].includes(draft.reps))return;
 const load=validateProgramLoadForm('plan',draft.total);if(!load)return;draft.load=load;
 const templates=clinicProgramTemplates(),existing=templates.find(p=>p.id===state.overlay.id);
 if(existing)Object.assign(existing,draft,{example:false});else templates.unshift({...draft,id:'template-'+Date.now(),example:false});
 state.overlay=null;Object.assign(directoryUI().programs,{tab:'templates',query:'',library:'programs'});render();$('[data-action="new-template"]')?.focus();toast('Program template saved.');
}
function assignProgramTemplate(){
 if(state.actor!=='coach'||state.overlay?.type!=='program-assign')return;
 const field=$('#assign-person'),template=clinicProgramTemplates().find(p=>p.id===state.overlay.id),member=visiblePeople().find(p=>p.id===field.value);
 if(!template||!member){$('#assign-program-form').reportValidity();return;}
 if(memberPrograms(member.id).some(p=>p.templateId===template.id&&p.completed<p.total)){field.setCustomValidity('This person already has an active copy of this program.');field.reportValidity();return;}
 memberPrograms(member.id).unshift({id:'program-'+Date.now(),templateId:template.id,name:template.name,type:template.type,holdStyle:template.holdStyle||'timed',holdSeconds:template.holdSeconds,total:template.total,positions:template.positions,reps:template.reps,load:{...programLoad(template)},completed:0});
 state.overlay=null;Object.assign(directoryUI().programs,{tab:'assigned',query:'',library:'programs'});openDirectoryPerson(member.id,'programs');toast('Program assigned to '+member.name+'.');
}
const directoryActions={
 'add-person':()=>{if(state.actor!=='coach')return;openModal('add-person');$('#new-person-name')?.focus();},
 'roster-import-open':()=>{if(state.actor!=='coach')return;openModal('roster-import',{step:'prepare',fileError:'',fileName:'',preview:null});},
 'roster-import-download-template':()=>{if(state.overlay?.type!=='roster-import')return;downloadRosterImportTemplate();},
 'roster-import-back':()=>{if(state.overlay?.type!=='roster-import'||state.overlay.step!=='review')return;state.overlay={type:'roster-import',step:'prepare',fileError:'',fileName:'',preview:null};renderOverlay();},
 'roster-import-confirm':confirmRosterImport,
 'roster-filters':()=>{if(state.actor!=='coach')return;const ui=rosterUI();ui.filterOpen=!ui.filterOpen;refreshRoster({refreshToolbar:true});(ui.filterOpen?$('#roster-filter-kind'):$('[data-action="roster-filters"]'))?.focus();},
 'close-roster-filters':()=>{rosterUI().filterOpen=false;refreshRoster({refreshToolbar:true});$('[data-action="roster-filters"]')?.focus();},
 'roster-columns':()=>{if(state.actor==='coach')openModal('roster-columns');},
 'apply-roster-columns':()=>{if(state.actor!=='coach'||state.overlay?.type!=='roster-columns')return;const ui=rosterUI();ui.columns=$$('input[name="roster-column"]:checked').map(el=>el.value).filter(key=>rosterColumnDefinitions.some(col=>col.key===key));if(!ROSTER_SORT_KEYS.has(ui.sort)||(ui.sort!=='name'&&!ui.columns.includes(ui.sort)))ui.sort='name';state.overlay=null;render();$('[data-action="roster-columns"]')?.focus();},
 'nav-pulse':()=>visitPulse(),'nav-roster':()=>visitDirectory('roster'),'nav-programs':()=>visitTeamHub(null),
 'open-roster-person':el=>openDirectoryPerson(el.dataset.id,'roster'),
 'open-roster-program':el=>openDirectoryPerson(el.dataset.id,'roster','programs'),
 'sort-roster':el=>{const ui=rosterUI(),key=el.dataset.sort;if(!ROSTER_SORT_KEYS.has(key))return;ui.descending=ui.sort===key?!ui.descending:false;ui.sort=key;refreshRoster();$(`[data-action="sort-roster"][data-sort="${key}"]`)?.focus({preventScroll:true});},
 'clear-roster-filters':()=>{Object.assign(directoryUI().roster,{query:'',filterKind:'all',filterValue:'all',sort:'name',descending:false});refreshRoster({refreshToolbar:true});if(rosterUI().filterOpen)$('#roster-filter-kind')?.focus();else $('#directory-search')?.focus();},
 'templates-library':el=>{if(!TEMPLATE_LIBRARIES.some(item=>item.id===el.dataset.library))return;visitTeamHub(el.dataset.library);$(`[data-action="templates-library"][data-library="${el.dataset.library}"]`)?.focus();},
 'team-assessment-positions':el=>{
  if(!isTeamHubNav()||teamHubResolveCard()!=='assessments')return;
  const value=Number(el.dataset.value);
  if(![4,8].includes(value))return;
  teamAssessmentConfig().positions=value;
  render();
  $(`[data-action="team-assessment-positions"][data-value="${value}"]`)?.focus();
 },
 'team-rom-positions':el=>{
  if(!isTeamHubNav()||teamHubResolveCard()!=='assessments')return;
  const value=Number(el.dataset.value);
  if(![4,8].includes(value))return;
  teamRomConfig().positions=value;
  render();
  $(`[data-action="team-rom-positions"][data-value="${value}"]`)?.focus();
 },
 'team-rom-step':el=>{
  if(!isTeamHubNav()||teamHubResolveCard()!=='assessments')return;
  const key=el.dataset.key,rom=teamRomConfig();
  if(!['romStill','romDrop'].includes(key))return;
  const step=Number(el.dataset.step),min=Number(el.dataset.min),max=Number(el.dataset.max);
  rom[key]=Math.max(min,Math.min(max,rom[key]+Number(el.dataset.delta)*step));
  render();
  $(`#${el.id}`)?.focus({preventScroll:true});
 },
 'assessment-tab':el=>{
  if(!isTeamHubNav()||teamHubResolveCard()!=='assessments')return;
  const tab=el.dataset.tab;
  if(!['protocol','rom'].includes(tab))return;
  if(tab!=='protocol')leaveTeamAssessmentEditor();
  directoryUI().programs.assessmentTab=tab;
  render();
  $(`[data-action="assessment-tab"][data-tab="${tab}"]`)?.focus();
 },
 'session-tab':el=>{
  if(!isTeamHubNav()||teamHubResolveCard()!=='sessions')return;
  const tab=el.dataset.tab;
  if(!['templates','session-plan'].includes(tab))return;
  directoryUI().programs.sessionTab=tab;
  render();
  $(`[data-action="session-tab"][data-tab="${tab}"]`)?.focus();
 },
 'programs-tab':el=>{if(!['templates','assigned'].includes(el.dataset.tab))return;Object.assign(directoryUI().programs,{tab:el.dataset.tab,query:'',library:'programs'});render();$(`[data-tab="${el.dataset.tab}"]`)?.focus();},
 'browse-templates':()=>{Object.assign(directoryUI().programs,{tab:'templates',query:'',library:'programs'});render();},
 'clear-programs-search':()=>{directoryUI().programs.query='';render();$('#programs-search')?.focus();},
 'new-session-template':()=>{if(state.actor==='coach')toast('Creating session templates is not in this prototype.');},
 'new-template':()=>{if(state.actor==='coach')openModal('program-editor');},
 'edit-template':el=>{if(state.actor==='coach'&&clinicProgramTemplates().some(p=>p.id===el.dataset.id))openModal('program-editor',{id:el.dataset.id});},
 'assign-template':el=>{if(state.actor==='coach'&&clinicProgramTemplates().some(p=>p.id===el.dataset.id))openModal('program-assign',{id:el.dataset.id});},
 'program-member':el=>openDirectoryPerson(el.dataset.id,'programs'),
 'continue-assigned':el=>{if(state.actor!=='coach'||!visiblePeople().some(p=>p.id===el.dataset.id)||!memberPrograms(el.dataset.id).some(p=>p.id===el.dataset.programId&&p.completed<p.total))return;openDirectoryPerson(el.dataset.id,'programs');beginProgram(el.dataset.programId);}
};
document.addEventListener('input',event=>{
 const el=event.target;if(el.id==='directory-search'){directoryUI().roster.query=el.value;refreshRoster();}
 if(el.id==='programs-search'){directoryUI().programs.query=el.value;$('#programs-results').innerHTML=programsResults();}
 if(el.id==='plan-name'||el.id==='new-person-name'||el.id==='new-person-email')el.setCustomValidity('');
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='roster-import-file'&&el.files?.[0])readRosterImportFile(el.files[0]);
 if(el.id==='roster-filter-kind'){const ui=rosterUI();ui.filterKind=el.value;const options=rosterFilterValueOptions(ui.filterKind,visiblePeople());ui.filterValue=ui.filterKind==='all'?'all':options[0]?.[0]||'all';refreshRoster({refreshToolbar:true});el.focus();}
 if(el.id==='roster-filter-value'){rosterUI().filterValue=el.value;refreshRoster({refreshToolbar:true});el.focus();}
 if(el.id==='assign-person')el.setCustomValidity('');
 if(el.id==='team-assessment-mode'&&isTeamHubNav()&&teamHubResolveCard()==='assessments'){
  teamAssessmentConfig().activeMode=el.value;
  render();
  $('#team-assessment-mode')?.focus();
 }
 if(el.id==='team-assessment-reps'&&isTeamHubNav()&&teamHubResolveCard()==='assessments'){
  teamAssessmentConfig().reps=Number(el.value);
 }
 if(el.id==='team-assessment-hold-style'&&isTeamHubNav()&&teamHubResolveCard()==='assessments'){
  const assessment=teamAssessmentConfig();
  assessment.holdStyle=el.value==='endurance'?'endurance':'timed';
  teamSettings().assessment=normalizeTeamAssessment(assessment);
  syncHoldSecondsVisibility(el);
  el.focus();
 }
 if(el.id==='plan-mode'&&state.overlay?.type==='program-editor')refreshProgramEditorForm('#plan-mode');
 if((el.id==='plan-hold-style'||el.id==='program-hold-style')&&typeof syncProgramHoldSecondsRow==='function')syncProgramHoldSecondsRow(el.id.replace(/-hold-style$/,''));
});
document.addEventListener('submit',event=>{
 if(event.target.id==='add-person-form'){event.preventDefault();saveNewPerson();}
 if(event.target.id==='template-form'){event.preventDefault();saveProgramTemplate();}
 if(event.target.id==='assign-program-form'){event.preventDefault();assignProgramTemplate();}
});
document.addEventListener('click',event=>{
 if(!rosterUI().filterOpen||state.nav!=='roster')return;
 if(event.target.closest('.roster-filter-anchor'))return;
 rosterUI().filterOpen=false;
 refreshRoster({refreshToolbar:true});
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||state.overlay||!rosterUI().filterOpen||state.nav!=='roster')return;
 rosterUI().filterOpen=false;
 refreshRoster({refreshToolbar:true});
 $('[data-action="roster-filters"]')?.focus();
 event.preventDefault();
});
