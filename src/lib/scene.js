import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {SURFACE,surfaceNormal,projectSurface,tangentVector,surfaceStep,sampleSurface,surfaceSamples,liftForDisplay} from './surface.js';
import {advanceTime,clampTime,DURATION,shiftedPoint,flowCacheSettings} from './animation.js';
import {createAnimatedSurface} from './animated-surface.js';
import { createFields, seededRandom, magnitude, rk2, createVectorSampler } from './noise.js';

const palette=[new THREE.Color('#083943'),new THREE.Color('#237d83'),new THREE.Color('#83cbb4'),new THREE.Color('#e8f4cb')];
function fieldColor(t, wood=false){
 t=THREE.MathUtils.clamp(t,0,1);
 if(wood) return new THREE.Color('#3e1c16').lerp(new THREE.Color('#e4b078'),t);
 const i=Math.min(2,Math.floor(t*3));return palette[i].clone().lerp(palette[i+1],t*3-i);
}
const vertexShader=`attribute float fieldValue; varying vec3 vNormal; varying vec3 vWorld; varying float vField;
void main(){vNormal=normalize(normalMatrix*normal); vField=fieldValue; vWorld=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader=`precision highp float; varying vec3 vNormal; varying vec3 vWorld; varying float vField;
uniform float uContours; uniform float uWood;
void main(){
 float t=clamp(vField*.65+.48,0.,1.); vec3 a=vec3(.025,.19,.22),b=vec3(.10,.43,.46),c=vec3(.47,.78,.65),d=vec3(.89,.96,.78);
 vec3 col=t<.34?mix(a,b,t/.34):t<.7?mix(b,c,(t-.34)/.36):mix(c,d,(t-.7)/.3);
 if(uWood>.5)col=mix(vec3(.12,.04,.022),vec3(.91,.68,.39),t);
 float light=.42+.62*max(0.,dot(normalize(vNormal),normalize(vec3(-.3,.8,.7)))); col=pow(col,vec3(2.2))*light;
 float coord=(vField+2.)*15.; float edge=abs(fract(coord-.5)-.5)/max(fwidth(coord),.0001); float line=1.-smoothstep(.1,1.15,edge);
 col=mix(col,col+vec3(.17,.3,.25),line*.43*uContours);
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function disposeGroup(group){
 const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();
}
export function createScene(container,initial,onStats,onError,{onTime=()=>{},onPlaybackEnd=()=>{}}={}){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onError('This view needs WebGL 2. Try an up-to-date browser with hardware acceleration enabled.');return null;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#0a141d');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.domElement.setAttribute('aria-label','Interactive 3D noise visualization. Drag to orbit, scroll to zoom, or use the view buttons.');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.fog=new THREE.Fog('#0a141d',15,35);
 const camera=new THREE.PerspectiveCamera(39,1,.1,80);camera.position.set(8.8,8,10);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=4;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.88;controls.target.set(0,-.4,0);controls.enablePan=true;
 const content=new THREE.Group();scene.add(content);
 const floor=new THREE.GridHelper(40,40,'#29414a','#192b36');floor.position.y=-2.45;floor.material.transparent=true;floor.material.opacity=.44;scene.add(floor);
 let params={...initial},fields=createFields(params.seed),playing=!window.matchMedia('(prefers-reduced-motion: reduce)').matches,particles=null,arrows=null,particleObjects=[],raf=0,disposed=false,last=0,accumulator=0,frameCount=0,invalidated=true;
 let sampleVelocity=null,animated=null,animationTime=0,lastTimeNotify=0,animationDrawAccumulator=0,arrowUpdateAccumulator=0;
 const onSurface=()=>params.flowSurface!=='volume';
 const rawVelocity=(x,y,z,time=animationTime)=>{const q=shiftedPoint([x,y,z],time),inside=q.every(value=>Math.abs(value)<4.64),v=sampleVelocity&&inside?sampleVelocity(...q):fields.vector(...q,params);return onSurface()?tangentVector(v,[x,y,z],params.flowSurface):v;};
 const velocity=(x,y,z,time=animationTime)=>{const v=rawVelocity(x,y,z,time);let k=params.speed;if(params.constantSpeed){const m=magnitude(v);k=m>1e-8?k/m:0;}return v.map(n=>n*k);};
 const stats={surfaceError:0,mode:'terrain',vertices:0,arrows:0,particles:0,maxMagnitude:1,frame:0};
 function buildArrows(){
  const n=params.vectorDensity,positions=[],colors=[],sampled=[];let max=0,glyphCount=0;
  const points=onSurface()?surfaceSamples(params.flowSurface,n):[];
  if(!onSurface())for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(let k=0;k<n;k++)points.push([(i/(n-1)-.5)*5.6,(j/(n-1)-.5)*5.6,(k/(n-1)-.5)*5.6]);
  for(const p of points){const v=rawVelocity(...p),mag=magnitude(v);max=Math.max(max,mag);sampled.push({p,v,mag});}
  for(const {p,v,mag} of sampled){
   if(mag<1e-7)continue;glyphCount++;
   const direction=new THREE.Vector3(...v).normalize(),length=Math.min(onSurface()?.38:.55,mag*.26)*params.vectorLength;
   const base=new THREE.Vector3(...p),normal=onSurface()?new THREE.Vector3(...surfaceNormal(p,params.flowSurface)):(Math.abs(direction.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0));
   const side=new THREE.Vector3().crossVectors(direction,normal).normalize(),end=base.clone().addScaledVector(direction,length),head=Math.min(.12,length*.3),wing=end.clone().addScaledVector(direction,-head);
   const col=params.magnitudeColor?fieldColor(.18+.82*mag/Math.max(max,.001)):new THREE.Color('#83dbcd');
   const display=v=>onSurface()?liftForDisplay(projectSurface(v.toArray(),params.flowSurface,p),params.flowSurface,.026):v.toArray();
   const segments=[];const pieces=onSurface()?4:1;
   for(let i=0;i<pieces;i++)segments.push([base.clone().addScaledVector(direction,length*i/pieces),base.clone().addScaledVector(direction,length*(i+1)/pieces)]);
   segments.push([end,wing.clone().addScaledVector(side,head*.48)],[end,wing.clone().addScaledVector(side,-head*.48)]);
   for(const [a,b] of segments){positions.push(...display(a),...display(b));colors.push(col.r,col.g,col.b,col.r,col.g,col.b);}
  }
  if(arrows&&arrows.geometry.attributes.position.array.length===positions.length){
   arrows.geometry.attributes.position.array.set(positions);arrows.geometry.attributes.color.array.set(colors);arrows.geometry.attributes.position.needsUpdate=true;arrows.geometry.attributes.color.needsUpdate=true;arrows.visible=params.vectors;
  }else{
   if(arrows){arrows.geometry.dispose();arrows.material.dispose();content.remove(arrows);}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),8);
   arrows=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.83}));arrows.visible=params.vectors;content.add(arrows);
  }
  stats.arrows=params.vectors?glyphCount:0;stats.maxMagnitude=max;
 }
 function buildFlowSurface(){
  const sphere=params.flowSurface==='sphere';const geometry=sphere?new THREE.SphereGeometry(SURFACE.sphereRadius,88,56):new THREE.TorusGeometry(SURFACE.majorRadius,SURFACE.minorRadius,40,100);
  if(!sphere)geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position,values=new Float32Array(positions.count);
  for(let i=0;i<positions.count;i++)values[i]=fields.noise(positions.getX(i)*params.frequency,positions.getY(i)*params.frequency,positions.getZ(i)*params.frequency)*.18-.83;
  geometry.setAttribute('fieldValue',new THREE.BufferAttribute(values,1));
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uContours:{value:.08},uWood:{value:0}},side:THREE.FrontSide});
  content.add(new THREE.Mesh(geometry,material));stats.vertices=positions.count;
 }
 function resetParticle(i){
  const {random,pos,history,ages}=particles;pos[i]=onSurface()?sampleSurface(random,params.flowSurface):[(random()-.5)*5.6,(random()-.5)*5.6,(random()-.5)*5.6];ages[i]=random()*7;
  for(let t=0;t<params.trailLength;t++)history.set(pos[i],(i*params.trailLength+t)*3);
 }
 function buildParticles(){
  for(const object of particleObjects){object.geometry.dispose();object.material.dispose();content.remove(object);}particleObjects=[];particles=null;
  if(!params.particles){particles=null;stats.particles=0;return;}
  const count=params.particleCount,trail=params.trailLength,history=new Float32Array(count*trail*3),liftedHistory=new Float32Array(count*trail*3),positions=new Float32Array(count*(trail-1)*6),colors=new Float32Array(positions.length),points=new Float32Array(count*3),pointColors=new Float32Array(count*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),7);
  const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false}));content.add(line);particleObjects.push(line);
  const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));pointGeometry.setAttribute('color',new THREE.BufferAttribute(pointColors,3).setUsage(THREE.DynamicDrawUsage));pointGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),7);const pointCloud=new THREE.Points(pointGeometry,new THREE.PointsMaterial({size:.036,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));content.add(pointCloud);particleObjects.push(pointCloud);
  particles={random:seededRandom(params.seed+4444),pos:Array(count),ages:new Float32Array(count),history,liftedHistory,geometry,pointGeometry,positions,colors,points,pointColors};
  for(let i=0;i<count;i++)resetParticle(i);
  stepParticles(0);
  stats.particles=count;
 }
 function writeTrailPoint(target,offset,source,index){
  const x=source[index],y=source[index+1],z=source[index+2];
  if(!onSurface()){target[offset]=x;target[offset+1]=y;target[offset+2]=z;return;}
  let nx=x,ny=y,nz=z;
  if(params.flowSurface==='torus'){const rho=Math.hypot(x,z)||1;nx=x-SURFACE.majorRadius*x/rho;nz=z-SURFACE.majorRadius*z/rho;}
  const scale=.018/(Math.hypot(nx,ny,nz)||1);target[offset]=x+nx*scale;target[offset+1]=y+ny*scale;target[offset+2]=z+nz*scale;
 }
 function stepParticles(dt,render=true){
  if(!particles)return;
  const {pos,history,liftedHistory,ages,positions,colors,points,pointColors}=particles,n=params.particleCount,trail=params.trailLength;
  for(let i=0;i<n;i++){
   const next=dt>0?(onSurface()?surfaceStep(pos[i],dt,velocity,params.flowSurface,animationTime):rk2(pos[i],dt,velocity,animationTime)):pos[i];ages[i]+=dt;
   if((!onSurface()&&(next.some(x=>Math.abs(x)>3.2)||ages[i]>12))||next.some(x=>!Number.isFinite(x))){resetParticle(i);}else if(dt>0){pos[i]=next;const start=i*trail*3;history.copyWithin(start+3,start,start+(trail-1)*3);history.set(next,start);}
   if(!render)continue;
   const mag=magnitude(rawVelocity(...pos[i]));const color=params.magnitudeColor?fieldColor(.22+.78*mag/Math.max(stats.maxMagnitude,.001)):new THREE.Color('#a0efd0');
   points.set(onSurface()?liftForDisplay(pos[i],params.flowSurface):pos[i],i*3);pointColors.set([color.r,color.g,color.b],i*3);
   for(let j=0;j<trail;j++){const h=(i*trail+j)*3;writeTrailPoint(liftedHistory,h,history,h);}
   for(let j=0;j<trail-1;j++){const offset=(i*(trail-1)+j)*6,h=(i*trail+j)*3,fade=1-j/trail;
    for(let c=0;c<6;c++)positions[offset+c]=liftedHistory[h+c];for(let end=0;end<2;end++){colors[offset+end*3]=color.r*fade;colors[offset+end*3+1]=color.g*fade;colors[offset+end*3+2]=color.b*fade;}
   }
  }
  if(!render)return;
  particles.geometry.attributes.position.needsUpdate=true;particles.geometry.attributes.color.needsUpdate=true;particles.pointGeometry.attributes.position.needsUpdate=true;particles.pointGeometry.attributes.color.needsUpdate=true;
 }
 function rebuild(){
  invalidated=true;
  disposeGroup(content);particles=null;arrows=null;particleObjects=[];animated=null;fields=createFields(params.seed);sampleVelocity=null;accumulator=0;animationDrawAccumulator=0;arrowUpdateAccumulator=0;
  if(params.lesson==='flow'){
   sampleVelocity=createVectorSampler((x,y,z)=>fields.vector(x,y,z,params),flowCacheSettings(params.frequency));
   floor.position.y=-3.4;
   if(onSurface())buildFlowSurface();else{const box=new THREE.BoxGeometry(6.4,6.4,6.4),edges=new THREE.EdgesGeometry(box);box.dispose();content.add(new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:'#284653',transparent:true,opacity:.62})));stats.vertices=0;}
   buildArrows();buildParticles();stats.mode=params.flowSurface==='volume'?'volume':`flow-${params.flowSurface}`;
  }else{
   const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms:{uContours:{value:params.contours?1:0},uWood:{value:params.lesson==='warp'&&params.warpStyle==='wood'?1:0}},wireframe:params.wireframe,side:THREE.DoubleSide});
   animated=createAnimatedSurface(params,fields,material);animated.update(animationTime,params);content.add(animated.group);floor.position.y=-3.2;stats.mode=`${params.lesson}-${params.shape}`;stats.vertices=animated.vertices;stats.arrows=0;stats.particles=0;
  }
  controls.autoRotate=params.autoRotate;controls.autoRotateSpeed=.7;onStats({...stats});
 }
 const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(w&&h){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);invalidated=true;}});observer.observe(container);
 function resetCamera(){invalidated=true;const shape=params.lesson==='flow'?params.flowSurface:params.shape,scale=shape==='torus'?.7:shape==='sphere'?.84:1;camera.position.set(8.8,8,10).multiplyScalar(scale);controls.target.set(0,params.lesson==='flow'||params.shape!=='terrain'?0:-.4,0);controls.update(0);}
 function onKey(event){invalidated=true;if(event.target!==renderer.domElement)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'];if(!keys.includes(event.key))return;event.preventDefault();if(event.key==='Home')resetCamera();else if(event.key==='+'||event.key==='-')camera.position.sub(controls.target).multiplyScalar(event.key==='+'?.9:1.1).add(controls.target);else{const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);if(event.key==='ArrowLeft')s.theta-=.12;if(event.key==='ArrowRight')s.theta+=.12;if(event.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.12);if(event.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.12);camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(controls.target));}controls.update(0);}
 renderer.domElement.addEventListener('keydown',onKey);
 const onLost=e=>{e.preventDefault();onError('The graphics context was interrupted. Reload this page to rebuild the view.');};renderer.domElement.addEventListener('webglcontextlost',onLost);
 function flushFrame(){
  if(params.lesson==='flow'){buildArrows();stepParticles(0);}else animated?.update(animationTime,params);
  onTime(animationTime);onStats({...stats});invalidated=true;
 }
 function animate(now){
  if(disposed)return;raf=requestAnimationFrame(animate);const dt=Math.min(.08,(now-(last||now))/1000);last=now;let stepped=false;
  if(playing&&!document.hidden){
   if(params.lesson==='flow'){
    accumulator+=dt*params.playbackSpeed;let steps=0;
    while(accumulator>=1/60&&steps<5&&animationTime<DURATION){const h=Math.min(1/60,DURATION-animationTime);stepParticles(h,false);animationTime=clampTime(animationTime+h);accumulator-=1/60;steps++;}
    if(steps>0){arrowUpdateAccumulator+=steps/60;if(arrowUpdateAccumulator>=.1||animationTime===DURATION){buildArrows();arrowUpdateAccumulator=0;}stepParticles(0);stepped=true;}
    if(steps===5)accumulator=0;
   }else{
    animationTime=advanceTime(animationTime,dt,params.playbackSpeed,true);animationDrawAccumulator+=dt;
    if(animationDrawAccumulator>=1/30||animationTime===DURATION){animated?.update(animationTime,params);animationDrawAccumulator%=1/30;stepped=true;}
   }
   if(now-lastTimeNotify>100||animationTime===DURATION){onTime(animationTime);if(params.lesson==='flow')onStats({...stats});lastTimeNotify=now;}
   if(animationTime===DURATION){playing=false;flushFrame();onPlaybackEnd();}
  }
  controls.autoRotate=params.autoRotate&&playing&&!document.hidden;const moved=controls.update(dt);if(invalidated||moved||stepped){renderer.render(scene,camera);invalidated=false;}frameCount++;
  renderer.domElement.dataset.frame=String(frameCount);renderer.domElement.dataset.mode=stats.mode;renderer.domElement.dataset.particles=String(stats.particles);renderer.domElement.dataset.arrows=String(stats.arrows);renderer.domElement.dataset.time=animationTime.toFixed(4);renderer.domElement.dataset.playing=String(playing);
 }
 rebuild();raf=requestAnimationFrame(animate);
 return {update(next){const previous=params;params={...next};const changed=Object.keys(params).filter(k=>params[k]!==previous[k]);if(changed.length===0)return;invalidated=true;if(changed.every(k=>k==='autoRotate')){controls.autoRotate=params.autoRotate;return;}
   if(previous.lesson==='flow'&&params.lesson==='flow'&&!changed.some(k=>['seed','frequency','flowType','flowSurface'].includes(k))){
    if(changed.some(k=>['vectors','vectorDensity','vectorLength','magnitudeColor'].includes(k)))buildArrows();
    if(changed.some(k=>['particles','particleCount','trailLength'].includes(k))){if(params.particles&&!sampleVelocity)sampleVelocity=createVectorSampler((x,y,z)=>fields.vector(x,y,z,params),flowCacheSettings(params.frequency));buildParticles();}
    if(changed.some(k=>['magnitudeColor','vectorDensity'].includes(k)))stepParticles(0);
    onStats({...stats});return;
   }
   if(previous.lesson===params.lesson&&params.lesson!=='flow'&&!changed.some(k=>['seed','shape','quality'].includes(k))){
    animated.group.children[0].material.uniforms.uContours.value=params.contours?1:0;animated.group.children[0].material.wireframe=params.wireframe;animated.group.children[0].material.uniforms.uWood.value=params.lesson==='warp'&&params.warpStyle==='wood'?1:0;animated.update(animationTime,params);return;
   }
   if(previous.lesson!==params.lesson){animationTime=0;onTime(0);arrowUpdateAccumulator=0;}
   rebuild();if(previous.lesson!==params.lesson||changed.includes('flowSurface')||changed.includes('shape'))resetCamera();},setPlaying(value){
   if(value&&animationTime===DURATION){animationTime=0;if(params.lesson==='flow')buildParticles();onTime(0);}
   playing=value;last=0;accumulator=0;animationDrawAccumulator=0;arrowUpdateAccumulator=0;if(!value)flushFrame();
  },seekTime(value){animationTime=clampTime(value);accumulator=0;animationDrawAccumulator=0;arrowUpdateAccumulator=0;if(params.lesson==='flow')buildParticles();flushFrame();},resetParticles(){if(params.lesson==='flow'){buildParticles();accumulator=0;invalidated=true;}},resetCamera,zoom(direction){invalidated=true;camera.position.sub(controls.target).multiplyScalar(direction>0?.84:1.18).add(controls.target);controls.update(0);},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('keydown',onKey);renderer.domElement.removeEventListener('webglcontextlost',onLost);disposeGroup(content);floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
