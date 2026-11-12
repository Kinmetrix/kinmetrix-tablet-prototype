const root=document.querySelector('#render-root'),play=document.querySelector('#play');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const requestedMode=new URLSearchParams(location.search).get('mode'),mode=['eccentric','rom'].includes(requestedMode)?requestedMode:'isokinetic';
root.innerHTML=RenderedIsokinetic.markup({mode});
if(mode!=='isokinetic'){
 const name=mode==='eccentric'?'Eccentric':'Range of motion';
 document.title=`Kinmetrix — ${name} example`;document.querySelector('h1').textContent=name;
 document.querySelector('.intro').textContent=mode==='eccentric'?'Keep pushing against the pad as the device moves against you.':'Move through your available range. Your coach reviews new limits.';
 document.querySelector('.note').textContent=mode==='eccentric'?'Concept animation. Blue shows your effort; amber shows device movement.':'Demo animation. The movement range shown is illustrative.';
}
function sync(){play.textContent=paused?'Play':'Pause';}
const example=RenderedIsokinetic.mount(root.firstElementChild,{paused,onPause(){paused=true;sync();}});
play.addEventListener('click',()=>{paused=!paused;example.setPlaying(!paused);sync();});
document.querySelector('#replay').addEventListener('click',()=>{paused=false;example.replay();sync();});
window.addEventListener('pagehide',()=>example.destroy());sync();
