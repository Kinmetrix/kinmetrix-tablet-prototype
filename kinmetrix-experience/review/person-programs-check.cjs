const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist'),context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []},documentElement:{dataset:{}}},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null}},matchMedia(){return {matches:false}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','live-rules','export','directory','comparison','mode-experience','session-tools','person-programs','app']){let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');vm.runInContext(source,context,{filename:name+'.js'});}
vm.runInContext(`
render=()=>{};renderOverlay=()=>{};toast=()=>{};state.personId='alex';
const plan=memberPrograms()[0], rows=programRows(plan);
assert.equal(rows.length,6);assert.equal(rows[0].status,'Completed');assert.equal(rows[2].status,'Next session');
assert.equal(programTargetValue(rows[0]),12);assert.equal(programTargetValue(rows[1]),12.6);assert.equal(programTargetValue(rows[2]),13.2);
const before=programResultValue(rows[0]);plan.load.start=20;
assert.equal(programTargetValue(programRows(plan)[0]),12);assert.equal(programResultValue(programRows(plan)[0]),before);assert.equal(programTargetValue(programRows(plan)[2]),22.1);
plan.load.kind='assessment';assert.equal(programTargetValue(programRows(plan)[2]),null);assert.equal(programTargetValue(programRows(plan)[0]),12);
const partial={...structuredClone(rows[1].record),id:'partial',programSession:3,partial:true,completed:1};state.history.push(partial);
assert.equal(programRows(plan).filter(r=>r.number===3).length,2);assert.equal(programResultValue(programRows(plan).find(r=>r.record?.id==='partial')),null);assert.equal(plan.completed,2);
state.history.push({...structuredClone(partial),id:'complete',partial:false,completed:12});completedProgramSession(state.history.at(-1),{programId:plan.id,programSession:3});
assert.equal(plan.completed,3);assert.equal(programRows(plan).find(r=>r.number===4).status,'Next session');
assert.ok(memberHistoryRecords().some(r=>r.id===rows[0].record.id));
state.personId='maya';assert.equal(memberPrograms().length,0);assert.match(personProgramsView(),/No programs yet/);
state.personId='alex';const saved=structuredClone(plan.exampleVisits);plan.positions=8;assert.equal(programRows(plan)[0].record.positions,4);assert.equal(JSON.stringify(plan.exampleVisits),JSON.stringify(saved));
const markup=personProgramsView();assert.match(markup,/Calculated at setup/);assert.match(markup,/program-visit-toggle/);
console.log('PASS — program visit snapshots, future estimates, assessment targets, partial retries, completion, history linking, and person isolation.');
`,context);
