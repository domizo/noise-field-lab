/** Cartesian constraints avoid latitude poles and periodic parameter seams. */
export const SURFACE = Object.freeze({sphereRadius:2.45,majorRadius:2,minorRadius:.75});
const EPS=1e-10;
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const length=v=>Math.hypot(...v);
export function normalize(v,fallback=[1,0,0]){const m=length(v);return m>EPS&&Number.isFinite(m)?v.map(x=>x/m):[...fallback];}
export function projectSurface(p,shape,previous=[SURFACE.majorRadius+SURFACE.minorRadius,0,0]){
 if(shape==='sphere')return normalize(p,normalize(previous)).map(x=>x*SURFACE.sphereRadius);
 if(shape!=='torus')return [...p];
 const rho=Math.hypot(p[0],p[2]),oldRho=Math.hypot(previous[0],previous[2]);
 const ring=rho>EPS?[p[0]/rho,p[2]/rho]:oldRho>EPS?[previous[0]/oldRho,previous[2]/oldRho]:[1,0];
 const center=[ring[0]*SURFACE.majorRadius,0,ring[1]*SURFACE.majorRadius];
 const tube=normalize([p[0]-center[0],p[1],p[2]-center[2]],[ring[0],0,ring[1]]);
 return center.map((x,i)=>x+tube[i]*SURFACE.minorRadius);
}
export function surfaceNormal(p,shape){
 if(shape==='sphere')return normalize(p);
 const rho=Math.hypot(p[0],p[2]);const ring=rho>EPS?[p[0]/rho,p[2]/rho]:[1,0];
 return normalize([p[0]-ring[0]*SURFACE.majorRadius,p[1],p[2]-ring[1]*SURFACE.majorRadius],[ring[0],0,ring[1]]);
}
export function tangentVector(v,p,shape){if(shape==='volume')return [...v];const n=surfaceNormal(p,shape),normalSpeed=dot(v,n);return v.map((x,i)=>x-normalSpeed*n[i]);}
export function surfaceError(p,shape){if(shape==='sphere')return Math.abs(length(p)-SURFACE.sphereRadius);if(shape==='torus')return Math.abs(Math.hypot(Math.hypot(p[0],p[2])-SURFACE.majorRadius,p[1])-SURFACE.minorRadius);return 0;}
export function surfaceStep(p,dt,field,shape,time){
 if(dt===0)return projectSurface(p,shape,p);
 const initial=projectSurface(p,shape,p),v=tangentVector(time===undefined?field(...initial):field(...initial,time),initial,shape);
 const midpoint=projectSurface(initial.map((x,i)=>x+v[i]*dt*.5),shape,initial);
 const w=tangentVector(time===undefined?field(...midpoint):field(...midpoint,time+dt*.5),midpoint,shape);
 return projectSurface(initial.map((x,i)=>x+w[i]*dt),shape,initial);
}
export function sampleSurface(random,shape){
 if(shape==='sphere'){const y=2*random()-1,angle=2*Math.PI*random(),r=Math.sqrt(Math.max(0,1-y*y));return [r*Math.cos(angle),y,r*Math.sin(angle)].map(x=>x*SURFACE.sphereRadius);}
 // Rejection sampling weights torus tube angle by its surface-area Jacobian.
 let v;do{v=2*Math.PI*random();}while(random()>(SURFACE.majorRadius+SURFACE.minorRadius*Math.cos(v))/(SURFACE.majorRadius+SURFACE.minorRadius));
 const u=2*Math.PI*random(),rho=SURFACE.majorRadius+SURFACE.minorRadius*Math.cos(v);
 return [rho*Math.cos(u),SURFACE.minorRadius*Math.sin(v),rho*Math.sin(u)];
}
export function surfaceSamples(shape,density){
 const result=[];
 if(shape==='sphere'){const count=density*density*4,golden=Math.PI*(3-Math.sqrt(5));for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*golden;result.push([r*Math.cos(a),y,r*Math.sin(a)].map(x=>x*SURFACE.sphereRadius));}}
 else{const uCount=density*4,vCount=density*2;for(let i=0;i<uCount;i++)for(let j=0;j<vCount;j++){const u=2*Math.PI*i/uCount,v=2*Math.PI*(j+.5)/vCount,rho=SURFACE.majorRadius+SURFACE.minorRadius*Math.cos(v);result.push([rho*Math.cos(u),SURFACE.minorRadius*Math.sin(v),rho*Math.sin(u)]);}}
 return result;
}
export function liftForDisplay(p,shape,offset=.018){const n=surfaceNormal(p,shape);return p.map((x,i)=>x+n[i]*offset);}
