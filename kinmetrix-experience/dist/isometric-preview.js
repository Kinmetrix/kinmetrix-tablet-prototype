const root=document.querySelector('#render-root'),play=document.querySelector('#play');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode=new URLSearchParams(location.search).get('mode')==='endurance'?'endurance':'strength';
root.innerHTML=RenderedIsometric.markup({mode});
if(mode==='endurance'){
 document.title='Kinmetrix — Endurance example';document.querySelector('h1').textContent='Endurance';
 document.querySelector('.intro').textContent='Hold effort against the fixed pad. Release to end the rep.';
 document.querySelector('.note').textContent='Demo animation. There is no countdown; releasing effort ends the rep.';
}
function sync(){play.textContent=paused?'Play':'Pause';}
const example=RenderedIsometric.mount(root.firstElementChild,{paused,onPause(){paused=true;sync();}});
play.addEventListener('click',()=>{paused=!paused;example.setPlaying(!paused);sync();});
document.querySelector('#replay').addEventListener('click',()=>{paused=false;example.replay();sync();});
window.addEventListener('pagehide',()=>example.destroy());sync();
