import test from 'node:test';
import assert from 'node:assert/strict';
import {createFields,createVectorSampler,rk2} from '../src/lib/noise.js';
import {animatedScalar,animatedVector,animationOffset,shiftedPoint,flowCacheSettings,FLOW_CACHE,DURATION} from '../src/lib/animation.js';
import {defaults,lessons} from '../src/lib/lessons.js';
import {surfaceStep,sampleSurface,surfaceError,tangentVector,surfaceNormal,dot} from '../src/lib/surface.js';
import {seededRandom} from '../src/lib/noise.js';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('navigation has exactly the four original modules',()=>assert.deepEqual(lessons.map(x=>x.id),['noise','octaves','warp','flow']));
for(const lesson of ['noise','octaves','warp']){
 test(`${lesson}: animation at zero is its own original algorithm`,()=>{const f=createFields(42),p={...defaults,lesson};for(let i=0;i<10;i++){const point=[i*.13,.371,-i*.27];assert.equal(animatedScalar(f,point,0,p),f.scalar(...point,p));}});
 test(`${lesson}: its field changes continuously with time`,()=>{const f=createFields(42),p={...defaults,lesson},point=[.33,.371,.71];assert.notEqual(animatedScalar(f,point,0,p),animatedScalar(f,point,12,p));assert.ok(Math.abs(animatedScalar(f,point,5,p)-animatedScalar(f,point,5.00001,p))<.0001);});
}
test('Noise animation retains billow and ridged transforms',()=>{const f=createFields(42),p=[.2,.3,.8],base={...defaults,lesson:'noise'},t=7;const gradient=animatedScalar(f,p,t,{...base,algorithm:'gradient'});near(animatedScalar(f,p,t,{...base,algorithm:'billow'}),Math.abs(gradient)*2-.7);near(animatedScalar(f,p,t,{...base,algorithm:'ridged'}),.7-Math.abs(gradient)*2);});
test('Octaves animation responds to actual layer composition',()=>{const f=createFields(42),point=[.28,.371,.86],p={...defaults,lesson:'octaves'},base=animatedScalar(f,point,9,p);for(const change of [{octaves:1},{gain:.75},{lacunarity:2.7}])assert.notEqual(animatedScalar(f,point,9,{...p,...change}),base);});
test('Warp animation keeps domain strength and wood pattern',()=>{const f=createFields(42),point=[.6,.371,-.9],p={...defaults,lesson:'warp'},t=11;assert.notEqual(animatedScalar(f,point,t,{...p,warpStrength:0}),animatedScalar(f,point,t,p));const wood={...p,warpStyle:'wood'};assert.equal(animatedScalar(f,point,0,wood),f.scalar(...point,wood));assert.notEqual(animatedScalar(f,point,0,wood),animatedScalar(f,point,t,wood));});
test('bounded shift fits every visible sample inside the padded cache',()=>{for(let t=0;t<=DURATION;t+=.05){const shift=animationOffset(t);for(const x of [-3.2,3.2])for(const y of [-3.2,3.2])for(const z of [-3.2,3.2]){const q=shiftedPoint([x,y,z],t);assert.ok(q.every(v=>Math.abs(v)<FLOW_CACHE.extent-.1));}assert.ok(Math.abs(shift[0])<=.9+1e-12&&shift[1]>=0&&shift[1]<=1.3+1e-12&&Math.abs(shift[2])<=.75+1e-12);}assert.deepEqual(animationOffset(0),animationOffset(DURATION));});
test('Flow sampling evolves the vector field itself',()=>{const f=createFields(42),params={...defaults,lesson:'flow',frequency:.65},sample=createVectorSampler((...p)=>f.vector(...p,params),flowCacheSettings(.65)),p=[.3,.7,-.4];assert.notDeepEqual(animatedVector(sample,p,0),animatedVector(sample,p,12));const a=animatedVector(sample,p,2),b=animatedVector(sample,p,2.00001);a.forEach((v,i)=>near(v,b[i],1e-4));});
test('higher Flow frequency selects a bounded higher-resolution cache',()=>{assert.equal(flowCacheSettings(.65).resolution,33);assert.equal(flowCacheSettings(1.6).resolution,41);assert.equal(flowCacheSettings(1.6).extent,FLOW_CACHE.extent);});
test('temporal RK2 evaluates the midpoint time',()=>{const p=rk2([0,0,0],.2,(_x,_y,_z,t)=>[t,0,0],1);near(p[0],.22);});
for(const shape of ['sphere','torus']){
 test(`${shape}: time-varying flow stays tangent and constrained`,()=>{const f=createFields(3),params={...defaults,flowType:'curl',frequency:.65},field=(x,y,z,t)=>f.vector(...shiftedPoint([x,y,z],t),params);let p=sampleSurface(seededRandom(9),shape);for(let i=0;i<4000;i++){const t=i/120,v=tangentVector(field(...p,t),p,shape);near(dot(v,surfaceNormal(p,shape)),0);p=surfaceStep(p,1/120,field,shape,t);near(surfaceError(p,shape),0);}});
 test(`${shape}: temporal surface RK2 converges at second order`,()=>{const p=sampleSurface(seededRandom(7),shape),angle=.4+.2*(1-Math.cos(1)),exact=[p[0]*Math.cos(angle)+p[2]*Math.sin(angle),p[1],-p[0]*Math.sin(angle)+p[2]*Math.cos(angle)];const field=(x,_y,z,t)=>{const omega=.4+.2*Math.sin(t);return [omega*z,0,-omega*x];};function error(n){let q=[...p];for(let i=0;i<n;i++)q=surfaceStep(q,1/n,field,shape,i/n);return Math.hypot(...q.map((v,i)=>v-exact[i]));}assert.ok(error(60)/error(120)>3.5);});
}

// Geometry updates run without a renderer to verify the same buffers used by the browser.
import * as THREE from 'three';
import {createAnimatedSurface} from '../src/lib/animated-surface.js';
for(const shape of ['terrain','sphere','torus']){
 test(`${shape}: animated geometry reuses buffers and matches its module field`,()=>{
  const previousWindow=globalThis.window;globalThis.window={matchMedia:()=>({matches:false})};
  const params={...defaults,lesson:'warp',warpStyle:'wood',shape},fields=createFields(params.seed),material=new THREE.MeshBasicMaterial(),surface=createAnimatedSurface(params,fields,material);
  try{
   const geometry=surface.group.children[0].geometry,position=geometry.attributes.position,array=position.array,values=geometry.attributes.fieldValue.array,initial=array.slice();
   surface.update(13,params);assert.equal(position.array,array);assert.notDeepEqual(array,initial);assert.ok([...array,...values].every(Number.isFinite));
   surface.update(0,params);assert.deepEqual(array,initial);
   surface.update(13,params);const changed=array.slice();surface.update(0,params);surface.update(13,params);assert.deepEqual(array,changed);
   surface.update(13,{...params,warpStrength:0});assert.notDeepEqual(array,changed);
  }finally{surface.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
 });
}
