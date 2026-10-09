/** Independent seeded gradient-noise implementation. No libnoise source is used. */
export function seededRandom(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + t * (b - a);
const gradients = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
export function createNoise(seed = 42) {
  const random = seededRandom(seed);
  const values = Array.from({length:256}, (_, i) => i);
  for(let i=255;i>0;i--){ const j=Math.floor(random()*(i+1)); [values[i],values[j]]=[values[j],values[i]]; }
  const p = Uint16Array.from([...values, ...values]);
  const dot=(hash,x,y,z)=>{const g=gradients[hash%12];return (g[0]*x+g[1]*y+g[2]*z) / Math.SQRT2;};
  return (x,y,z) => {
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
    x-=ix;y-=iy;z-=iz;
    const X=ix&255,Y=iy&255,Z=iz&255,u=fade(x),v=fade(y),w=fade(z);
    const hash=(dx,dy,dz)=>p[p[p[X+dx]+Y+dy]+Z+dz];
    return mix(mix(mix(dot(hash(0,0,0),x,y,z),dot(hash(1,0,0),x-1,y,z),u),mix(dot(hash(0,1,0),x,y-1,z),dot(hash(1,1,0),x-1,y-1,z),u),v),mix(mix(dot(hash(0,0,1),x,y,z-1),dot(hash(1,0,1),x-1,y,z-1),u),mix(dot(hash(0,1,1),x,y-1,z-1),dot(hash(1,1,1),x-1,y-1,z-1),u),v),w);
  };
}
export function fbm(noise,x,y,z,{octaves=5,frequency=1,lacunarity=2,gain=.5}={}){
  let total=0,weight=1,weightSum=0,scale=frequency;
  for(let i=0;i<octaves;i++){total+=weight*noise(x*scale,y*scale,z*scale);weightSum+=weight;scale*=lacunarity;weight*=gain;}
  return weightSum>0 ? total/weightSum : 0;
}
export function gradient(field,x,y,z,h=.005){return [(field(x+h,y,z)-field(x-h,y,z))/(2*h),(field(x,y+h,z)-field(x,y-h,z))/(2*h),(field(x,y,z+h)-field(x,y,z-h))/(2*h)];}
export function curl(potential,x,y,z,h=.008){
  const yp=potential(x,y+h,z),ym=potential(x,y-h,z),zp=potential(x,y,z+h),zm=potential(x,y,z-h),xp=potential(x+h,y,z),xm=potential(x-h,y,z);
  return [(yp[2]-ym[2]-zp[1]+zm[1])/(2*h),(zp[0]-zm[0]-xp[2]+xm[2])/(2*h),(xp[1]-xm[1]-yp[0]+ym[0])/(2*h)];
}
export function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
export function createFields(seed){
 const noise=createNoise(seed),n2=createNoise(seed+1013),n3=createNoise(seed+2029);
 function scalar(x,y,z,p){
  const f=p.frequency;
  if(p.lesson==='octaves') return fbm(noise,x,y,z,p);
  if(p.lesson==='warp'){
    const w=p.warpStrength;
    const qx=x+w*noise(x*.65+17,y*.65,z*.65),qy=y+w*n2(x*.65,y*.65+31,z*.65),qz=z+w*n3(x*.65,y*.65,z*.65+9);
    if(p.warpStyle==='wood') return Math.sin((Math.hypot(qx,qz)*f + .25*noise(qx*f,qy*f,qz*f))*Math.PI*4)*.65;
    return fbm(noise,qx,qy,qz,{...p,octaves:4,lacunarity:2,gain:.5});
  }
  const n=noise(x*f,y*f,z*f)*1.55;
  if(p.algorithm==='billow')return Math.abs(n)*2-.7;
  if(p.algorithm==='ridged')return .7-Math.abs(n)*2;
  return n;
 }
 function vector(x,y,z,p){
  const f=p.frequency;
  const a=(x,y,z)=>noise(x*f+2.1,y*f+8.3,z*f+4.7);
  const b=(x,y,z)=>n2(x*f+5.1,y*f+1.3,z*f+9.7);
  const c=(x,y,z)=>n3(x*f+7.1,y*f+3.3,z*f+1.7);
  if(p.flowType==='gradient') return gradient(a,x,y,z);
  if(p.flowType==='cross') return cross(gradient(a,x,y,z),gradient(b,x,y,z));
  return curl((x,y,z)=>[a(x,y,z),b(x,y,z),c(x,y,z)],x,y,z);
 }
 return {noise,scalar,vector};
}
export const magnitude = v => Math.hypot(...v);
export function rk2(position,dt,velocity,time){const v=time===undefined?velocity(...position):velocity(...position,time),mid=position.map((p,i)=>p+v[i]*dt*.5),w=time===undefined?velocity(...mid):velocity(...mid,time+dt*.5);return position.map((p,i)=>p+w[i]*dt);}
/** Cached samples for smooth, affordable particle advection. Interpolation is approximate. */
export function createVectorSampler(field,{resolution=25,extent=3.3}={}){
 const data=new Float32Array(resolution**3*3),scale=(resolution-1)/(2*extent);
 const index=(x,y,z)=>((x*resolution+y)*resolution+z)*3;
 for(let x=0;x<resolution;x++)for(let y=0;y<resolution;y++)for(let z=0;z<resolution;z++)data.set(field(x/scale-extent,y/scale-extent,z/scale-extent),index(x,y,z));
 return (x,y,z)=>{
  const coords=[x,y,z].map(v=>Math.max(0,Math.min(resolution-1.000001,(v+extent)*scale))),base=coords.map(Math.floor),frac=coords.map((v,i)=>v-base[i]),out=[0,0,0];
  for(let dx=0;dx<=1;dx++)for(let dy=0;dy<=1;dy++)for(let dz=0;dz<=1;dz++){
   const weight=(dx?frac[0]:1-frac[0])*(dy?frac[1]:1-frac[1])*(dz?frac[2]:1-frac[2]),i=index(base[0]+dx,base[1]+dy,base[2]+dz);
   for(let c=0;c<3;c++)out[c]+=data[i+c]*weight;
  }
  return out;
 };
}
