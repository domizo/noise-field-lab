import {useState,useEffect,useCallback,useMemo} from 'react';
import {LocaleContext} from '../lib/locale-context.js';
import {isLanguage,readLanguage,translate,LANGUAGE_KEY} from '../lib/locale.js';
export default function LocaleProvider({children}){
 const [language,setCurrentLanguage]=useState(readLanguage);
 const setLanguage=useCallback(value=>{if(isLanguage(value))setCurrentLanguage(value);},[]);
 const t=useCallback((message,values)=>translate(language,message,values),[language]);
 useEffect(()=>{
  document.documentElement.lang=language;
  document.title=t('Noise Lab · A field guide to procedural worlds');
  document.querySelector('meta[name="description"]')?.setAttribute('content',t('Explore animated 3D noise, octave layering, domain warping, and vector flow constrained to spheres and tori in an interactive field guide.'));
  try{localStorage.setItem(LANGUAGE_KEY,language);}catch{/* Preference is optional when storage is unavailable. */}
  const url=new URL(window.location.href);if(url.searchParams.has('lang')){url.searchParams.delete('lang');window.history.replaceState(window.history.state,'',url);}
 },[language,t]);
 const value=useMemo(()=>({language,setLanguage,t}),[language,setLanguage,t]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
