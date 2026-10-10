import { RotateCcw, Pause, Play } from 'lucide-react';
import {useLocale} from '../lib/locale-context.js';
import {DURATION} from '../lib/animation.js';
export default function Timeline({time,playing,onSeek,onToggle,flow=false}){
 const {t}=useLocale();
 return <div className="timeline" aria-label={t('Animation timeline')}><button className="timeline-play" aria-label={t(playing?'Pause animation':'Play animation')} onClick={onToggle}>{playing?<Pause size={14}/>:<Play size={14}/>}</button><label htmlFor="animation-time">{t(flow?'Field time':'Time')}</label><input aria-label={t(flow?'Field time':'Time')} id="animation-time" type="range" min="0" max={DURATION} step=".05" value={time} onChange={e=>onSeek(Number(e.target.value))} aria-valuetext={t('{seconds} seconds',{seconds:time.toFixed(2)})} style={{'--progress':`${time/DURATION*100}%`}}/><output htmlFor="animation-time">{time.toFixed(2)}<span>{t(' / 60 s')}</span></output><button className="timeline-reset" aria-label={t('Reset animation time')} title={t(flow?'Reset time and particles':'Reset time')} onClick={()=>onSeek(0)}><RotateCcw size={14}/></button></div>;
}
