const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const previewStub={markup:()=>'',mount:()=>({destroy(){},setPlaying(){}})};
const root=path.join(__dirname,'../dist'),context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,RenderedIsometric:previewStub,RenderedIsokinetic:previewStub,document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []},documentElement:{dataset:{}}},location:{href:'http://localhost/'},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null}},matchMedia(){return {matches:false}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','isokinetic-setup','live-rules','export','directory','comparison','mode-experience','session-tools','person-programs','team-settings','team-overview','session-plan','device','waiver','nav-icons','app']){let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');vm.runInContext(source,context,{filename:name+'.js'});}
vm.runInContext(`
const cases=[
 ['standard assessment',{purpose:'assessment',type:'strength'},'assessment'],
 ['ROM assessment',{purpose:'assessment',type:'rom'},'range-of-motion'],
 ['smart session',{purpose:'training',type:'strength'},'smart-session'],
 ['program visit',{purpose:'training',type:'strength',programId:'prog-1'},'program'],
 ['program ROM would still bucket program',{purpose:'assessment',type:'rom',programId:'prog-2'},'program'],
 ['partial legacy',{purpose:'training',type:'isokinetic',partial:true},'smart-session'],
];
for(const [label,record,expected] of cases){
 assert.equal(sessionHistoryCategory(record),expected,label);
 assert.equal(historyRecordMatchesFilter(record,'all'),true);
 assert.equal(historyRecordMatchesFilter(record,expected),true);
 if(expected!=='other')assert.equal(historyRecordMatchesFilter(record,expected==='assessment'?'range-of-motion':'assessment'),false);
}
assert.ok(HISTORY_FILTER_OPTIONS.some(([key])=>key==='range-of-motion'));
state.personId='alex';state.historyCompareUI={};
const panel=memberHistoryPanel();
assert.match(panel,/Range of motion/);
assert.match(panel,/Smart session/);
assert.doesNotMatch(panel,/>Training</);
state.nav='programs';directoryUI().programs.library='assessments';directoryUI().programs.assessmentTab='protocol';
const protocolPane=programsPage();
assert.doesNotMatch(protocolPane,/<option value="rom"/);
directoryUI().programs.assessmentTab='rom';
const romPane=programsPage();
assert.match(romPane,/data-action="assessment-tab"[^>]*data-tab="rom"/);
assert.match(romPane,/Finish the rep when/);
assert.doesNotMatch(romPane,/team-assessment-mode/);
directoryUI().programs.assessmentTab='protocol';
assert.match(protocolPane,/team-assessment-mode/);
state.overlay={type:'session-picker',step:'modes',purpose:'assessment',mode:'strength',selections:{},paused:true};
const picker=sessionPickerView(state.overlay);
assert.match(picker,/mode-group-label/);
assert.match(picker,/Standard assessment/);
assert.match(picker,/data-mode="rom"/);
console.log('PASS — session history categories, filters, assessment ROM tab, grouped picker.');
`,context);