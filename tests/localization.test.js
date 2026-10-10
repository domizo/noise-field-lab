import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {japanese} from '../src/lib/messages.js';
import {resolveLanguage,readLanguage,translate} from '../src/lib/locale.js';
import {lessons,defaults} from '../src/lib/lessons.js';
const root=fileURLToPath(new URL('../',import.meta.url));
test('language selection honors explicit link, saved preference and browser order',()=>{
 assert.equal(resolveLanguage({search:'?lang=ja',stored:'en',languages:['en-US']}),'ja');
 assert.equal(resolveLanguage({search:'?lang=invalid',stored:'en',languages:['ja-JP']}),'en');
 assert.equal(resolveLanguage({languages:['ja-JP','en']}),'ja');
 assert.equal(resolveLanguage({languages:['fr','ja']}),'en');
 assert.equal(resolveLanguage({}),'en');
});
test('language preference remains optional when storage is denied',()=>{
 const env={navigator:{languages:['ja']},get localStorage(){throw new Error('disabled');}};
 assert.equal(readLanguage(env),'ja');
});
test('Japanese catalog covers every lesson and preserves interpolation placeholders',()=>{
 for(const lesson of lessons)for(const [key,value]of Object.entries(lesson))if(!['id','number'].includes(key))assert.ok(japanese[value],`${lesson.id}.${key}`);
 const placeholders=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
 for(const [en,ja]of Object.entries(japanese)){assert.ok(ja.trim());assert.deepEqual(placeholders(ja),placeholders(en),en);}
 assert.equal(translate('ja','{count} surface samples',{count:144}),'表面上のサンプル 144 点');
 assert.equal(translate('en','{count} surface samples',{count:144}),'144 surface samples');
});
test('localization has no effect on simulation settings or time state',async()=>{
 const frozen=Object.freeze({...defaults}),before=JSON.stringify(frozen);
 for(const language of ['ja','en','ja'])for(const lesson of lessons)translate(language,lesson.what);
 assert.equal(JSON.stringify(frozen),before);
 const app=await fs.readFile(path.join(root,'src/App.jsx'),'utf8'),scene=await fs.readFile(path.join(root,'src/components/SceneView.jsx'),'utf8'),provider=await fs.readFile(path.join(root,'src/components/LocaleProvider.jsx'),'utf8');
 assert.doesNotMatch(app,/key=\{language\}/);
 assert.match(scene,/scene\.current\?\.update\(params\);\},\[params\]/);
 assert.match(scene,/createScene[\s\S]*dispose\(\);\},\[\]/);
 assert.doesNotMatch(provider,/setParams|seekTime|resetParticles|createScene/);
 assert.match(provider,/document\.documentElement\.lang=language/);
});
const virtual='virtual:locale-render';
const result=await build({root,configFile:false,logLevel:'silent',plugins:[react(),{name:'locale-render-test',resolveId:id=>id===virtual?'\0'+virtual:null,load:id=>id==='\0'+virtual?`
 import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
 import App from ${JSON.stringify(path.join(root,'src/App.jsx'))};
 import Controls from ${JSON.stringify(path.join(root,'src/components/Controls.jsx'))};
 import LearningNotes from ${JSON.stringify(path.join(root,'src/components/LearningNotes.jsx'))};
 import {LocaleContext} from ${JSON.stringify(path.join(root,'src/lib/locale-context.js'))};
 import {translate} from ${JSON.stringify(path.join(root,'src/lib/locale.js'))};
 export function render(language,params,lesson){const t=(message,values)=>translate(language,message,values);return renderToStaticMarkup(React.createElement(LocaleContext.Provider,{value:{language,t,setLanguage:()=>{}}},params?React.createElement(React.Fragment,null,React.createElement(Controls,{params,stats:{},onChange:()=>{},onReset:()=>{},onRestartFlow:()=>{}}),React.createElement(LearningNotes,{params,lesson})):React.createElement(App)));}
 `:null}],build:{ssr:true,rollupOptions:{input:virtual},write:false,minify:false}});
await fs.mkdir(path.join(root,'.qa'),{recursive:true});
const compiled=path.join(root,'.qa',`locale-render-${process.pid}.mjs`);
await fs.writeFile(compiled,result.output.find(item=>item.type==='chunk').code);
const {render}=await import(pathToFileURL(compiled));
test('both languages render every module, controls and educational notes without a browser',()=>{
 const original=globalThis.window;globalThis.window={matchMedia:()=>({matches:false})};
 try{
  for(const language of ['en','ja']){
   const app=render(language);assert.match(app,/role="tab"/);assert.ok(app.includes(translate(language,'Noise')));assert.ok(app.includes(language==='ja'?'/docs/ja/':'/docs/'));
   for(const lesson of lessons){
    const html=render(language,{...defaults,lesson:lesson.id,flowSurface:lesson.id==='flow'?'torus':'volume'},lesson);
    assert.ok(html.includes(translate(language,'Playback speed')));assert.ok(html.includes(translate(language,'What you are seeing')));assert.ok(html.includes(translate(language,'Seed')));
    if(language==='ja'){assert.doesNotMatch(html,/>Shape the (field|flow)</);assert.match(html,/周波数/);}
   }
  }
 }finally{globalThis.window=original;}
});
test.after(async()=>{await fs.unlink(compiled);});
