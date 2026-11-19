const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../dist'),context=vm.createContext({assert,console,structuredClone,URL,Blob,crypto:require('node:crypto').webcrypto,document:{baseURI:'http://localhost/experience/',addEventListener(){},querySelector(){return null},querySelectorAll(){return []},documentElement:{dataset:{}}},window:{addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null}},matchMedia(){return {matches:false}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}});
for(const name of ['workspace','report','photos','profile','reps','setup','isokinetic-setup','live-rules','export','directory','comparison','mode-experience','session-tools','person-programs','team-settings','team-overview','session-plan','device','waiver','nav-icons','app']){let source=fs.readFileSync(path.join(root,name+'.js'),'utf8');if(name==='app')source=source.replace(/\nrender\(\);\s*$/,'\n');vm.runInContext(source,context,{filename:name+'.js'});}
vm.runInContext(`
state.actor='coach';state.clinicianId='sam';state.nav='roster';state.personId=null;
const roster=rosterPage();
assert.doesNotMatch(roster,/open-roster-profile/);
assert.doesNotMatch(roster,/roster-profile-cell/);
`,context);
console.log('PASS — roster table has no profile column.');