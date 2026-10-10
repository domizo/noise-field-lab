import { japanese } from './messages.js';
export const LANGUAGE_KEY='noise-lab-language';
export const isLanguage=value=>value==='en'||value==='ja';
export function resolveLanguage({search='',stored=null,languages=[]}={}){
 const requested=new URLSearchParams(search).get('lang');
 if(isLanguage(requested))return requested;
 if(isLanguage(stored))return stored;
 return String(languages[0]||'').toLowerCase().startsWith('ja')?'ja':'en';
}
export function readLanguage(environment=globalThis){
 let stored=null;try{stored=environment.localStorage?.getItem(LANGUAGE_KEY);}catch{/* Storage can be unavailable. */}
 return resolveLanguage({search:environment.location?.search,stored,languages:environment.navigator?.languages||[environment.navigator?.language]});
}
export function translate(language,message,values={}){
 const template=language==='ja'?(japanese[message]??message):message;
 return template.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match);
}
