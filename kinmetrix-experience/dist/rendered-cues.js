/* Shared, qualitative annotations. These are teaching cues, not sensor readings. */
const RenderedCues={
 // Instructional previews run faster than a real exercise repetition.
 playbackRate:2,
 vector(path,label,x,y,kind='effort'){
  return `<g class="render-vector render-vector-${kind}" aria-hidden="true"><path class="render-vector-under" d="${path}"/><path class="render-vector-line" d="${path}"/><text x="${x}" y="${y}">${label}</text></g>`;
 },
 hud(){return `<div class="rendered-hud"><strong data-render-cue>Start neutral</strong><div class="rendered-hud-effort" aria-hidden="true"><span>Effort</span><div><i></i></div></div></div><span class="rendered-demo">Demo</span>`;},
 paint(root,cue,effort){
  const text=root.querySelector('[data-render-cue]');if(text.textContent!==cue)text.textContent=cue;
  root.querySelector('.rendered-hud-effort').style.visibility=effort===null?'hidden':'visible';
  root.querySelector('.rendered-hud-effort i').style.transform=`scaleX(${effort||0})`;
 }
};
