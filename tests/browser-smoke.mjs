/** Optional interactive suite. Requires a working authorized WebGL browser. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:1536,height:1024}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
async function setRange(label,value){const input=page.getByLabel(label,{exact:true});await input.focus();await input.press('Home');const bounds=await input.evaluate(e=>({min:Number(e.min),step:Number(e.step)||1}));for(let i=0;i<Math.round((value-bounds.min)/bounds.step);i++)await input.press('ArrowRight');}
async function mode(value){await page.waitForFunction(expected=>document.querySelector('canvas')?.dataset.mode===expected,value);}
async function pause(){if(await page.getByRole('button',{name:'Pause animation',exact:true}).isVisible())await page.getByRole('button',{name:'Pause animation',exact:true}).click();}
try{
 await page.goto(process.env.TEST_URL||'http://localhost:5173');await page.locator('canvas[data-frame]').waitFor();
 assert.equal(await page.getByRole('tab').count(),4);await pause();await page.getByRole('button',{name:'Reset animation time',exact:true}).click();
 for(const [label,id]of [['01 Noise','noise'],['02 Octaves','octaves'],['03 Warp','warp'],['04 Flow','flow']]){
  await pause();await page.getByRole('tab',{name:label}).click();await page.waitForFunction(()=>document.querySelector('canvas').dataset.time==='0.0000');
  await page.getByRole('button',{name:'Play animation',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.time)>.2);
  await pause();const t=await page.locator('canvas').getAttribute('data-time');await page.waitForTimeout(150);assert.equal(await page.locator('canvas').getAttribute('data-time'),t);
  await setRange(id==='flow'?'Field time':'Time',5);await page.waitForFunction(()=>document.querySelector('canvas').dataset.time==='5.0000');
  assert.equal(await page.getByLabel('Playback speed',{exact:true}).isVisible(),true);
  for(const shape of ['Sphere','Torus']){await page.getByRole('button',{name:shape,exact:true}).click();await mode(`${id}-${shape.toLowerCase()}`);}
  if(id==='noise')await page.getByLabel('Algorithm',{exact:true}).selectOption('billow');
  if(id==='octaves'){await setRange('Layers (octaves)',7);await setRange('Gain',.7);}
  if(id==='warp'){await page.getByLabel('Pattern',{exact:true}).selectOption('wood');await setRange('Warp strength',2);}
  if(id==='flow'){await page.getByRole('switch',{name:'Direction arrows',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas').dataset.arrows==='0');await page.getByRole('button',{name:'Restart particles',exact:true}).click();assert.ok(Number(await page.locator('canvas').getAttribute('data-particles'))>0);}
  await page.getByRole('button',{name:'Reset animation time',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas').dataset.time==='0.0000');
 }
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 assert.equal(await page.getByRole('button',{name:'Reset view',exact:true}).isVisible(),true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.getByRole('button',{name:'Play animation',exact:true}).isVisible(),true);
 await page.getByRole('link',{name:'Illustrated guide'}).click();await page.getByRole('heading',{name:'Read the field',exact:true}).waitFor();assert.equal(await page.locator('figure img').count(),7);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.getByRole('link',{name:'Open the lab'}).click();await page.locator('canvas[data-frame]').waitFor();
 assert.deepEqual(errors,[]);console.log('Four-module and guide browser smoke suite passed.');
}finally{await browser.close();}
