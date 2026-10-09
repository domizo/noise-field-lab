export const DURATION=60;
export const FLOW_CACHE=Object.freeze({resolution:33,extent:4.65});
export function clampTime(value){return Number.isFinite(value)?Math.max(0,Math.min(DURATION,value)):0;}
export function advanceTime(time,dt,speed,playing=true){const current=clampTime(time);const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0,rate=Number.isFinite(speed)?Math.max(0,Math.min(2,speed)):1;return playing?clampTime(current+step*rate):current;}
/** A bounded coordinate translation, not a fourth noise dimension. */
export function animationOffset(time){const t=clampTime(time);if(t===0||t===DURATION)return [0,0,0];const angle=t/DURATION*Math.PI*2;return [.9*Math.sin(angle),.65*(1-Math.cos(angle)),.75*Math.sin(angle*2)];}
export function shiftedPoint(p,time){const offset=animationOffset(time);return p.map((value,i)=>value+offset[i]);}
export function animatedScalar(fields,p,time,params){return fields.scalar(...shiftedPoint(p,time),params);}
export function animatedVector(field,p,time){return field(...shiftedPoint(p,time));}

export function flowCacheSettings(frequency){return {...FLOW_CACHE,resolution:frequency>1?41:33};}
