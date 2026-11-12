/* Simulated rep behavior and finish rules for the live session.
   Everything here is illustrative: force, tilt, fatigue and limits are generated, not measured.
   A rep starts counting only once force rises above the challenge weight, so noise cannot start it.
   Finish rules read one average per second, matching the per-second data the device already reports. */
const LIVE_PUSH_DELAY=.7; // demo: the simulated person starts pushing shortly after Start
function liveStartRep(s){
 const cfg=state.setup,index=s.completed.length,angle=s.angles[Math.floor(index/cfg.reps)]||0,tilt=s.tiltByDirection?.[angle]||{start:0,end:SETUP_MAX_TILT};
 s.telemetry=[];s.bucket=[];s.effortBucket=[];s.perSecond=[];s.effortPerSecond=[];s.hold=null;s.still=0;s.note='';s.outcome=null;s.tiltNow=tilt.start;s.effort=0;
 s.clock=0;s.armed=false;s.lead=0;s.below=0;s.travel=0;s.progress=0;s.newSecond=false;
 // Demo-only variation so reps and directions do not look identical.
 s.sim={angle,tilt,fatigueAt:7+(index*1.7)%5,limit:tilt.start+((tilt.end??tilt.start)-tilt.start)*(.6+(angle/45*.07)%.28)};
}
function liveAverage(values){return values.reduce((sum,value)=>sum+value,0)/values.length;}
function liveSimulate(s){
 const cfg=state.setup,type=cfg.type,sim=s.sim,peak=type==='rom'?3:cfg.weight;
 s.clock+=.1;
 if(!s.armed){
  // Waiting: nothing is counted until the push crosses the challenge weight.
  const push=peak*Math.min(1,Math.max(0,s.clock-LIVE_PUSH_DELAY)/1.5);
  s.effort=push;s.force=type==='rom'?sim.tilt.start:push;s.newSecond=false;
  if(push>=cfg.challenge){s.armed=true;s.lead=s.clock-LIVE_PUSH_DELAY;}
  else{s.note=`Waiting for a push above ${cfg.challenge} kg`;return;}
 }
 s.seconds+=.1;
 const t=s.seconds,wobble=.94+Math.sin(t*3)*.035+Math.cos(t*6)*.018,ramp=Math.min(1,(t+s.lead)/1.5);
 if(type==='rom'){
  // Tilt eases toward this person's simulated limit, then stops. Light effort fades once movement stops.
  const span=Math.max(.1,sim.limit-sim.tilt.start),reach=Math.min(1,t*6/span);
  s.tiltNow=sim.tilt.start+span*(1-Math.pow(1-reach,2))+(reach>=1?Math.sin(t*5)*.08:0);
  const stoppedFor=Math.max(0,t-span/6);s.effort=3*ramp*(1+Math.sin(t*3)*.008)*Math.max(.3,1-stoppedFor*.02);
  s.force=s.tiltNow;
 }else if(type==='endurance'){
  // Ramp up, hold steady, then a quick fatigue drop.
  const tired=Math.max(0,t-sim.fatigueAt);
  s.force=cfg.weight*ramp*wobble*Math.max(.25,1-tired*.24);s.effort=s.force;
 }else if(type==='eccentric'||type==='isokinetic'){
  // The pad only travels while force stays above the challenge weight.
  const rate=type==='eccentric'?(eccentricSpeeds[cfg.eccSpeed]?.rate||4):8,span=Math.abs(sim.tilt.start-sim.tilt.end)||1;
  // Isokinetic effort sits at or just over target, because challenge is set just under it.
  s.force=cfg.weight*ramp*(type==='isokinetic'?1.03+Math.sin(t*3)*.03:wobble);s.effort=s.force;
  if(s.effort>=cfg.challenge)s.travel=Math.min(span,s.travel+rate*.1);
  s.progress=s.travel/span;s.tiltNow=sim.tilt.start+(sim.tilt.end-sim.tilt.start)*s.progress;
 }else{
  s.force=cfg.weight*ramp*wobble;s.effort=s.force;
 }
 s.below=s.effort<cfg.challenge?s.below+.1:0;
 s.bucket.push(s.force);s.effortBucket.push(s.effort);
 if(s.bucket.length>=10){s.perSecond.push(liveAverage(s.bucket));s.effortPerSecond.push(liveAverage(s.effortBucket));s.bucket=[];s.effortBucket=[];s.newSecond=true;}else s.newSecond=false;
}
// Returns the reason the rep ended, or null to keep going.
function liveEndReason(s){
 const cfg=state.setup,type=cfg.type;
 if(!s.armed)return null;
 if(type==='strength'){s.note='';return s.seconds>=cfg.holdSeconds?'Timed hold':null;}
 if(type==='eccentric'||type==='isokinetic'){
  if(type==='eccentric'&&s.force>cfg.eccCap)return 'Safety stop · force cap reached';
  // Eccentric stops at once when the person lets go; isokinetic allows a short grace time.
  if(type==='eccentric'&&s.below>=.3)return 'Safety stop · force fell below challenge';
  if(type==='isokinetic'&&s.below>=cfg.challengeHold)return `Stopped · below challenge for ${cfg.challengeHold} s`;
  s.note=`Pad at ${Math.round(s.tiltNow)}°`;
  return s.progress>=1?'Movement complete':null;
 }
 if(type==='endurance'){
  if(cfg.endCapOn&&s.seconds>=cfg.endCap)return 'Time cap reached';
  const seconds=s.perSecond;s.note=s.hold?s.note:'';if(!seconds.length)return null;
  // Steady seconds are those close to the best second so far. This leaves out the ramp up.
  const best=Math.max(...seconds),steady=seconds.filter(value=>value>=best*.9);
  if(steady.length>=2){s.hold={level:liveAverage(steady),seconds:steady.length};s.note=`Hold level ${s.hold.level.toFixed(1)} kg`;}
  if(!s.newSecond||!s.hold)return null;
  if(seconds.at(-1)<s.hold.level*(1-cfg.endDrop/100)){s.outcome={seconds:s.hold.seconds,value:s.hold.level};return `Force dropped ${cfg.endDrop}% below hold`;}
  return null;
 }
 if(type==='rom'){
  if(s.tiltNow>=s.sim.tilt.end)return 'Safety limit reached';
  if(!s.newSecond||s.perSecond.length<2){if(!s.still)s.note='';return null;}
  const tilts=s.perSecond,efforts=s.effortPerSecond;
  s.still=Math.abs(tilts.at(-1)-tilts.at(-2))<.5?s.still+1:0;
  s.note=s.still?`No movement for ${s.still} s`:'';
  s.outcome={seconds:s.seconds,value:tilts.at(-1)};
  if(cfg.romStillOn&&s.still>=cfg.romStill)return `No movement for ${cfg.romStill} s`;
  if(cfg.romDropOn&&efforts.at(-1)<Math.max(...efforts)*(1-cfg.romDrop/100)&&s.still>0)return `Force dropped ${cfg.romDrop}%`;
  s.outcome=null;return null;
 }
 return null;
}
function liveScaleMax(){const s=state.session;return state.setup.type==='rom'?(s?.sim?.tilt.end||SETUP_MAX_TILT):state.setup.weight*1.25;}
function liveChallengePercent(){const cfg=state.setup;return cfg.type==='rom'?null:Math.min(100,cfg.challenge/(cfg.weight*1.25)*100);}
function liveUnitLabel(){const cfg=state.setup;return cfg.type==='rom'?'° tilt':`kg / ${cfg.weight} target<br>${cfg.challenge} challenge`;}
function liveElapsedLabel(){const cfg=state.setup;return cfg.type==='strength'?`of ${cfg.holdSeconds} second hold`:cfg.type==='endurance'?'seconds held':'seconds elapsed';}
function liveInstruction(){
 const cfg=state.setup;
 return ({strength:`Aim for ${cfg.weight} kg and hold for ${cfg.holdSeconds} seconds. Timing starts above ${cfg.challenge} kg.`,endurance:`No countdown. The rep ends by itself when your force drops ${cfg.endDrop}% below your hold.`,rom:'Move as far as is comfortable. The rep ends when you stop moving.',eccentric:`The device moves the pad back at ${eccentricSpeeds[cfg.eccSpeed].label.toLowerCase()} speed. Resist all the way. It stops if you let go.`,isokinetic:`Push above ${cfg.challenge} kg and the pad moves with you. Ease off and it stops.`})[cfg.type];
}
function liveBusyLabel(){return ({strength:'Hold in progress…',endurance:'Holding…',rom:'Measuring…',eccentric:'Device moving…',isokinetic:'Moving…'})[state.setup.type];}
