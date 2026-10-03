import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const out=process.env.GRAPEPAPER_RESPONSIVE_OUTPUT || await fs.mkdtemp(path.join(tmpdir(),'grapepaper-notes-responsive-'));
const publicDocs=process.env.GRAPEPAPER_RESPONSIVE_DOCS||root+'/docs';
await fs.mkdir(out,{recursive:true});
const start=Date.now(), proof={head:process.env.GRAPEPAPER_RESPONSIVE_SHA || 'local-build',checks:[],errors:[],external:[]};
const server=http.createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname;
  assert(pathname.startsWith('/GrapePaper/'));
  const filename=path.resolve(publicDocs,decodeURIComponent(pathname.slice(12))||'index.html');
  assert(filename.startsWith(publicDocs+'/'));
  const bytes=await fs.readFile(filename);
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browser;
const timeout=setTimeout(()=>{console.error('REVIEW_TIMEOUT');process.exitCode=1;void browser?.close();server.close();},170000);
try {
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const base=`http://127.0.0.1:${server.address().port}/GrapePaper/`;
 browser=await chromium.launch({headless:true,...(process.env.GRAPEPAPER_BROWSER_EXECUTABLE ? {executablePath:process.env.GRAPEPAPER_BROWSER_EXECUTABLE} : {})});
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===new URL(base).origin)return route.continue();proof.external.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>proof.errors.push(String(e)));
 async function settle(label){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const state=await page.evaluate(()=>({html:document.querySelector('[aria-label="Paragraph 1 editor"]')?.innerHTML,stored:JSON.parse(localStorage.getItem('grapepaper_document'))?.document.paragraphs[0].content,selection:window.getSelection()?.toString(),active:document.activeElement?.getAttribute('aria-label')}));(proof.timeline??=[]).push({label,...state});console.log('STEP',label,JSON.stringify(state));}
 await page.goto(base);await page.getByRole('button',{name:'葡萄笔记',exact:true}).click();
 await page.getByRole('textbox',{name:'Paragraph 1 editor',exact:true}).waitFor();
 const fixture={id:'review-note',title:'Synthetic security compatibility note',createdAt:1,updatedAt:1,paragraphs:[{id:'review-p1',order:1,content:'<p>Imported <strong>bold</strong> and <em>italic</em> <u>plain</u> <a href="https://example.org">reference</a>.</p>',annotations:[],citations:[]},{id:'review-p2',order:2,content:'<h2>Last heading</h2>',annotations:[],citations:[]}]};
 const choose=page.waitForEvent('filechooser');await page.getByTestId('import-json-btn').click();await(await choose).setFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 const editor=page.getByRole('textbox',{name:'Paragraph 1 editor',exact:true});
 await page.waitForFunction(()=>document.querySelector('[aria-label="Paragraph 1 editor"]')?.textContent.includes('Imported'));
 assert.equal(await editor.locator('strong').textContent(),'bold');assert.equal(await editor.locator('em').textContent(),'italic');assert.equal(await editor.locator('a,u').count(),0);
 assert.equal(await page.getByRole('textbox',{name:'Paragraph 2 editor',exact:true}).locator('p').count(),0);
 proof.checks.push('JSON import restores bold/italic; strips disabled link/underline; heading gets no trailing paragraph');
 await editor.fill('Typing survives persistence');await settle('typed');await editor.press('ControlOrMeta+A');await settle('selected');
 await page.getByRole('button',{name:'Bold',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Paragraph 1 editor"] strong')?.textContent==='Typing survives persistence');
 assert.equal(await page.getByRole('button',{name:'Bold',exact:true}).first().getAttribute('aria-pressed'),'true');
 await settle('bold');
 await page.getByRole('button',{name:'Italic',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Paragraph 1 editor"] em')?.textContent==='Typing survives persistence');
 assert.equal(await page.getByRole('button',{name:'Italic',exact:true}).first().getAttribute('aria-pressed'),'true');
 await settle('italic');
 await editor.press('ControlOrMeta+z');await page.waitForFunction(()=>!document.querySelector('[aria-label="Paragraph 1 editor"] em'));await settle('undo');
 await editor.press('ControlOrMeta+Shift+z');await page.waitForFunction(()=>!!document.querySelector('[aria-label="Paragraph 1 editor"] em'));await settle('redo');
 await editor.press('ArrowRight');await settle('caret');await editor.press('Shift+Enter');await settle('hardbreak');await editor.press('x');await settle('typed-x');
 await page.waitForFunction(()=>!!document.querySelector('[aria-label="Paragraph 1 editor"] br'));
 proof.checks.push('Typing, bold/italic toolbar state, undo/redo and Shift+Enter hard break');
 await page.waitForFunction(()=>{const html=document.querySelector('[aria-label="Paragraph 1 editor"]')?.innerHTML,stored=JSON.parse(localStorage.getItem('grapepaper_document'));return html?.includes('<strong>')&&html?.includes('<em>')&&stored?.document.paragraphs[0].content===html;});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('grapepaper_document')));
 proof.storedBeforeReload=stored;proof.htmlBeforeReload=await editor.innerHTML();console.log('PERSISTENCE_DIAGNOSTIC',JSON.stringify({stored,html:proof.htmlBeforeReload}));
 assert(stored.document.paragraphs[0].content.includes('<strong>'));assert(stored.document.paragraphs[0].content.includes('<em>'));assert(stored.document.paragraphs[0].content.includes('<br>'));
 await page.reload();await page.getByRole('button',{name:'葡萄笔记',exact:true}).click();
 await page.getByRole('textbox',{name:'Paragraph 1 editor',exact:true}).waitFor();
 assert.equal(await editor.innerHTML(),stored.document.paragraphs[0].content);
 proof.checks.push('Autosave HTML and browser reload restore exact formatting/content');
 async function download(testId,name){const event=page.waitForEvent('download');await page.getByTestId(testId).click();const d=await event;await d.saveAs(out+'/'+name);return await fs.readFile(out+'/'+name,'utf8');}
 const exported=JSON.parse(await download('export-json-btn','note.json'));assert.deepEqual(exported,stored.document);
 const markdown=await download('export-md-btn','note.md');assert(markdown.startsWith('# '+fixture.title));assert(markdown.includes('Typing survives persistence'));assert(!markdown.includes('<strong>'));
 proof.checks.push('Implemented JSON export preserves note; Markdown export preserves plain content');
 for(const width of [1440,900,600,390]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await editor.scrollIntoViewIfNeeded();await editor.click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await editor.press('ControlOrMeta+A');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geo=await editor.evaluate(el=>{const r=el.getBoundingClientRect(),selection=window.getSelection(),rects=selection?.rangeCount?Array.from(selection.getRangeAt(0).getClientRects()).map(r=>({width:r.width,height:r.height,x:r.x,y:r.y})):[];return {x:r.x,y:r.y,width:r.width,height:r.height,viewport:innerWidth,rects,selection:selection?.toString(),active:document.activeElement?.outerHTML.slice(0,300)};});
  proof['geometry'+width]=geo;console.log('GEOMETRY_DIAGNOSTIC',width,JSON.stringify(geo));await page.screenshot({path:out+'/observed-'+width+'.png'});
  assert(geo.width>0&&geo.x>=0&&geo.x+geo.width<=width+1);assert(geo.rects.some(r=>r.width>0&&r.height>0));assert(geo.rects.every(r=>Number.isFinite(r.x)&&Number.isFinite(r.y)));
  assert(geo.width>=Math.min(250,width/2), 'notes editor must remain readable, not collapse to a narrow strip');
  const layout=await page.evaluate(()=>{
    const sidebar=document.querySelector('[data-testid="import-json-btn"]').closest('aside');
    const canvas=document.querySelector('[aria-label="Paragraph 1 editor"]').closest('main');
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {sidebar:rect(sidebar),canvas:rect(canvas),sidebarPosition:getComputedStyle(sidebar).position,
      canvasMarginLeft:getComputedStyle(canvas).marginLeft,canvasPadding:getComputedStyle(canvas).paddingLeft,
      documentWidth:document.documentElement.scrollWidth};
  });
  proof['layout'+width]=layout;
  assert(layout.documentWidth<=width+1,'notes must not horizontally overflow the viewport');
  if(width<=600){
    assert.equal(layout.sidebarPosition,'static');
    assert(Math.abs(layout.sidebar.width-width)<=1);
    assert(Math.abs(layout.canvas.width-width)<=1);
    assert.equal(layout.canvasMarginLeft,'0px');
    assert(layout.canvas.y>=layout.sidebar.y+layout.sidebar.height-1,'canvas must follow the sidebar');
  }else{
    assert.equal(layout.sidebarPosition,'fixed');
    assert(layout.canvas.x>=layout.sidebar.width-1,'desktop/tablet canvas must retain its sidebar offset');
  }
  for(const id of ['import-json-btn','import-md-btn','export-json-btn','export-md-btn','reset-sample-btn','clear-draft-btn','language-en-btn','language-zh-btn']){
    const button=page.getByTestId(id);await button.scrollIntoViewIfNeeded();
    assert(await button.isVisible() && await button.isEnabled(),id+' must remain available');
    assert((await button.getAttribute('title'))?.length>0,id+' must retain its accessible label');
    const box=await button.boundingBox();assert(box&&box.width>0&&box.height>=40&&box.x>=0&&box.x+box.width<=width+1,id+' must fit the viewport');
    await button.focus();assert(await button.evaluate(el=>document.activeElement===el),id+' must be focusable');
  }

  await editor.scrollIntoViewIfNeeded();await editor.click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await editor.press('ControlOrMeta+A');
  const slab=page.getByTestId('stone-slab-review-p1');assert.equal(await slab.getAttribute('data-editing'),'true');assert.equal(await slab.getAttribute('data-selected'),'true');
  proof['geometry'+width]=geo;await page.screenshot({path:out+`/editor-${width}.png`});
 }
 proof.checks.push('1440/900/600/390 editor readability, settled selection geometry, sidebar/canvas layout and reachable/focusable controls');
 await page.setViewportSize({width:1440,height:900});
 const mdChoose=page.waitForEvent('filechooser');await page.getByTestId('import-md-btn').click();await(await mdChoose).setFiles({name:'synthetic.md',mimeType:'text/markdown',buffer:Buffer.from('# Markdown fixture\n\nFirst plain paragraph.\n\nSecond plain paragraph.')});
 await page.waitForFunction(()=>document.querySelector('[aria-label="Paragraph 1 editor"]')?.textContent==='First plain paragraph.');
 assert.equal(await page.getByRole('textbox',{name:'Paragraph 2 editor',exact:true}).textContent(),'Second plain paragraph.');
 await page.getByRole('button',{name:/add new stone slab/i,exact:true}).click();
 const third=page.getByRole('textbox',{name:'Paragraph 3 editor',exact:true});await third.waitFor();await third.fill('Added note');
 await page.getByRole('button',{name:'Delete stone slab 3',exact:true}).click();await page.getByRole('alertdialog').waitFor();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await third.textContent(),'Added note');
 await page.getByRole('button',{name:'Delete stone slab 3',exact:true}).click();await page.getByRole('alertdialog').waitFor();await page.getByRole('button',{name:'Delete',exact:true}).click();await third.waitFor({state:'detached'});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('grapepaper_document')).document.paragraphs.length===2);
 await page.reload();await page.getByRole('button',{name:'葡萄笔记',exact:true}).click();await page.getByRole('textbox',{name:'Paragraph 1 editor',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Paragraph 1 editor',exact:true}).textContent(),'First plain paragraph.');assert.equal(await page.getByRole('textbox',{name:'Paragraph 3 editor',exact:true}).count(),0);
 proof.checks.push('Implemented Markdown import, add paragraph, cancel/confirm deletion and reload persistence');
 assert.deepEqual(proof.errors,[]);assert.deepEqual(proof.external,[]);proof.result='PASS';
 console.log(JSON.stringify(proof,null,2));
}catch(error){proof.result='FAIL';proof.failure=String(error);console.error(error);process.exitCode=1;}
finally {clearTimeout(timeout);await browser?.close();await new Promise(resolve=>server.close(resolve));proof.durationSeconds=(Date.now()-start)/1000;await fs.writeFile(out+'/proof-'+start+'.json',JSON.stringify(proof,null,2)+'\n');await fs.writeFile(out+'/proof.json',JSON.stringify(proof,null,2)+'\n');console.log('Cleanup: owned browser and loopback server closed. Duration '+proof.durationSeconds+'s');}
