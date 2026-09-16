import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.GRAPEPAPER_TEST_URL || 'http://127.0.0.1:5173';
// Synthetic, redistributable fixture: no uploaded or personal paper enters the repo.
function pdfFixture() {
  const stream = 'BT /F1 16 Tf 40 740 Td (Reading question one.) Tj 0 -40 Td (Methods change one variable.) Tj 310 0 Td (Adjacent column.) Tj -310 -40 Td (Results require interpretation.) Tj 0 -60 Td (References) Tj 0 -25 Td (A supplied source for this example.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let data='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const xref=Buffer.byteLength(data);
  data+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(x=>`${String(x).padStart(10,'0')} 00000 n \n`).join('');
  data+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
for(let attempt=0;attempt<60;attempt++) {
  try { if((await fetch(base)).ok) break; } catch { /* Wait for Vite startup. */ }
  if(attempt===59) throw new Error('Start the web server before browser QA.');
  await new Promise(resolve=>setTimeout(resolve,250));
}
const browser=await chromium.launch({headless:true, ...(process.env.GRAPEPAPER_BROWSER_EXECUTABLE ? {executablePath:process.env.GRAPEPAPER_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']} : {})});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage(); const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=page.getByRole('button',{name:'✓ 我读过了',exact:true});
const checked=page.getByRole('button',{name:'✓ 已确认读过',exact:true});
try {
  await page.goto(base);
  await page.getByRole('button',{name:'先试读一页示例 →'}).click();
  const sample=page.getByRole('button',{name:'伴读这一段 →',exact:true});
  for(let i=0;i<3;i++) { await sample.nth(i).click(); await check.click(); await checked.waitFor(); }
  await page.getByRole('status',{name:'阅读间奏'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('grapepaper.reading.v1')),null,'default must not persist');
  await sample.first().click(); await checked.waitFor();
  await page.getByRole('button',{name:'葡萄笔记',exact:true}).click();
  await page.getByRole('button',{name:'返回文献伴读',exact:true}).click();
  await checked.waitFor(); // switching workspaces preserves memory session
  await page.getByRole('button',{name:'阅读偏好',exact:true}).click();
  await page.getByLabel('在这台设备记住阅读标记').check();
  assert.ok(await page.evaluate(()=>localStorage.getItem('grapepaper.reading.v1')));
  await page.reload();
  await page.getByRole('button',{name:'先试读一页示例 →'}).click();
  await sample.first().click(); await checked.waitFor();
  await page.getByRole('button',{name:'阅读偏好',exact:true}).click();
  await page.getByLabel('在这台设备记住阅读标记').uncheck();
  assert.equal(await page.evaluate(()=>localStorage.getItem('grapepaper.reading.v1')),null,'disabling removes previous markers');
  await page.getByRole('button',{name:'阅读偏好',exact:true}).click();
  await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-reading.pdf',mimeType:'application/pdf',buffer:pdfFixture()});
  await page.locator('.gp-pdf-page:not(.gp-pdf-page-loading)').waitFor();
  const span=page.locator('.gp-pdf-text-layer span').filter({hasText:'Reading question one.'}).first();
  await span.waitFor();
  const rect=await span.boundingBox(); assert.ok(rect && rect.width>100 && rect.height>5,'PDF text geometry must exist');
  await page.mouse.move(rect.x+1,rect.y+rect.height/2); await page.mouse.down(); await page.mouse.move(rect.x+rect.width-1,rect.y+rect.height/2,{steps:15}); await page.mouse.up();
  await check.click(); await checked.waitFor();
  await page.waitForTimeout(80); await checked.waitFor(); // pointerup must not reset selection
  await page.getByRole('button',{name:'框选',exact:true}).click();
  const methods=page.locator('.gp-pdf-text-layer span').filter({hasText:'Methods change one variable.'}).first();
  const m=await methods.boundingBox(); assert.ok(m);
  await page.mouse.move(m.x-3,m.y-3); await page.mouse.down(); await page.mouse.move(m.x+m.width+3,m.y+m.height+3,{steps:12}); await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.selectedPassage blockquote')?.textContent?.includes('Methods change'));
  assert.ok(!(await page.locator('.selectedPassage blockquote').innerText()).includes('Adjacent'));
  await check.click();
  await page.getByRole('button',{name:'随手圈',exact:true}).click();
  const results=page.locator('.gp-pdf-text-layer span').filter({hasText:'Results require interpretation.'}).first();
  const r=await results.boundingBox();assert.ok(r);
  await page.mouse.move(r.x-4,r.y-4);await page.mouse.down();
  for(const [x,y] of [[r.x+r.width+4,r.y-4],[r.x+r.width+4,r.y+r.height+4],[r.x-4,r.y+r.height+4],[r.x-4,r.y-4]]) await page.mouse.move(x,y,{steps:6});
  await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.selectedPassage blockquote')?.textContent?.includes('Results require'));
  await check.click();
  // Controlled API response tests UI wiring, not provider quality.
  await page.route('**/api/companion',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({explanation:'测试响应：区分观察与解释。',argumentRole:'回到原文核对。',citations:[],stories:[],questions:['观察与解释有什么区别？']})}));
  await page.getByRole('button',{name:'生成中文伴读',exact:true}).click();
  await page.getByText('测试响应：区分观察与解释。',{exact:true}).waitFor();
  await page.setViewportSize({width:640,height:1000});
  const panel=await page.locator('.companionColumn').boundingBox();assert.ok(panel && panel.x>=0 && panel.x+panel.width<=641,'companion remains in viewport');
  await page.setViewportSize({width:1440,height:1050});
  // An additional Zotero launch feeds the already-open page, without storage.
  const handoff={version:1,source:'zotero',selection:{text:'A fresh Zotero selection.',page:2},document:{title:'Zotero source'}};
  const other=await context.newPage();
  await other.goto(base+'/#grapepaper='+encodeURIComponent(JSON.stringify(handoff)));
  await other.getByText('选段已送到打开的伴读窗口。',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.selectedPassage blockquote')?.textContent==='A fresh Zotero selection.');
  assert.equal(new URL(other.url()).hash,'','handoff removed before render');
  assert.equal(await page.evaluate(()=>localStorage.getItem('grapepaper.reading.v1')),null);
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log('PASS: demo, explicit confirmation, memory/persistence, workspace return, PDF text/box/lasso, AI response, responsive layout, Zotero cross-tab handoff');
} finally { await browser.close(); }
