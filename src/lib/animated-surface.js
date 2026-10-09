import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {animationOffset} from './animation.js';
import {SURFACE,surfaceNormal} from './surface.js';
/** Reuses buffers while time changes. Geometry is rebuilt only for topology changes. */
export function createAnimatedSurface(params,fields,material){
 const mobile=window.matchMedia('(max-width: 760px)').matches,fine=params.quality==='fine'&&!mobile;
 const shape=params.shape,terrain=shape==='terrain';
 let geometry=terrain?new THREE.PlaneGeometry(7.6,7.6,fine?128:80,fine?128:80):shape==='sphere'?new THREE.SphereGeometry(SURFACE.sphereRadius,fine?112:72,fine?72:48):new THREE.TorusGeometry(SURFACE.majorRadius,SURFACE.minorRadius,fine?56:36,fine?128:88);
 if(terrain||shape==='torus')geometry.rotateX(-Math.PI/2);
 if(!terrain){geometry.deleteAttribute('uv');const welded=mergeVertices(geometry,1e-5);geometry.dispose();geometry=welded;}
 const original=geometry.attributes.position.array.slice(),values=new Float32Array(geometry.attributes.position.count),samples=new Float64Array(original.length),normals=new Float64Array(original.length);
 for(let i=0;i<values.length;i++){const base=[original[i*3],original[i*3+1],original[i*3+2]];samples.set([base[0]*.65,terrain?.371:base[1]*.65,base[2]*.65],i*3);if(!terrain)normals.set(surfaceNormal(base,shape),i*3);}
 geometry.setAttribute('fieldValue',new THREE.BufferAttribute(values,1));geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);geometry.attributes.fieldValue.setUsage(THREE.DynamicDrawUsage);
 const mesh=new THREE.Mesh(geometry,material),group=new THREE.Group();group.add(mesh);
 let skirts=null,edgeIndices=[];
 if(terrain){
  const segments=fine?128:80,positions=[],indices=[];
  const edges=[[],[],[],[]];for(let i=0;i<=segments;i++){edges[0].push(i);edges[1].push(i*(segments+1)+segments);edges[2].push(segments*(segments+1)+segments-i);edges[3].push((segments-i)*(segments+1));}
  for(const edge of edges){const start=positions.length/3;for(const index of edge){edgeIndices.push(index);positions.push(0,0,0,0,0,0);}for(let i=0;i<segments;i++){const a=start+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setIndex(indices);skirts=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#123f46',side:THREE.DoubleSide}));group.add(skirts);
 }
 function update(time,current=params){
  const pos=geometry.attributes.position,offset=animationOffset(time);let minHeight=Infinity;
  for(let i=0;i<pos.count;i++){
   const j=i*3,value=fields.scalar(samples[j]+offset[0],samples[j+1]+offset[1],samples[j+2]+offset[2],current);values[i]=value;
   if(terrain)pos.setXYZ(i,original[j],value*current.amplitude*1.65,original[j+2]);
   else{const displacement=value*current.amplitude*(shape==='torus'?.25:.5);pos.setXYZ(i,original[j]+normals[j]*displacement,original[j+1]+normals[j+1]*displacement,original[j+2]+normals[j+2]*displacement);}
  }
  if(terrain){
   for(let i=0;i<pos.count;i++)minHeight=Math.min(minHeight,pos.getY(i));
   const sides=skirts.geometry.attributes.position;edgeIndices.forEach((index,i)=>{sides.setXYZ(i*2,pos.getX(index),pos.getY(index),pos.getZ(index));sides.setXYZ(i*2+1,pos.getX(index),minHeight-.35,pos.getZ(index));});sides.needsUpdate=true;skirts.geometry.computeBoundingSphere();
  }
  pos.needsUpdate=true;geometry.attributes.fieldValue.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }
 update(0);return {group,update,vertices:geometry.attributes.position.count};
}
