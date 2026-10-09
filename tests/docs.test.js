import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const docs=path.join(root,'public/docs');
const html=await fs.readFile(path.join(docs,'index.html'),'utf8');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
test('guide has unique anchors, a labelled navigation and seven accessible figures',()=>{
 assert.match(html,/<html lang="en">/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 assert.match(html,/<nav[^>]+aria-label="Guide contents"/);
 const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>attrs(m[0]));assert.equal(images.length,7);
 images.forEach(img=>{assert.ok(img.alt?.length>40);assert.equal(img.width,'1100');assert.ok(img.src.startsWith('images/'));});
 assert.equal([...html.matchAll(/<figcaption>/g)].length,7);
 for(const id of ['noise','parameters','octaves','warp','flow','surface','time','reference'])assert.ok(ids.includes(id));
});
test('every local guide link, image and stylesheet resolves',async()=>{
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const ref=m[1];if(/^(https?:|mailto:)/.test(ref))continue;
  if(ref.startsWith('#')){assert.ok(html.includes(`id="${ref.slice(1)}"`),ref);continue;}
  const file=path.resolve(docs,ref.split('#')[0]);assert.ok(file.startsWith(path.join(root,'public')),ref);
  if(ref==='../'){await fs.access(path.join(root,'index.html'));continue;}
  await fs.access(file);
 }
 const readme=await fs.readFile(path.join(root,'README.md'),'utf8');assert.match(readme,/\(public\/docs\/index\.html\)/);
 const app=await fs.readFile(path.join(root,'src/App.jsx'),'utf8');assert.match(app,/href="\/docs\/"/);
});
test('all diagrams have standalone accessible SVG titles and descriptions',async()=>{
 const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>attrs(m[0]));
 for(const img of images){const svg=await fs.readFile(path.join(docs,img.src),'utf8');assert.match(svg,/<svg[^>]+viewBox="0 0 1100 \d+"/);assert.match(svg,/<title[^>]*>[^<]+<\/title>/);assert.match(svg,/<desc[^>]*>[^<]+<\/desc>/);assert.doesNotMatch(svg,/<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/);}
});
test('sampled diagrams regenerate byte-for-byte from the actual math',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'noise-docs-'));
 try{
  execFileSync(process.execPath,[path.join(root,'scripts/generate-doc-figures.mjs'),'--out',temp],{cwd:root,timeout:30000,stdio:'pipe'});
  const files=(await fs.readdir(temp)).sort();assert.equal(files.filter(x=>x.endsWith('.svg')).length,6);
  for(const file of files)assert.deepEqual(await fs.readFile(path.join(temp,file)),await fs.readFile(path.join(docs,'images',file)),file);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});

function markdownAnchors(text){
 const headings=[...text.replace(/```[\s\S]*?```/g,'').matchAll(/^#{1,6} (.+)$/gm)].map(m=>m[1]);
 return headings.map(h=>h.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/ /g,'-'));
}
test('README and full Markdown guide resolve all relative assets, files and anchors',async()=>{
 for(const relative of ['README.md','docs/NOISE_GUIDE.md']){
  const file=path.join(root,relative),md=await fs.readFile(file,'utf8');
  for(const m of md.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)){
   const link=m[1];if(/^https?:/.test(link))continue;
   const [target,anchor]=link.split('#'),resolved=target?path.resolve(path.dirname(file),target):file;
   assert.ok(resolved.startsWith(root),`${relative}: ${link}`);await fs.access(resolved);
   if(anchor){const content=await fs.readFile(resolved,'utf8');assert.ok(markdownAnchors(content).includes(anchor),`${relative}: ${link}`);}
  }
 }
});
test('Markdown guide is complete, illustrated and independent of private hosting',async()=>{
 const md=await fs.readFile(path.join(root,'docs/NOISE_GUIDE.md'),'utf8');assert.ok(md.split(/\s+/).length>3000);assert.equal([...md.matchAll(/!\[[^\]]+\]\(\.\.\/public\/docs\/images\/[^)]+\.svg\)/g)].length,7);
 assert.doesNotMatch(md,/https?:\/\/[^\s)]+\.chatgpt\.site|\/workspace\/|\/Users\//);
 for(const term of ['Gradient noise','Building with octaves','Domain warping','vector fields','Flow on a sphere','Moving through time'])assert.ok(md.includes(term),term);
});
