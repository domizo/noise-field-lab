import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, MousePointer2 } from 'lucide-react';
import {useLocale} from '../lib/locale-context.js';
import { createScene } from '../lib/scene.js';
export default function SceneView({params,playing,viewVersion,onStats,onTime,onPlaybackEnd,timeRequest,particleReset}){
 const {t}=useLocale();
 const host=useRef(null),scene=useRef(null),initial=useRef(params),statsCallback=useRef(onStats),timeCallback=useRef(onTime),endCallback=useRef(onPlaybackEnd);const [error,setError]=useState('');
 useEffect(()=>{scene.current=createScene(host.current,initial.current,s=>statsCallback.current(s),setError,{onTime:t=>timeCallback.current?.(t),onPlaybackEnd:()=>endCallback.current?.()});return()=>scene.current?.dispose();},[]);
 useEffect(()=>{scene.current?.update(params);},[params]);
 useEffect(()=>{scene.current?.setPlaying(playing);},[playing]);
 useEffect(()=>{scene.current?.resetCamera();},[viewVersion]);
 useEffect(()=>{if(timeRequest)scene.current?.seekTime(timeRequest.value);},[timeRequest]);
 useEffect(()=>{if(particleReset)scene.current?.resetParticles();},[particleReset]);
 useEffect(()=>{host.current?.querySelector('canvas')?.setAttribute('aria-label',t('Interactive 3D noise visualization. Drag to orbit, scroll to zoom, or use the view buttons.'));},[t]);
 return <><div className="scene-host" ref={host}/>{error&&<div className="graphics-error" role="alert"><h3>{t('3D view unavailable')}</h3><p>{t(error)}</p><p>{t('The controls and learning notes are still available.')}</p></div>}<div className="viewport-help"><MousePointer2 size={13}/><span>{t('Drag to orbit')} <span className="help-dot">·</span> {t('Scroll to zoom')}</span></div><div className="zoom-controls"><button onClick={()=>scene.current?.zoom(1)} aria-label={t('Zoom in')}><Plus size={17}/></button><button onClick={()=>scene.current?.zoom(-1)} aria-label={t('Zoom out')}><Minus size={17}/></button></div><div className="axis-marker" aria-hidden="true"><svg viewBox="0 0 60 55"><path d="M26 35V9M26 35l23 8M26 35L9 48" strokeWidth="1.5" fill="none"/><text x="24" y="8">Y</text><text x="51" y="47">X</text><text x="1" y="54">Z</text></svg></div></>;
}
