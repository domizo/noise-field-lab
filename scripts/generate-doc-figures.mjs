#!/usr/bin/env node
/**
 * Deterministic educational figures for Noise Field Lab.
 * Copy to scripts/generate-doc-figures.mjs, then run:
 *   node scripts/generate-doc-figures.mjs [--out public/docs/images]
 * Outside the app checkout:
 *   NOISE_LAB_SOURCE=/absolute/path/to/noise-lab node generate-doc-figures.mjs --out ./images
 * No dependencies, browser, network, or synthetic replacement noise are used.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const sourceFile = name => process.env.NOISE_LAB_SOURCE
  ? pathToFileURL(path.resolve(process.env.NOISE_LAB_SOURCE, 'src/lib', name))
  : new URL(`../src/lib/${name}`, import.meta.url);
const { createFields, createNoise, fbm } = await import(sourceFile('noise.js'));
const { animationOffset, animatedScalar, DURATION } = await import(sourceFile('animation.js'));
const { defaults } = await import(sourceFile('lessons.js'));
const outFlag = process.argv.indexOf('--out');
if (outFlag >= 0 && !process.argv[outFlag + 1]) throw new Error('--out requires a directory');
const output = outFlag >= 0 ? path.resolve(process.argv[outFlag + 1]) : fileURLToPath(new URL('../public/docs/images/', import.meta.url));
await fs.mkdir(output, { recursive: true });
const hashes = {};
for (const name of ['noise.js', 'animation.js', 'lessons.js']) hashes[name] = createHash('sha256').update(await fs.readFile(sourceFile(name))).digest('hex');

const W = 1100;
const C = { bg:'#09151e', panel:'#0d202b', line:'#294653', muted:'#a5bac6', text:'#e9f3f5', mint:'#85efd1', aqua:'#62c5e7', amber:'#efbc73', violet:'#bca8ee' };
const seed = 42;
const fields = createFields(seed);
const base = { ...defaults, seed, lesson:'noise', algorithm:'gradient', frequency:1.2, amplitude:1 };
const manifest = { generator:'generate-doc-figures.mjs', version:1, deterministic:true, sourceHashes:hashes, figures:[] };
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt = (v,d=2) => { const s = Number(v.toFixed(d)); return Object.is(s,-0) ? '0' : String(s); };
const num = n => Number(n.toFixed(3));
const tag = (x,y,t,size=18,fill=C.text,extra='') => `<text x="${num(x)}" y="${num(y)}" font-size="${size}" fill="${fill}" ${extra}>${esc(t)}</text>`;
const line = (x1,y1,x2,y2,stroke=C.line,width=1,extra='') => `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const rect = (x,y,w,h,fill,extra='') => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${fill}" ${extra}/>`;
const rgb = h => h.slice(1).match(/../g).map(x=>parseInt(x,16));
const blend = (a,b,t) => '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
function diverging(v,lo,hi){const t=Math.max(0,Math.min(1,(v-lo)/(hi-lo)));return t<.5?blend(C.amber,'#122b37',t*2):blend('#122b37',C.mint,(t-.5)*2);}
function sequential(v,hi){return blend('#397c91',C.mint,Math.max(0,Math.min(1,v/hi)));}
function defs(){return `<defs><linearGradient id="valueScale"><stop offset="0" stop-color="${C.amber}"/><stop offset=".5" stop-color="#122b37"/><stop offset="1" stop-color="${C.mint}"/></linearGradient><linearGradient id="magnitudeScale"><stop offset="0" stop-color="#397c91"/><stop offset="1" stop-color="${C.mint}"/></linearGradient></defs>`;}
function shell(height,title,subtitle,description,body,meta){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="figure-title figure-description"><title id="figure-title">${esc(title)}</title><desc id="figure-description">${esc(description)}</desc><metadata>${esc(JSON.stringify({ ...meta, sourceHashes:hashes }))}</metadata>${defs()}<g font-family="Arial, Helvetica, sans-serif">${rect(0,0,W,height,C.bg)}${tag(36,44,title,27,C.text,'font-weight="700"')}${tag(36,74,subtitle,17,C.muted)}${body}</g></svg>\n`;
}
function mapAxes(x,y,size,extent){
 let s=rect(x,y,size,size,'none',`stroke="${C.line}"`);
 for(const v of [-extent,0,extent]){const t=(v+extent)/(2*extent);const px=x+t*size,py=y+(1-t)*size;s+=line(px,y+size,px,y+size+5);s+=tag(px,y+size+25,fmt(v),14,C.muted,'text-anchor="middle"');s+=line(x-5,py,x,py);s+=tag(x-10,py+5,fmt(v),14,C.muted,'text-anchor="end"');}
 s+=tag(x+size/2,y+size+46,'x',15,C.muted,'text-anchor="middle"');s+=tag(x-29,y+size/2,'z',15,C.muted,'text-anchor="middle"');return s;
}
function sampleMap(fn,extent=2.5,n=64){
 const values=[];let min=Infinity,max=-Infinity;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=-extent+(i+.5)*2*extent/n,z=extent-(j+.5)*2*extent/n,v=fn(x,z);
  values.push(v);min=Math.min(min,v);max=Math.max(max,v);
 }
 return {values,min,max,extent,resolution:n};
}
function heatmap(x,y,size,data,range=[-1,1]){
 const n=data.resolution,cell=size/n;
 let s='<g shape-rendering="crispEdges">';
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)s+=rect(x+i*cell,y+j*cell,cell+.02,cell+.02,diverging(data.values[j*n+i],...range));
 return s+'</g>'+mapAxes(x,y,size,data.extent);
}
function colorbar(x,y,w,lo,hi,label,mag=false){
 return tag(x,y-12,label,16,C.muted)+rect(x,y,w,11,`url(#${mag?'magnitudeScale':'valueScale'})`,'rx="3"')+tag(x,y+32,fmt(lo),14,C.muted)+tag(x+w/2,y+32,fmt((lo+hi)/2),14,C.muted,'text-anchor="middle"')+tag(x+w,y+32,fmt(hi),14,C.muted,'text-anchor="end"');
}
function graph(x,y,w,h,{xmin=-3,xmax=3,ymin=-1,ymax=1,xticks=[-3,0,3],yticks=[-1,0,1],labels=true}={}){
 const X=v=>x+(v-xmin)/(xmax-xmin)*w,Y=v=>y+h-(v-ymin)/(ymax-ymin)*h;
 let s=rect(x,y,w,h,C.panel,'rx="4"');
 for(const v of yticks){s+=line(x,Y(v),x+w,Y(v),v===0?'#426271':C.line,v===0?1.4:1);if(labels)s+=tag(x-10,Y(v)+5,fmt(v),14,C.muted,'text-anchor="end"');}
 for(const v of xticks){s+=line(X(v),y,X(v),y+h,C.line,1,'stroke-dasharray="3 6"');s+=tag(X(v),y+h+24,fmt(v),14,C.muted,'text-anchor="middle"');}
 s+=tag(x+w/2,y+h+44,'x',15,C.muted,'text-anchor="middle"');
 return {s,X,Y};
}
function curve(fn,g,color,width=2.5,dash='',samples=721){let d='';let min=Infinity,max=-Infinity;for(let i=0;i<samples;i++){const x=-3+6*i/(samples-1),v=fn(x);min=Math.min(min,v);max=Math.max(max,v);d+=`${i?'L':'M'}${num(g.X(x))},${num(g.Y(v))}`;}return {s:`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`,min,max};}
function key(x,y,color,label,dash=''){return line(x,y-5,x+25,y-5,color,2.8,dash?`stroke-dasharray="${dash}"`:'')+tag(x+35,y,label,16,C.muted);}
async function save(name,height,title,subtitle,description,body,meta){const entry={file:name,title,caption:description,...meta};manifest.figures.push(entry);await fs.writeFile(path.join(output,name),shell(height,title,subtitle,description,body,entry));}

// 1. Base noise transforms. Shared seed, slice, frequency, spatial and color scales.
{
 const plots=[['gradient','Gradient','n = 1.55 × base noise'],['billow','Billow','2 |n| − 0.7'],['ridged','Ridged','0.7 − 2 |n|']];
 let body='';const stats={};
 plots.forEach(([algorithm,label,formula],k)=>{const x=66+k*356;const data=sampleMap((x,z)=>fields.scalar(x,.37,z,{...base,algorithm}));stats[algorithm]={min:data.min,max:data.max};body+=tag(x,112,label,21,C.text,'font-weight="700"')+tag(x,138,formula,16,C.muted)+heatmap(x,159,274,data)+tag(x,510,`Sample range: ${fmt(data.min)} to ${fmt(data.max)}`,15,C.muted);});
 body+=colorbar(66,559,270,-1,1,'Shared scalar color scale');body+=tag(389,550,'Seed 42 · frequency 1.2 · y = 0.37 · t = 0',17,C.muted);body+=tag(389,578,'Billow and Ridged are exact negatives of one another here',16,C.muted);
 await save('noise-algorithms.svg',617,'One field, three value transforms','Identical coordinates reveal what the algorithm changes.', 'Three xz heatmaps show the app’s Gradient, Billow, and Ridged scalar outputs for seed 42, frequency 1.2, y = 0.37, and time 0. All maps cover x,z in [−2.5,2.5] and use the same [−1,1] color scale. Each color cell is one center sample; none exceeds the displayed scale. Billow equals 2|1.55 noise|−0.7 and Ridged is its exact negative.',body,{seed,frequency:1.2,slice:{y:.37},time:0,domain:{x:[-2.5,2.5],z:[-2.5,2.5]},sampling:{resolution:64,location:'cell centers'},colorRange:[-1,1],stats,formula:'n=1.55*noise(f*x,f*y,f*z); gradient=n; billow=2*abs(n)-0.7; ridged=0.7-2*abs(n)'});
}

// 2. Controlled frequency and amplitude curves; y=z=0 makes frequency scaling a pure x rescaling.
{
 let body='';const stats={};
 body+=tag(77,119,'Frequency changes feature size',21,C.text,'font-weight="700"');body+=tag(613,119,'Amplitude rescales the same values',21,C.text,'font-weight="700"');
 body+=key(77,150,C.mint,'f = 0.65')+key(259,150,C.amber,'f = 1.6','7 5');body+=key(613,150,C.aqua,'A = 0.5')+key(797,150,C.violet,'A = 1.5','7 5');
 const g1=graph(77,177,425,241,{ymin:-.6,ymax:.6,yticks:[-.6,0,.6]});const g2=graph(613,177,425,241,{ymin:-.6,ymax:.6,yticks:[-.6,0,.6]});body+=g1.s+g2.s;
 for(const [f,color,dash] of [[.65,C.mint,''],[1.6,C.amber,'7 5']]){const c=curve(x=>fields.scalar(x,0,0,{...base,frequency:f}),g1,color,2.7,dash);body+=c.s;stats[`frequency_${f}`]={min:c.min,max:c.max};}
 for(const [a,color,dash] of [[.5,C.aqua,''],[1.5,C.violet,'7 5']]){const c=curve(x=>a*fields.scalar(x,0,0,{...base,frequency:.9}),g2,color,2.7,dash);body+=c.s;stats[`amplitude_${a}`]={min:c.min,max:c.max};}
 body+=tag(77,490,'A = 1 held fixed',17,C.muted)+tag(613,490,'f = 0.9 held fixed',17,C.muted);body+=tag(36,538,'Scaled value = A × 1.55 × noise(f x, 0, 0) · Seed 42 · Same x and output scales',17,C.muted);body+=tag(36,568,'Amplitude acts after sampling; the zero crossings stay in exactly the same places',17,C.muted);body+=tag(36,596,'Shape-specific render factors are omitted; terrain adds another ×1.65',17,C.muted);
 await save('frequency-amplitude.svg',628,'Two controls, two different effects','A one-dimensional slice separates coordinate scaling from output scaling.', 'Two controlled line plots use seed 42 and the x-axis slice y=z=0. Left: frequency 0.65 versus 1.6 at amplitude 1. Right: amplitude 0.5 versus 1.5 at frequency 0.9. Both cover x in [−3,3] and scaled value in [−0.6,0.6]. Scaled value is amplitude times the app’s Gradient scalar value; amplitude is applied outside createFields.scalar. Shape-specific geometric rendering factors are omitted; terrain applies an additional factor of 1.65.',body,{seed,slice:{y:0,z:0},time:0,domain:{x:[-3,3]},scaledValueRange:[-.6,.6],frequencyPanel:{frequencies:[.65,1.6],amplitude:1},amplitudePanel:{frequency:.9,amplitudes:[.5,1.5]},samplesPerCurve:721,stats,formula:'scaledValue=A*1.55*noise(f*x,0,0)',caveat:'Controlled output-scaling diagram. Shape-specific geometric rendering factors are omitted; terrain uses an additional factor of 1.65.'});
}

// 3. Individual normalized octave contributions and their verified sum.
{
 const noise=createNoise(seed),n=4,f=.7,l=2,g=.5,S=Array.from({length:n},(_,i)=>g**i).reduce((a,b)=>a+b,0),colors=[C.mint,C.aqua,C.amber,C.violet];let body='';const stats={};
 for(let i=0;i<n;i++){const x=69+i*264;body+=tag(x,116,`Octave ${i+1}`,19,colors[i],'font-weight="700"')+tag(x,142,`f = ${fmt(f*l**i)} · weight = ${fmt(g**i,3)}`,15,C.muted);const gr=graph(x,162,218,128,{ymin:-.4,ymax:.4,yticks:[-.4,0,.4]});body+=gr.s;const c=curve(x=>(g**i)*noise(x*f*l**i,.37*f*l**i,.81*f*l**i)/S,gr,colors[i],2.2);body+=c.s;stats[`octave_${i+1}`]={min:c.min,max:c.max};}
 body+=tag(36,359,'Each layer is already divided by the same weight sum: 1 + 0.5 + 0.25 + 0.125 = 1.875',17,C.muted);body+=tag(77,402,'The four curves add to this normalized fBm',21,C.text,'font-weight="700"');const gr=graph(77,423,958,135,{ymin:-.4,ymax:.4,yticks:[-.4,0,.4]});body+=gr.s;const sum=x=>fbm(noise,x,.37,.81,{octaves:n,frequency:f,lacunarity:l,gain:g});const c=curve(sum,gr,C.mint,2.8);body+=c.s;stats.sum={min:c.min,max:c.max};
 let maxSumError=0;for(let j=0;j<721;j++){const x=-3+6*j/720,parts=Array.from({length:n},(_,i)=>g**i*noise(x*f*l**i,.37*f*l**i,.81*f*l**i)/S).reduce((a,b)=>a+b,0);maxSumError=Math.max(maxSumError,Math.abs(parts-sum(x)));}if(maxSumError>1e-12)throw new Error('Octave decomposition no longer matches fbm');
 body+=tag(36,638,'Seed 42 · y = 0.37, z = 0.81 · Lacunarity 2 · Gain 0.5 · Amplitude 1 · Shared vertical scale',17,C.muted);
 await save('octave-composition.svg',670,'Build detail from weighted layers','Four contributions and their sum, sampled directly from the app’s fBm implementation.', 'The four upper plots show gain^i times base noise at frequency times lacunarity^i, divided by the common weight sum 1.875, for i=0,1,2,3. The lower plot is the app’s four-octave fbm result, verified to equal the sum within floating-point precision. Seed 42, frequency 0.7, lacunarity 2, gain 0.5, y=0.37, z=0.81, amplitude 1. Every plot uses x in [−3,3] and output in [−0.4,0.4]. The fBm branch uses raw base noise, without the Gradient lesson’s factor 1.55.',body,{seed,octaves:n,frequency:f,lacunarity:l,gain:g,weightSum:S,slice:{y:.37,z:.81},amplitude:1,domain:{x:[-3,3]},verticalRange:[-.4,.4],samplesPerCurve:721,maxSumError,stats,formula:'contribution_i=gain^i*noise(p*frequency*lacunarity^i)/sum(gain^j), i,j=0..3; fBm=sum(contribution_i)'});
}

// 4. Zero and nonzero coordinate warp, including the stylized radial Wood branch.
{
 let body='';const stats={};const panels=[['terrain',0,'Terrain','Warp strength 0'],['terrain',1.6,'Terrain','Warp strength 1.6'],['wood',0,'Wood','Warp strength 0'],['wood',1.6,'Wood','Warp strength 1.6']];
 panels.forEach(([warpStyle,warpStrength,title,subtitle],k)=>{const x=57+k*263;const data=sampleMap((x,z)=>fields.scalar(x,.37,z,{...base,lesson:'warp',frequency:.8,warpStyle,warpStrength}),2.5,64);stats[`${warpStyle}_${warpStrength}`]={min:data.min,max:data.max};body+=tag(x,115,title,21,C.text,'font-weight="700"')+tag(x,142,subtitle,16,C.muted)+heatmap(x,164,214,data,[-.65,.65]);});
 body+=colorbar(57,472,260,-.65,.65,'Shared scalar color scale');body+=tag(365,459,'Seed 42 · frequency 0.8 · y = 0.37 · t = 0',17,C.muted);body+=tag(365,486,'q = p + strength × U(p)',20,C.text);body+=tag(36,544,'Terrain samples four-octave fBm at q. Wood samples a sine of radial distance at q.',17,C.muted);body+=tag(36,573,'Wood still includes a small noise phase term when warp strength is zero',17,C.amber);
 await save('domain-warping.svg',606,'Bend the sampling coordinates','Each pair changes only warp strength; the output pattern stays the same.', 'Four xz heatmaps compare warp strengths 0 and 1.6 for Terrain and Wood at seed 42, frequency 0.8, y=0.37, time 0. Maps cover x,z in [−2.5,2.5] with a shared [−0.65,0.65] color scale. Terrain samples normalized four-octave fBm with lacunarity 2 and gain 0.5 after the coordinate warp. Wood is 0.65 sin(4π(f hypot(qx,qz)+0.25 noise(f q))). Wood has a noise phase perturbation even at zero warp strength; it is not a pure unperturbed ring field.',body,{seed,frequency:.8,slice:{y:.37},time:0,domain:{x:[-2.5,2.5],z:[-2.5,2.5]},warpStrengths:[0,1.6],sampling:{resolution:64,location:'cell centers'},colorRange:[-.65,.65],terrain:{octaves:4,lacunarity:2,gain:.5},stats,formula:{warp:'qx=x+w*noise_42(.65*x+17,.65*y,.65*z); qy=y+w*noise_1055(.65*x,.65*y+31,.65*z); qz=z+w*noise_2071(.65*x,.65*y,.65*z+9)',terrain:'fbm(noise_42,q,{frequency:.8,octaves:4,lacunarity:2,gain:.5})',wood:'0.65*sin(4*pi*(frequency*hypot(qx,qz)+0.25*noise_42(frequency*q)))'}});
}

// 5. 3D vector constructions shown as a planar sample with a shared linear arrow scale.
{
 const extent=2,n=11,frequency=.65,types=['gradient','curl','cross'],labels=['Gradient','Curl','Gradient cross'],formulas=['grad a','curl [a, b, c]','grad a × grad b'];let maxMag=0,maxProjected=0;const samples={};
 for(const type of types){samples[type]=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-extent+2*extent*(i+.5)/n,z=extent-2*extent*(j+.5)/n;const v=fields.vector(x,.37,z,{...base,frequency,flowType:type});const m=Math.hypot(...v),p=Math.hypot(v[0],v[2]);maxMag=Math.max(maxMag,m);maxProjected=Math.max(maxProjected,p);samples[type].push({x,z,v,m});}}
 const colorMax=Math.ceil(maxMag*10)/10,size=274,scale=22/maxProjected;let body='';const stats={};
 function arrow(x,y,dx,dy,color,width=1.7){const m=Math.hypot(dx,dy);if(m<.12)return `<circle cx="${num(x)}" cy="${num(y)}" r="1" fill="${color}"/>`;const ux=dx/m,uy=dy/m,sx=x-dx/2,sy=y-dy/2,ex=x+dx/2,ey=y+dy/2,head=Math.min(4.5,m*.38);return line(sx,sy,ex,ey,color,width,'stroke-linecap="round"')+`<path d="M${num(ex-head*ux-head*.5*uy)},${num(ey-head*uy+head*.5*ux)} L${num(ex)},${num(ey)} L${num(ex-head*ux+head*.5*uy)},${num(ey-head*uy-head*.5*ux)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;}
 types.forEach((type,k)=>{const x=66+k*356,y=162;body+=tag(x,113,labels[k],21,C.text,'font-weight="700"')+tag(x,140,formulas[k],16,C.muted)+rect(x,y,size,size,C.panel);for(const q of [-1,0,1]){const v=(q+extent)/(2*extent)*size;body+=line(x+v,y,x+v,y+size,C.line,.7,'stroke-dasharray="2 5"')+line(x,y+v,x+size,y+v,C.line,.7,'stroke-dasharray="2 5"');}for(const s of samples[type]){const px=x+(s.x+extent)/(2*extent)*size,py=y+(extent-s.z)/(2*extent)*size;body+=arrow(px,py,s.v[0]*scale,-s.v[2]*scale,sequential(s.m,colorMax));}body+=mapAxes(x,y,size,extent);stats[type]={maximumMagnitude:Math.max(...samples[type].map(s=>s.m)),maximumProjectedMagnitude:Math.max(...samples[type].map(s=>Math.hypot(s.v[0],s.v[2])))};});
 body+=colorbar(66,533,270,0,colorMax,'Color: full 3D magnitude |v|',true);body+=arrow(436,533,scale,0,C.mint,2)+tag(470,539,'Arrow length: 1 field unit',16,C.muted);body+=tag(36,599,'Arrows show (vx, vz), with one shared linear scale. The y component is omitted.',17,C.muted);body+=tag(36,628,'This xz slice makes no claim of two-dimensional divergence freedom',17,C.amber);
 await save('vector-fields.svg',660,'Three ways to build a vector field','Seed 42 · frequency 0.65 · Samples on y = 0.37 · x,z in [−2, 2]', 'Three panels sample the app’s Gradient, Curl, and Gradient cross 3D vector fields on y=0.37 at seed 42 and frequency 0.65. Each panel contains an 11×11 center-sampled grid over x,z in [−2,2]. Arrow horizontal and vertical components are proportional to vx and vz using one shared linear scale, without normalizing or clipping individual vectors. Color shows the full 3D vector magnitude, including vy. These are projected components on a slice, not complete two-dimensional fields, and the figure makes no 2D divergence claim. Gradient uses centered differences h=0.005; curl uses h=0.008.',body,{seed,frequency,slice:{y:.37},time:0,domain:{x:[-2,2],z:[-2,2]},sampling:{resolution:n,location:'cell centers'},arrowComponents:['vx','vz'],arrowPixelsPerVectorUnit:scale,maximumArrowLength:22,individualVectorNormalization:false,colorQuantity:'sqrt(vx^2+vy^2+vz^2)',colorRange:[0,colorMax],gradientDifferenceStep:.005,curlDifferenceStep:.008,stats,potentials:{a:'noise_42(f*x+2.1,f*y+8.3,f*z+4.7)',b:'noise_1055(f*x+5.1,f*y+1.3,f*z+9.7)',c:'noise_2071(f*x+7.1,f*y+3.3,f*z+1.7)'},formula:{gradient:'grad(a)',curl:'curl([a,b,c])',cross:'cross(grad(a),grad(b))'},caveat:'The omitted y component and y derivatives matter. This projection does not establish 2D divergence freedom. No advection, cache interpolation, constant-speed transform, or surface projection is shown.'});
}

// 6. Time is a bounded 3D coordinate translation, not an extra noise dimension.
{
 let body='';const times=[0,15,30],stats={},offsets={};times.forEach((time,k)=>{const x=66+k*356,offset=animationOffset(time);offsets[time]=offset;const data=sampleMap((x,z)=>animatedScalar(fields,[x,.37,z],time,base));stats[time]={min:data.min,max:data.max};body+=tag(x,114,`t = ${time} s`,21,C.text,'font-weight="700"')+tag(x,140,`Offset (${offset.map(v=>fmt(v)).join(', ')})`,16,C.muted)+heatmap(x,162,274,data)+tag(x,512,`Sample range: ${fmt(data.min)} to ${fmt(data.max)}`,15,C.muted);});
 body+=colorbar(66,554,270,-1,1,'Shared scalar color scale');body+=tag(389,546,'Same seed 42 and frequency 1.2 throughout',17,C.muted)+tag(389,573,'At 60 s, the offset returns exactly to (0, 0, 0)',17,C.muted);body+=tag(36,622,'offset = (0.9 sin θ, 0.65 (1 − cos θ), 0.75 sin 2θ), where θ = 2π t / 60',18,C.text);body+=tag(36,652,'The slider is clamped to 0–60 seconds; this is motion through a fixed 3D field',17,C.muted);
 await save('bounded-time.svg',685,'Time moves the sampling window','One fixed spatial slice samples translated coordinates at three moments.', 'Three heatmaps sample the app’s animatedScalar at times 0,15,30 seconds, with seed 42, Gradient algorithm, frequency 1.2, original slice y=0.37, x,z in [−2.5,2.5], and shared color scale [−1,1]. Animation adds offset(t)=(0.9 sin θ,0.65(1−cos θ),0.75 sin 2θ), where θ=2πt/60, to the complete sampling point before scalar evaluation. Offsets at the shown times are (0,0,0), (0.9,0.65,0), and (0,1.3,0), up to floating-point roundoff. Time is clamped to [0,60]; the exact endpoint offset is zero. This is translated 3D noise, not four-dimensional noise. A finite timeline returning to the initial field is not evidence that advected particles return to their initial positions.',body,{seed,frequency:1.2,algorithm:'gradient',originalSlice:{y:.37},domain:{x:[-2.5,2.5],z:[-2.5,2.5]},sampling:{resolution:64,location:'cell centers'},times,offsets,duration:DURATION,colorRange:[-1,1],stats,formula:'animatedScalar(p,t)=scalar(p+offset(clamp(t,0,60))); offset(t)=[.9*sin(2*pi*t/60),.65*(1-cos(2*pi*t/60)),.75*sin(4*pi*t/60)]; exact offset=0 at t=0 and t=60',caveat:'No new seed, fourth noise coordinate, or automatic looping is shown. At t=15 and t=30 the z offsets happen to be zero.'});
}

await fs.writeFile(path.join(output,'figure-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${manifest.figures.length} deterministic SVG figures and figure-manifest.json in ${output}`);
