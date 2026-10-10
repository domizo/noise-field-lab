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
  const file=path.resolve(docs,ref.split(/[?#]/)[0]);assert.ok(file.startsWith(path.join(root,'public')),ref);
  if(ref.split(/[?#]/)[0]==='../'){await fs.access(path.join(root,'index.html'));continue;}
  await fs.access(file);
 }
 const readme=await fs.readFile(path.join(root,'README.md'),'utf8');assert.match(readme,/\(public\/docs\/index\.html\)/);
 const app=await fs.readFile(path.join(root,'src/App.jsx'),'utf8');assert.ok(app.includes("'/docs/ja/'")&&app.includes("'/docs/'"));
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
 for(const relative of ['README.md','README.ja.md','docs/NOISE_GUIDE.md','docs/NOISE_GUIDE.ja.md','VALIDATION.md','VALIDATION.ja.md']){
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


test('source links use the repository without a bundled source archive',async()=>{
 const repository='https://github.com/domizo/noise-field-lab';
 const app=await fs.readFile(path.join(root,'src/App.jsx'),'utf8');
 const readme=await fs.readFile(path.join(root,'README.md'),'utf8');
 for(const content of [app,html,readme]){
  assert.ok(content.includes(repository));assert.doesNotMatch(content,/href=["'][^"']*noise-lab-source\.zip/);
 }
 assert.match(app,/Browse the source repository/);assert.match(html,/Browse the source repository/);
 for(const file of ['README.md','README.ja.md']){
  const content=await fs.readFile(path.join(root,file),'utf8');
  assert.ok(content.includes('git clone https://github.com/domizo/noise-field-lab.git\ncd noise-field-lab\nnpm ci\nnpm run dev'),file);
  assert.doesNotMatch(content,/https?:\/\/[^\s)]+\.chatgpt\.site|hosted private Site|非公開 Site/);
 }
 await assert.rejects(fs.access(path.join(root,'public/noise-lab-source.zip')),{code:'ENOENT'});
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 for(const script of Object.values(pkg.scripts))assert.doesNotMatch(script,/noise-lab-source|\bzip\b/);
});


test('Japanese hosted guide matches the English structure, formulas and local assets',async()=>{
 const folder=path.join(docs,'ja'),ja=await fs.readFile(path.join(folder,'index.html'),'utf8');
 assert.match(ja,/<html lang="ja">/);
 const ids=source=>[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids(ja),ids(html));
 const codes=source=>[...source.matchAll(/<code>([\s\S]*?)<\/code>/g)].map(m=>m[1]);
 assert.deepEqual(codes(ja),codes(html));
 for(const [enPath,jaPath]of [['README.md','README.ja.md'],['docs/NOISE_GUIDE.md','docs/NOISE_GUIDE.ja.md']]){
  const enText=await fs.readFile(path.join(root,enPath),'utf8'),jaText=await fs.readFile(path.join(root,jaPath),'utf8');
  const math=text=>[...text.matchAll(/```text\n([\s\S]*?)```/g)].map(m=>m[1]);
  assert.deepEqual(math(jaText),math(enText),jaPath);
  assert.equal([...jaText.matchAll(/^#{1,6} /gm)].length,[...enText.matchAll(/^#{1,6} /gm)].length,jaPath);
  assert.equal([...jaText.matchAll(/!\[[^\]]+\]\(/g)].length,[...enText.matchAll(/!\[[^\]]+\]\(/g)].length,jaPath);
 }
 assert.equal([...ja.matchAll(/<figcaption>/g)].length,7);
 for(const tag of ja.matchAll(/<img\b[^>]*>/g)){const image=attrs(tag[0]);assert.ok(image.alt?.length>25);assert.ok(image.src.startsWith('../images/ja/'));}
 for(const source of [html,ja]){assert.match(source,/data-language="en"/);assert.match(source,/data-language="ja"/);assert.ok(source.includes('https://github.com/domizo/noise-field-lab'));}
 for(const match of ja.matchAll(/(?:href|src)="([^"]+)"/g)){
  const ref=match[1];if(/^https?:/.test(ref))continue;
  if(ref.startsWith('#')){assert.ok(ids(ja).includes(ref.slice(1)));continue;}
  const target=path.resolve(folder,ref.split(/[?#]/)[0]);assert.ok(target.startsWith(path.join(root,'public')));await fs.access(target);
 }
});
test('Japanese figures regenerate identically and guard their English labels',async()=>{
 execFileSync(process.execPath,[path.join(root,'scripts/localize-doc-figures.mjs'),'--check'],{cwd:root,timeout:30000,stdio:'pipe'});
 const manifest=JSON.parse(await fs.readFile(path.join(docs,'images/ja/figure-manifest.json'),'utf8'));
 assert.ok(JSON.stringify(manifest).includes('ja'));
 for(const file of (await fs.readdir(path.join(docs,'images/ja'))).filter(name=>name.endsWith('.svg'))){const svg=await fs.readFile(path.join(docs,'images/ja',file),'utf8');assert.match(svg,/lang="ja"/);assert.match(svg,/<title[^>]*>[^<]+<\/title>/);}
});
