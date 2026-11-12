/* A rendered Isometric concept. No WebGL or device model is loaded. */
const RenderedIsometric = (() => {
 let nextId=0;
 const ease=t=>t*t*(3-2*t);
 function markup({mode='strength',compact=false}={}){
  const id='iso-render-'+(++nextId),src='assets/renders/isometric-poses-v1.png',endurance=mode==='endurance';
  return `<section class="rendered-isometric" data-render-mode="${mode}" aria-label="${endurance?'Endurance':'Isometric'} movement example">
   <div class="rendered-scene">
    <svg viewBox="0 0 887 750" role="img" aria-label="A neutral mannequin approaches the forehead sensor, then pushes while the head, pad, and arc remain still.">
     <defs><clipPath id="${id}-scene"><path d="M0 0H887V887H0Z"/></clipPath><clipPath id="${id}-person"><path d="M223 298H565V887H223Z"/></clipPath><clipPath id="${id}-pad"><path d="M195 354H263V445H195Z"/></clipPath></defs>
     <g clip-path="url(#${id}-scene)"><image href="${src}" width="1774" height="887"/>
     <g class="rendered-contact" clip-path="url(#${id}-person)"><image href="${src}" x="-887" width="1774" height="887"/></g>
     <!-- Keep the sensor's rendered pixels fixed during the approach and hold. -->
     <g clip-path="url(#${id}-pad)" style="mix-blend-mode:multiply"><image href="${src}" width="1774" height="887"/></g>
     <g class="rendered-force">${RenderedCues.vector('M345 405H252m17-15-17 15 17 15','You push',275,373)}</g>
     </g>
    </svg>
    ${RenderedCues.hud()}
   </div>
   ${compact?'':`<div class="rendered-caption"><strong data-render-heading>Neutral</strong><span data-render-copy>Begin with your head in a neutral position.</span></div>
   <div class="rendered-steps" role="group" aria-label="Preview steps"><button type="button" data-render-step="0" aria-pressed="true">Neutral</button><button type="button" data-render-step="1" aria-pressed="false">Contact</button><button type="button" data-render-step="2" aria-pressed="false">Push</button></div>
   `}
  </section>`;
 }
 function mount(root,{paused=false,onPause=()=>{}}={}){
  const media=matchMedia('(prefers-reduced-motion: reduce)'),endurance=root.dataset.renderMode==='endurance';
  let playing=!paused&&!media.matches,time=0,last=0,raf=0,visible=true,phase=-1;
  const q=s=>root.querySelector(s),steps=[...root.querySelectorAll('[data-render-step]')];
  function paint(){
   const contact=time<1.8?0:time<2.8?ease((time-1.8)):time<8.2?1:time<9?1-ease((time-8.2)/.8):0;
   const effort=time<3.8?0:time<4.8?ease(time-3.8):time<7.2?.9:time<8.2?.9*(1-ease(time-7.2)):0;
   const next=time<1.8?0:time<3.8?1:time<7.2?2:time<8.2?3:0;
   q('.rendered-contact').style.opacity=contact;
   q('.rendered-force').style.opacity=effort;
   const cues=endurance?['Start neutral','Forehead to pad','Hold until you release','Release to end rep']:['Start neutral','Forehead to pad','Push. Pad stays fixed.','Release'];
   RenderedCues.paint(root,cues[next],next>=2?effort:null);
   root.dataset.phase=String(next);
   if(next!==phase){phase=next;const heading=q('[data-render-heading]'),copy=q('[data-render-copy]');if(heading)heading.textContent=['Neutral','Contact',endurance?'Hold until release':'Push and hold','Release'][phase];if(copy)copy.textContent=['Begin with your head in a neutral position.','Bring your forehead to the sensor pad.',endurance?'Keep holding. There is no countdown; releasing effort ends the rep.':'Build effort. Your head and the pad stay still.','Ease off, then return to neutral.'][phase];steps.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===(phase===3?2:phase))));}
  }
  function frame(now){raf=0;if(!playing||document.hidden||!visible){last=0;return;}if(last)time=(time+Math.min(.08,(now-last)/1000)*RenderedCues.playbackRate)%9.5;last=now;paint();request();}
  function request(){if(!raf&&playing&&!document.hidden&&visible)raf=requestAnimationFrame(frame);}
  function setPlaying(value){playing=value;last=0;if(!playing){cancelAnimationFrame(raf);raf=0;}request();}
  function select(event){const button=event.target.closest('[data-render-step]');if(!button)return;time=[0,3.2,5.4][Number(button.dataset.renderStep)];setPlaying(false);paint();onPause();}
  function visibility(){last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();}
  function preference(e){if(e.matches){setPlaying(false);time=5.4;paint();onPause();}}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;request();});observer.observe(root);
  root.addEventListener('click',select);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);paint();request();
  return {setPlaying,replay(){time=0;phase=-1;paint();setPlaying(true);},destroy(){cancelAnimationFrame(raf);observer.disconnect();root.removeEventListener('click',select);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);}};
 }
 return {markup,mount};
})();
