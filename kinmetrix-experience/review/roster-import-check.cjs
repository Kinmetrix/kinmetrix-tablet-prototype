const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist'),context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,document:{baseURI:'http://localhost/experience/',addEventListener(){},querySelector(){return null},querySelectorAll(){return []},documentElement:{dataset:{}}},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null}},matchMedia(){return {matches:false}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','isokinetic-setup','live-rules','export','session-templates','directory','comparison','mode-experience','session-tools','person-programs','team-settings','team-overview','session-plan','device','waiver','nav-icons','app']){let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');vm.runInContext(source,context,{filename:name+'.js'});}
vm.runInContext(`
render=()=>{};renderOverlay=()=>{};toast=()=>{};
state.actor='coach';state.clinicianId='sam';state.nav='roster';
const roster=rosterPage();
assert.match(roster,/data-action="roster-import-open"/);
assert.match(roster,/>Import</);
const good=parseRosterImportCSV(['name,email','Taylor Brooks,taylor@example.com','Jordan Ellis,jordan@example.com'].join('\\n'));
assert.ok(!good.error);
assert.equal(good.rows.length,2);
let preview=buildRosterImportPreview(good.rows);
assert.equal(preview.filter(row=>row.status==='Ready').length,2);
const dupe=parseRosterImportCSV('name,email\\r\\nAlex Morgan,\\r\\nNew Person,new@example.com');
preview=buildRosterImportPreview(dupe.rows);
assert.equal(preview[0].status,'Blocked');
assert.match(preview[0].issue,/Already on roster/);
assert.equal(preview[1].status,'Ready');
const badHeader=parseRosterImportCSV('full_name,email\\r\\nA,b@c.com');
assert.equal(badHeader.error,'Use the downloaded template.');
const excelMac=parseRosterImportCSV('name,email\\rTaylor Brooks,\\rJordan Ellis,jordan@example.com');
assert.ok(!excelMac.error);
assert.equal(excelMac.rows.length,2);
const headerOnly=parseRosterImportCSV('name,email');
assert.match(headerOnly.error,/at least one member row/);
`,context);
console.log('PASS — roster import UI, parse, and duplicate-name blocking.');