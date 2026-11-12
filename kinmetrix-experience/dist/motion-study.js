import * as THREE from 'three';
import {GLTFLoader} from './vendor/three/GLTFLoader.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.js';
const $=s=>document.querySelector(s),embed=new URLSearchParams(location.search).has('embed');
if(embed)document.body.classList.add('embed');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),stage=$('#viewport');
let renderer,scene,camera,controls,person,cue,model,raf=0,last=0,elapsed=reduced.matches?4.1:0,playing=!reduced.matches,dark=new URLSearchParams(location.search).get('theme')==='dark',visible=true,dirty=true,lastPhase=-1;
const mats={},V=(x,y,z)=>new THREE.Vector3(x,y,z);
function material(color,roughness=.78){return new THREE.MeshStandardMaterial({color,roughness,metalness:.02});}
function ellipsoid(parent,name,pos,scale,mat){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),mat);mesh.name=name;mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function limb(parent,a,b,r1,r2,mat){const av=V(...a),bv=V(...b),length=av.distanceTo(bv),points=[];for(let i=0;i<=18;i++){const t=i/18,cap=Math.sin(Math.PI*t),r=(r1*(1-t)+r2*t)*Math.pow(cap,.2);points.push(new THREE.Vector2(Math.max(.0001,r),length*(t-.5)));}const mesh=new THREE.Mesh(new THREE.LatheGeometry(points,32),mat);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),bv.clone().sub(av).normalize());mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function torsoGeometry(){
 const curve=new THREE.CatmullRomCurve3([[.001,.558,.001],[.105,.58,.082],[.15,.62,.098],[.135,.70,.09],[.13,.8,.095],[.163,.92,.097],[.175,.99,.082],[.135,1.044,.065],[.05,1.076,.045],[.001,1.084,.001]].map(p=>V(...p)));
 const positions=[],indices=[],rings=64,slices=48;
 for(let j=0;j<=rings;j++){const p=curve.getPoint(j/rings),z=THREE.MathUtils.lerp(-.04,.028,THREE.MathUtils.smoothstep(p.y,.58,1.01));for(let i=0;i<=slices;i++){const a=i/slices*Math.PI*2;positions.push(Math.cos(a)*p.x,.6+(p.y-.6)*.78,z+Math.sin(a)*p.z);}}
 for(let j=0;j<rings;j++)for(let i=0;i<slices;i++){const a=j*(slices+1)+i,b=a+slices+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function makeMannequin(){const g=new THREE.Group();g.name='Neutral mannequin';
 const torso=new THREE.Mesh(torsoGeometry(),mats.person);torso.castShadow=true;torso.receiveShadow=true;g.add(torso);
 ellipsoid(g,'Pelvis',[0,.615,-.04],[.155,.095,.105],mats.person);
 limb(g,[0,.945,.028],[0,1.063,-.035],.052,.045,mats.person);
 ellipsoid(g,'Head',[0,1.138,-.046],[.082,.114,.09],mats.person);
 ellipsoid(g,'Jaw',[0,1.09,-.075],[.066,.061,.072],mats.person);
 ellipsoid(g,'Nose',[0,1.134,-.136],[.015,.025,.022],mats.person);
 for(const s of [-1,1]){
  ellipsoid(g,'Ear',[s*.081,1.134,-.051],[.012,.025,.017],mats.person);
  limb(g,[s*.085,.61,-.04],[s*.115,.557,-.39],.087,.068,mats.person);
  ellipsoid(g,'Knee',[s*.115,.55,-.386],[.064,.065,.066],mats.person);
  limb(g,[s*.115,.55,-.386],[s*.115,.058,-.447],.061,.037,mats.person);
  ellipsoid(g,'Foot',[s*.115,.052,-.5],[.052,.045,.118],mats.person);
  ellipsoid(g,'Shoulder',[s*.163,.903,.024],[.053,.059,.058],mats.person);
  limb(g,[s*.163,.901,.024],[s*.205,.729,-.04],.054,.039,mats.person);
  ellipsoid(g,'Elbow',[s*.205,.729,-.04],[.037,.039,.039],mats.person);
  limb(g,[s*.205,.729,-.04],[s*.143,.673,-.259],.038,.028,mats.person);
  const hand=ellipsoid(g,'Hand',[s*.14,.658,-.30],[.034,.024,.066],mats.person);hand.rotation.y=s*.12;
  ellipsoid(g,'Thumb',[s*.11,.654,-.288],[.014,.016,.036],mats.person);
 }
 return g;
}
function changeView(view){if(!camera)return;const views={three:[-2.6,1.75,-3.5],front:[.05,1.25,-4.2],side:[-4.2,1.25,0],contact:[-2.1,1.45,-3.8]};camera.position.set(...views[view]);camera.zoom=view==='contact'?3.2:1;camera.updateProjectionMatrix();controls.target.set(...(view==='contact'?[0,1.19,-.06]:[.04,.83,-.05]));controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));dirty=true;}
function applyTheme(){document.body.classList.toggle('dark',dark);$('#theme').textContent=dark?'Light mode':'Dark mode';if(!scene)return;scene.background=new THREE.Color(dark?'#222528':'#f1f2f3');dirty=true;}
function makeEffortCue(){const g=new THREE.Group();const mat=new THREE.MeshStandardMaterial({color:'#3c7dbb',roughness:.6,emissive:'#214d7c',emissiveIntensity:.16,transparent:true,opacity:.85});const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.13,20),mat);shaft.rotation.x=Math.PI/2;shaft.position.set(0,1.184,-.23);const head=new THREE.Mesh(new THREE.ConeGeometry(.023,.047,24),mat);head.rotation.x=-Math.PI/2;head.position.set(0,1.184,-.316);g.add(shaft,head);return g;}
async function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;stage.append(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#f1f2f3');camera=new THREE.OrthographicCamera(-1.2,1.2,1.2,-1.2,.01,20);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minZoom=.7;controls.maxZoom=4;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI/2+.05;controls.addEventListener('change',()=>{dirty=true;requestFrame()});
 const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.02).texture;environment.dispose();pmrem.dispose();scene.environmentIntensity=.4;
 scene.add(new THREE.HemisphereLight(0xffffff,0x959aa2,1.15));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,5,-3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.blurSamples=8;key.shadow.camera.near=.1;key.shadow.camera.far=10;key.shadow.camera.left=-1.8;key.shadow.camera.right=1.8;key.shadow.camera.top=2.0;key.shadow.camera.bottom=-1.6;key.shadow.normalBias=.015;key.shadow.bias=-.00012;key.shadow.radius=5;key.target.position.set(0,.7,0);scene.add(key,key.target);const fill=new THREE.DirectionalLight(0xffffff,.9);fill.position.set(3,2,1);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-.038;floor.receiveShadow=true;scene.add(floor);
 mats.shell=material('#cdd0d2',.78);mats.hardware=material('#92989d',.7);mats.padding=material('#5d646a',.88);mats.person=material('#9f9f9b',.92);mats.sensor=material('#454b51',.88);
 const gltf=await new GLTFLoader().loadAsync('./assets/models/kinmetrix-v3.glb');model=gltf.scene;
 // The supplied export is rotated to an oblique direction. Set the rotator to forward flexion.
 model.updateMatrixWorld(true);const rotator=model.getObjectByName('Rotator');
 if(rotator){rotator.quaternion.copy(rotator.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(new THREE.Quaternion().setFromAxisAngle(V(0,1,0),-Math.PI/2));model.updateMatrixWorld(true);}

 model.traverse(o=>{if(!o.isMesh)return;const name=o.name;const original=o.material;o.material=/Cover|Front_Car|Bottom_Platform|Eveyrthing|Top_of_Machine/.test(name)?mats.shell:mats.hardware;if(['New13611362','New13011302','New13031304'].includes(name))o.material=mats.padding;if(['New10961097','New10901091','NTP0009Loa11171118'].includes(name))o.material=mats.sensor;o.castShadow=true;o.receiveShadow=true;original.dispose();});scene.add(model);
 person=makeMannequin();scene.add(person);cue=makeEffortCue();scene.add(cue);changeView('three');
 const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);const aspect=w/h,vertical=embed?2.12:2.08;camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();dirty=true;};new ResizeObserver(resize).observe(stage);resize();applyTheme();$('#loading').hidden=true;stage.dataset.loaded='true';if(embed)parent.postMessage({type:'kinmetrix-3d-ready'},location.origin);updatePlayback();requestFrame();
}
const smooth=t=>t*t*(3-2*t);
function frame(now){raf=0;if(document.hidden||!visible){last=0;return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing)elapsed=(elapsed+dt)%9;const phase=elapsed<2.5?0:elapsed<6?1:2;const force=phase===0?smooth(elapsed/2.5):phase===1?.96+.018*Math.sin(elapsed*3.2):1-smooth(Math.min(1,(elapsed-6)/2));$('#effort-fill').style.transform=`scaleX(${Math.max(.03,force)})`;cue.visible=$('#show-cue').checked&&force>.03;cue.scale.setScalar(.85+.15*force);cue.children.forEach(m=>m.material.opacity=.25+.65*force);
 if(phase!==lastPhase){lastPhase=phase;$('#phase').textContent=['Build effort','Hold steady','Release'][phase];$('#stage-phase').textContent=$('#phase').textContent;$('#phase-copy').textContent=['With your forehead against the sensor, build effort without moving.','Maintain effort. Your head and the device stay still.','Ease off the effort, then prepare for the next rep.'][phase];document.querySelectorAll('[data-phase]').forEach(b=>b.classList.toggle('current',+b.dataset.phase===phase));}
 if(playing||dirty){renderer.render(scene,camera);renderer.shadowMap.autoUpdate=false;dirty=false;}if(playing)requestFrame();}
function requestFrame(){if(!raf&&renderer&&cue)raf=requestAnimationFrame(frame);}
function updatePlayback(){$('#play').textContent=playing?'Pause':'Play';if(!playing)last=0;dirty=true;requestFrame();}
function setPlaying(value){playing=value;updatePlayback();}
$('#play').addEventListener('click',()=>setPlaying(!playing));$('#replay').addEventListener('click',()=>{elapsed=0;lastPhase=-1;setPlaying(true)});$('#theme').addEventListener('click',()=>{dark=!dark;applyTheme();requestFrame()});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{changeView(b.dataset.view);requestFrame()}));document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>{elapsed=[1.4,4.1,6.8][+b.dataset.phase];setPlaying(false)}));$('#show-person').addEventListener('change',e=>{if(person)person.visible=e.target.checked;if(renderer)renderer.shadowMap.needsUpdate=true;dirty=true;requestFrame()});$('#show-cue').addEventListener('change',()=>{dirty=true;requestFrame()});document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)requestFrame()});new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestFrame()}).observe(stage);reduced.addEventListener('change',e=>{if(e.matches)setPlaying(false)});
document.addEventListener('keydown',e=>{if(embed&&e.key==='Escape'){e.preventDefault();parent.postMessage({type:'kinmetrix-3d-close'},location.origin);}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='kinmetrix-3d-play')setPlaying(!!e.data.playing);if(e.data?.type==='kinmetrix-3d-theme'){dark=e.data.theme==='dark';applyTheme();requestFrame();}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);controls?.dispose();renderer?.dispose();renderer?.forceContextLoss();});
init().catch(err=>{$('#loading').textContent='3D preview could not load.';$('#error').hidden=false;$('#error').textContent='Try reloading the preview. This scene needs WebGL support.';console.error(err);});
