/* Rendered Isokinetic concept: one rigid arc/pad raster, rotated behind a fixed guide. */
const RenderedIsokinetic=(()=>{
 let nextId=0;
 const ease=t=>t*t*(3-2*t);
 // One continuous raster figure: head follows the pad, shoulders stay planted,
 // and only the neck's texture bends between them. The rail is never skinned.
 const neckTop=550,neckBottom=646,neckRows=24,headContactOffset=4,neckTriangles=[];
 for(let row=0;row<neckRows;row++){
  const top=neckTop+(neckBottom-neckTop)*row/neckRows,bottom=top+(neckBottom-neckTop)/neckRows;
  neckTriangles.push([[200,top],[570,top],[200,bottom]],[[570,top],[570,bottom],[200,bottom]]);
 }
 function trianglePath(points){
  const center=points.reduce((sum,p)=>[sum[0]+p[0]/3,sum[1]+p[1]/3],[0,0]);
  // Subpixel overlap prevents seams between adjacent texture triangles.
  return points.map((p,i)=>{const dx=p[0]-center[0],dy=p[1]-center[1],length=Math.hypot(dx,dy);return `${i?'L':'M'}${p[0]+.6*dx/length} ${p[1]+.6*dy/length}`;}).join('')+'Z';
 }
 function skinPoint([x,y],angle){
  const weight=1-ease(Math.max(0,Math.min(1,(y-neckTop)/(neckBottom-neckTop))));
  const radians=angle*weight*Math.PI/180,dx=x+headContactOffset*weight-407,dy=y-556;
  return [407+dx*Math.cos(radians)-dy*Math.sin(radians),556+dx*Math.sin(radians)+dy*Math.cos(radians)];
 }
 function triangleMatrix(source,target){
  const [p,q,r]=source,[u,v,w]=target;
  const sx=q[0]-p[0],sy=q[1]-p[1],tx=r[0]-p[0],ty=r[1]-p[1],det=sx*ty-tx*sy;
  const vx=v[0]-u[0],vy=v[1]-u[1],wx=w[0]-u[0],wy=w[1]-u[1];
  const a=(vx*ty-wx*sy)/det,b=(vy*ty-wy*sy)/det,c=(wx*sx-vx*tx)/det,d=(wy*sx-vy*tx)/det;
  return `matrix(${a} ${b} ${c} ${d} ${u[0]-a*p[0]-c*p[1]} ${u[1]-b*p[0]-d*p[1]})`;
 }
 function markup({mode='isokinetic',compact=false}={}){
  const id='isok-render-'+(++nextId),eccentric=mode==='eccentric',rom=mode==='rom';
  return `<section class="rendered-isokinetic" data-render-mode="${mode}" aria-label="${eccentric?'Eccentric':rom?'Range of motion':'Isokinetic'} movement example">
   <div class="rendered-scene">
    <svg viewBox="0 0 887 750" role="img" aria-label="${eccentric?'The device moves the head back while the person pushes forward against the pad.':rom?'The head follows the pad through the available range, stopping at the personal limit.':'The forehead stays against the sensor as the rigid curved rail slides through its stationary holder.'}">
     <defs>
      <clipPath id="${id}-scene"><path d="M0 0H887V887H0Z"/></clipPath>
      <clipPath id="${id}-holder"><path d="M318 168H468V295H318Z"/></clipPath>
      <clipPath id="${id}-arc"><path d="M85 205H640V460H85Z"/></clipPath>
      <image id="${id}-person-image" href="assets/renders/isokinetic-person-v2.png" width="887" height="887"/>
      <clipPath id="${id}-head"><path d="M0 0H887V${neckTop+.5}H0Z"/></clipPath>
      <clipPath id="${id}-torso"><path d="M0 ${neckBottom-.5}H887V887H0Z"/></clipPath>
      ${neckTriangles.map((points,i)=>`<clipPath id="${id}-neck-${i}"><path d="${trianglePath(points)}"/></clipPath>`).join('')}
      <linearGradient id="${id}-join" x1="0" y1="646" x2="0" y2="700" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
      <mask id="${id}-blend"><path fill="url(#${id}-join)" d="M0 0H887V887H0Z"/></mask>
     </defs>
     <g clip-path="url(#${id}-scene)">
      <image class="isok-stationary" href="assets/renders/isokinetic-fixed-v1.png" width="887" height="887"/>
      <g class="isok-person" mask="url(#${id}-blend)">
       <g class="isok-head"><use href="#${id}-person-image" clip-path="url(#${id}-head)"/></g>
       ${neckTriangles.map((_,i)=>`<g data-neck-triangle="${i}"><use href="#${id}-person-image" clip-path="url(#${id}-neck-${i})"/></g>`).join('')}
       <use href="#${id}-person-image" clip-path="url(#${id}-torso)"/>
      </g>
      <!-- Never interpolate two arc shapes. Only rotation changes on this group. -->
      <g class="isok-rigid" transform="rotate(0 407 556)">
       <g clip-path="url(#${id}-arc)"><image href="assets/renders/isokinetic-parts-v1.png" x="20" y="64" width="1490.16" height="745.08"/></g>
      </g>
      <!-- This foreground guide occludes the moving rail and never transforms. -->
      <g class="isok-holder" clip-path="url(#${id}-holder)"><image href="assets/renders/isokinetic-fixed-v1.png" width="887" height="887"/></g>
      <g class="isok-motion-cue" transform="rotate(0 407 556)">
       ${RenderedCues.vector(eccentric?'M218 315Q257 278 305 257m-20-3 20 3-9 19':'M305 257Q257 278 218 315m3-21-3 21 21-4',eccentric?'Device':'Moves',235,236,eccentric?'device':'movement')}
       ${rom?'':RenderedCues.vector(eccentric?'M338 380L255 420m9-21-9 21 23 4':'M345 405H252m17-15-17 15 17 15',eccentric?'You resist':'You push',280,368)}
      </g>
     </g>
    </svg>
    ${RenderedCues.hud()}
   </div>
   ${compact?'':`<div class="rendered-caption"><strong data-render-heading>Neutral</strong><span data-render-copy>Begin with your head in a neutral position.</span></div>
   <div class="rendered-steps" role="group" aria-label="Preview steps"><button type="button" data-isok-step="0" aria-pressed="true">${eccentric?'Ready':'Neutral'}</button><button type="button" data-isok-step="1" aria-pressed="false">${eccentric?'Resist':'Contact'}</button><button type="button" data-isok-step="2" aria-pressed="false">Move</button><button type="button" data-isok-step="3" aria-pressed="false">End</button></div>
   `}
  </section>`;
 }
 function mount(root,{paused=false,onPause=()=>{}}={}){
  const media=matchMedia('(prefers-reduced-motion: reduce)'),q=s=>root.querySelector(s),steps=[...root.querySelectorAll('[data-isok-step]')],eccentric=root.dataset.renderMode==='eccentric',rom=root.dataset.renderMode==='rom';
  let playing=!paused&&!media.matches,time=0,last=0,raf=0,visible=true,phase=-1;
  const neckPieces=[...root.querySelectorAll('[data-neck-triangle]')];let lastHeadAngle=null;
  function paint(){
   const contact=time<1.6?0:time<2.6?ease(time-1.6):time<10.8?1:time<11.8?1-ease(time-10.8):0;
   // Constant angular speed through the working range; the return resets the demonstration.
   const progress=time<3.6?0:time<7.6?(time-3.6)/4:time<8.4?1:time<10.8?1-ease((time-8.4)/2.4):0;
   const next=time<1.6?0:time<3.6?1:time<7.6?2:time<8.4?3:time<10.8?4:0;
   const angle=eccentric?-16*(1-progress):-16*progress;
   const headAngle=angle+(eccentric?0:6*(1-contact));
   if(headAngle!==lastHeadAngle){
    q('.isok-head').setAttribute('transform',`rotate(${headAngle} 407 556) translate(${headContactOffset} 0)`);
    neckPieces.forEach((piece,i)=>piece.setAttribute('transform',triangleMatrix(neckTriangles[i],neckTriangles[i].map(point=>skinPoint(point,headAngle)))));
    lastHeadAngle=headAngle;
   }
   q('.isok-rigid').setAttribute('transform',`rotate(${angle} 407 556)`);
   q('.isok-motion-cue').setAttribute('transform',`rotate(${angle} 407 556)`);
   q('.isok-motion-cue').style.opacity=next===2||next===3?1:0;
   const cues=eccentric?['Forehead against pad','Build resistance','Resist as the pad moves','Release','Reset']:rom?['Start neutral','Forehead to pad','Move to your limit','Stop at your limit','Return']:['Start neutral','Forehead to pad','Push as the pad moves','Movement complete','Return'];
   RenderedCues.paint(root,cues[next],!rom&&(next===2||next===3)?.78:null);
   root.dataset.phase=String(next);
   if(next!==phase){phase=next;
    const heading=q('[data-render-heading]'),copy=q('[data-render-copy]');if(heading)heading.textContent=cues[phase];
    if(copy)copy.textContent=(eccentric?['Begin in contact with the pad.','Build effort toward the pad.','Keep pushing forward as the device moves your head back.','Ease off your effort.','The illustration resets for another rep.']:rom?['Begin with your head in a neutral position.','Bring your forehead to the sensor pad.','Move through your available range.','Stop at your limit; your coach reviews the result.','Return to the starting position.']:['Begin with your head in a neutral position.','Bring your forehead to the sensor pad.','Keep contact as the pad and rigid arc move through the holder.','The arc keeps its shape. The holder stays in place.','Return to the starting position.'])[phase];
    steps.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===(phase===4?3:phase))));
   }
  }
  function request(){if(!raf&&playing&&!document.hidden&&visible)raf=requestAnimationFrame(frame);}
  function frame(now){raf=0;if(!playing||document.hidden||!visible){last=0;return;}if(last)time=(time+Math.min(.08,(now-last)/1000)*RenderedCues.playbackRate)%12.4;last=now;paint();request();}
  function setPlaying(value){playing=value;last=0;if(!playing){cancelAnimationFrame(raf);raf=0;}request();}
  function select(event){const b=event.target.closest('[data-isok-step]');if(!b)return;time=[0,3,5.8,8][Number(b.dataset.isokStep)];setPlaying(false);paint();onPause();}
  function visibility(){last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();}
  function preference(e){if(e.matches){setPlaying(false);time=5.8;paint();onPause();}}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;request();});observer.observe(root);
  root.addEventListener('click',select);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);paint();request();
  return {setPlaying,replay(){time=0;phase=-1;paint();setPlaying(true);},destroy(){cancelAnimationFrame(raf);observer.disconnect();root.removeEventListener('click',select);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);}};
 }
 return {markup,mount};
})();
