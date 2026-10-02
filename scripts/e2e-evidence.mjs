import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { evidenceAnalysisFingerprint } from '../server/evidence.mjs';

const base = process.env.GRAPEPAPER_TEST_URL || 'http://127.0.0.1:5173';
const output = process.env.GRAPEPAPER_EVIDENCE_OUTPUT || join(tmpdir(), 'grapepaper-evidence-v1-e2e');
const claim = 'Recurrence-free model [1]; Smith (2020) claimed every task.';
const bibliography = '[1] Smith, A. (2020). Recurrence-Free Study. doi:10.1234/fixture\n[2] Smith, B. (2020). Another study. doi:10.1234/other';
const sourceLines = [
  ['The recurrence-free model was evaluated on translation.', 'This experiment does not establish superiority on every task.'],
  ['The recurrence-free model used a second translation experiment.', 'UNSELECTED_SOURCE_PAGE_SENTINEL: this page is not selected for AI.'],
];

// Generated only in memory: synthetic fixtures, no private or external paper.
function pdfFixture(pages) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const kids = [];
  for (const lines of pages) {
    const pageId = objects.length + 1, streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${streamId} 0 R >>`);
    const stream = `BT /F1 13 Tf 40 740 Td ${lines.map((line, index) => `${index ? '0 -35 Td ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join(' ')} ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let data = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(data)); data += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(data);
  data += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  data += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
const currentPdf = pdfFixture([[claim, 'References', ...bibliography.split('\n')]]);
const sourcePdf = pdfFixture(sourceLines);
const sourceHash = createHash('sha256').update(sourcePdf).digest('hex');
const sha = value => createHash('sha256').update(value).digest('hex');

await mkdir(output, { recursive: true });
for (let attempt = 0; attempt < 60; attempt++) {
  try { if ((await fetch(base)).ok) break; } catch { /* Bounded server-start wait. */ }
  if (attempt === 59) throw new Error('Start the web server before Evidence Trail E2E.');
  await new Promise(resolve => setTimeout(resolve, 250));
}
const browser = await chromium.launch({ headless: true, ...(process.env.GRAPEPAPER_BROWSER_EXECUTABLE ? { executablePath: process.env.GRAPEPAPER_BROWSER_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], externalRequests = [], serviceRequests = [], screenshots = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (!request.url().startsWith(base) && /^https?:/.test(request.url())) externalRequests.push({ url: request.url(), method: request.method() }); });
const panel = page.getByRole('region', { name: '引用证据链' });
const state = async expected => { await panel.locator(`[data-evidence-state="${expected}"]`).waitFor(); };
const button = name => panel.getByRole('button', { name, exact: true });
async function screenshot(name) {
  const path = `${output}/${name}.png`; await page.screenshot({ path, fullPage: false }); screenshots.push(path);
}
async function fullScreenshot(name) {
  const path = `${output}/${name}.png`; await page.screenshot({ path, fullPage: true }); screenshots.push(path);
}
async function openDetails(summary) {
  const element = panel.locator('summary').filter({ hasText: summary });
  if (!await element.evaluate(node => node.parentElement.open)) await element.click();
}
async function selectEntry(index = 1) { await panel.getByLabel('匹配书目', { exact: true }).selectOption({ index }); }
async function attachSource(bytes = sourcePdf) { await panel.getByLabel('导入本地来源 PDF', { exact: true }).setInputFiles({ name: 'synthetic-source.pdf', mimeType: 'application/pdf', buffer: bytes }); }
async function downloadRecord() {
  await openDetails('导出 / 导入证据记录');
  const pending = page.waitForEvent('download'); await button('导出证据 JSON（含摘录）').click();
  const download = await pending; const path = await download.path(); assert.ok(path);
  return JSON.parse(await readFile(path, 'utf8'));
}
async function importRecord(record) {
  await openDetails('导出 / 导入证据记录');
  await panel.getByLabel('导入证据 JSON 文件', { exact: true }).setInputFiles({ name: 'synthetic-evidence.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(record)) });
}
function assessment(request, interpretation = '受控测试解释：只支持翻译实验，所有任务的结论证据不足。') {
  const ids = request.excerpts.map(excerpt => excerpt.id);
  return { current_passage_id: request.current_passage.id, citation_id: request.citation.id, source_identity_id: request.source_identity.id,
    analysis_input_fingerprint: request.analysis_input_fingerprint, evidence_excerpt_ids: ids, kind: 'model-interpretation',
    aspects: [{ statement: '翻译实验', relation: 'supports', evidence_excerpt_ids: ids, rationale: '所选摘录明确限定实验范围。' },
      { statement: '所有任务都更好', relation: 'insufficient', evidence_excerpt_ids: [], rationale: '未提供所有任务的比较证据。' }],
    interpretation, uncertainty: '词汇定位不是科学核实；此响应为受控 mock。', missing_evidence: ['其他任务的对照实验。'] };
}
try {
  await page.goto(base);
  // Development defaults to the local companion route; explicitly disconnect to
  // exercise the same offline boundary as the public Pages build.
  await page.getByRole('button', { name: '阅读偏好', exact: true }).click();
  const disconnect = page.getByRole('button', { name: '断开 AI', exact: true });
  if (await disconnect.count()) await disconnect.click();
  await page.getByRole('button', { name: '阅读偏好', exact: true }).click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'synthetic-citing-paper.pdf', mimeType: 'application/pdf', buffer: currentPdf });
  await page.locator('.gp-pdf-page:not(.gp-pdf-page-loading)').waitFor();
  const text = page.locator('.gp-pdf-text-layer span').filter({ hasText: claim }).first(); await text.waitFor();
  const rect = await text.boundingBox(); assert.ok(rect && rect.width > 100);
  await page.mouse.move(rect.x + 1, rect.y + rect.height / 2); await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 1, rect.y + rect.height / 2, { steps: 20 }); await page.mouse.up();
  await panel.waitFor();
  await state('CURRENT_PAPER_ONLY');
  await page.evaluate(() => window.scrollTo(0, 0)); await screenshot('00-current-paper-only-1440');
  assert.equal(await panel.getByLabel('引用标记', { exact: true }).locator('option').count(), 3, 'numeric and narrative citations detected independently');
  await panel.getByLabel('引用标记', { exact: true }).selectOption({ label: '[1]' });
  await selectEntry(); await state('BIBLIOGRAPHY_MATCH_ONLY');
  assert.equal(await button('查询来源元数据').isEnabled(), false, 'offline metadata request disabled');
  await button('确认这条来源身份').click(); await state('SOURCE_IDENTITY_RESOLVED_TEXT_UNAVAILABLE');
  await attachSource(); await state('SOURCE_TEXT_AVAILABLE_NOT_SEARCHED');
  assert.ok((await panel.locator('.fingerprint').innerText()).includes(sourceHash), 'fingerprint binds exact source PDF bytes');
  await panel.getByLabel('证据检索词', { exact: true }).fill('nonexistentquasarvelocity');
  await button('在本地来源检索候选摘录').click(); await state('SOURCE_TEXT_SEARCHED_RELEVANT_EXCERPT_NOT_FOUND');
  await panel.getByLabel('证据检索词', { exact: true }).fill('recurrence-free model');
  await button('在本地来源检索候选摘录').click(); await state('RELEVANT_SOURCE_EXCERPT_LOCATED');
  assert.equal(await panel.locator('.trailSource article').count(), 2, 'both synthetic source pages produce lexical candidates');
  await panel.locator('.trailSource article details summary').first().click();
  const extractedPage = await panel.locator('.trailSource article pre').first().innerText();
  assert.ok(extractedPage.includes(sourceLines[0][0]));
  assert.equal(externalRequests.length, 0, 'offline extraction/retrieval must not send any external requests');
  assert.deepEqual(await page.evaluate(() => ({ local: Object.entries(localStorage), session: Object.entries(sessionStorage) })), { local: [], session: [] }, 'source text/evidence are memory-only');
  const offline = await downloadRecord();
  assert.equal(offline.sourceFingerprint, sourceHash); assert.equal(offline.assessment, null);
  for (const excerpt of offline.excerpts) {
    assert.equal(excerpt.provenance.origin, 'local-pdf'); assert.equal(excerpt.provenance.fingerprint, sourceHash);
    assert.equal(excerpt.locator.end - excerpt.locator.start, excerpt.text.length);
    assert.equal(excerpt.id, sha(JSON.stringify([sourceHash, 'pdfjs-text-v1', excerpt.locator.page, excerpt.locator.start, excerpt.locator.end, excerpt.locator.pageLabel ?? null, excerpt.text])));
  }
  assert.equal(extractedPage.slice(offline.excerpts[0].locator.start, offline.excerpts[0].locator.end), offline.excerpts[0].text, 'exact local extraction offsets reproduce excerpt');
  await panel.locator('.trailSource').scrollIntoViewIfNeeded(); await screenshot('01-local-exact-excerpts-1440');
  await fullScreenshot('01-local-complete-page-1440');
  // Only an explicitly connected service receives bounded metadata/selected excerpts.
  await page.route('https://companion.example/api/health', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', configured: true }) }));
  let resolverMode = 'unavailable', modelMode = 'valid';
  let deferred;
  await page.route('https://companion.example/api/companion', async route => {
    const request = route.request().postDataJSON(); serviceRequests.push(request);
    if (request.mode === 'resolve') {
      const candidate = { id: 'crossref-fixture', title: 'Recurrence-Free Study', doi: request.entry.doi, authors: ['Smith'], year: 2020, provider: 'crossref', confidence: 'exact-doi' };
      const candidates = resolverMode === 'ten' ? Array.from({ length: 10 }, (_, index) => ({ ...candidate, id: `crossref-${index}`, authors: Array(20).fill('Author'), confidence: 'candidate' })) : resolverMode === 'unavailable' ? [] : [{ ...candidate, doi: resolverMode === 'wrong-doi' ? '10.1234/wrong' : candidate.doi }];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode: 'resolve', entry_id: request.entry.id, lookup: resolverMode === 'unavailable' ? 'unavailable' : 'available', candidates }) });
    } else {
      assert.equal(request.mode, 'evidence'); assert.equal(request.excerpts.length, 1, 'only checked excerpt sent');
      assert.equal(request.excerpts[0].provenance.fingerprint, sourceHash);
      assert.equal(request.association.basis, 'user-attached'); assert.equal(request.association.verification, 'live-local');
      assert.ok(/^[a-f0-9]{64}$/.test(request.analysis_input_fingerprint));
      assert.equal(request.analysis_input_fingerprint, evidenceAnalysisFingerprint(request), 'browser and server hash bind exact supplied inputs');
      assert.ok(!JSON.stringify(request).includes('UNSELECTED_SOURCE_PAGE_SENTINEL'), 'unselected source page excluded');
      assert.ok(!JSON.stringify(request).includes('%PDF'), 'no entire PDF');
      if (modelMode === 'deferred') await new Promise(resolve => { deferred = resolve; });
      const reply = assessment(request);
      if (modelMode === 'bad-hash') reply.analysis_input_fingerprint = '0'.repeat(64);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mode: 'evidence', assessment: reply }) }).catch(error => { if (modelMode !== 'deferred') throw error; });
    }
  });
  await page.getByRole('button', { name: '阅读偏好', exact: true }).click();
  await page.getByLabel('伴读服务地址').fill('https://companion.example');
  await page.getByRole('button', { name: '测试并连接', exact: true }).click();
  await page.getByText('已连接。选段会在你点击生成或开启自动伴读后发送。', { exact: true }).waitFor();
  await page.getByRole('button', { name: '阅读偏好', exact: true }).click();
  await panel.getByLabel('已检查，使用这条摘录作解释').first().check();
  modelMode = 'bad-hash'; await button('仅根据勾选摘录生成解释').click();
  await panel.getByText('Interpretation input fingerprint mismatch.', { exact: true }).waitFor();
  await state('RELEVANT_SOURCE_EXCERPT_LOCATED'); assert.equal(await panel.locator('.trailInterpretation').count(), 0, 'wrong input-bound interpretation rejected');
  modelMode = 'valid'; await button('仅根据勾选摘录生成解释').click(); await state('MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT');
  await panel.locator('.trailInterpretation').scrollIntoViewIfNeeded(); await screenshot('02-model-boundary-1440');
  await page.setViewportSize({ width: 900, height: 800 });
  await panel.locator('.trailInterpretation').scrollIntoViewIfNeeded();
  const bounds = await panel.boundingBox(); assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 901, '900px evidence panel stays in viewport');
  await screenshot('03-model-boundary-900'); await page.setViewportSize({ width: 1440, height: 800 });
  const modelRecord = await downloadRecord();
  assert.equal(modelRecord.assessment.kind, 'model-interpretation'); assert.equal(modelRecord.analysisExcerptIds.length, 1);
  assert.equal(modelRecord.assessment.aspects[1].relation, 'insufficient');
  assert.ok(!('pages' in modelRecord) && !('source' in modelRecord), 'export excludes whole source index/PDF');
  await importRecord(modelRecord);
  await panel.getByText('导入来源与摘录未验证；不允许基于这些文字生成可信来源解释。请重新提供匹配的本地文件 / 文本。', { exact: true }).waitFor();
  assert.equal(await panel.locator('.trailInterpretation').count(), 0);
  assert.equal(await button('仅根据勾选摘录生成解释').isEnabled(), false);
  await panel.getByText('隔离的导入解释 · 未验证，不继承信任', { exact: true }).waitFor();
  const imported = await downloadRecord(); assert.equal(imported.verification, 'imported-unverified'); assert.equal(imported.assessment, null); assert.ok(imported.importedAssessment);
  await attachSource(pdfFixture([['Changed bytes do not revalidate prior evidence.']]));
  await panel.locator('.trailMessage').filter({ hasText: /Invalid|invalid|无效|失败/ }).waitFor();
  assert.equal(await button('仅根据勾选摘录生成解释').isEnabled(), false, 'changed source bytes remain quarantined');
  await attachSource();
  await panel.getByText('来源字节与摘录定位已重新核对；AI 解释需要重新生成。', { exact: true }).waitFor();
  await state('RELEVANT_SOURCE_EXCERPT_LOCATED');
  assert.equal(await panel.getByText('隔离的导入解释 · 未验证，不继承信任', { exact: true }).count(), 0, 'old imported interpretation cleared after real reattachment');
  await panel.getByLabel('已检查，使用这条摘录作解释').first().check();
  await button('仅根据勾选摘录生成解释').click(); await state('MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT');
  // Editing inputs invalidates an in-flight model response, rather than relabeling stale output.
  modelMode = 'deferred'; await button('仅根据勾选摘录生成解释').click();
  await page.waitForFunction(() => document.querySelector('.trailMessage')?.textContent.includes('正在处理'));
  for (let attempt = 0; !deferred && attempt < 100; attempt++) await page.waitForTimeout(10);
  assert.ok(deferred); await panel.getByLabel('证据检索词', { exact: true }).fill('changed query');
  deferred(); await page.waitForTimeout(100); modelMode = 'valid';
  await state('SOURCE_TEXT_AVAILABLE_NOT_SEARCHED'); assert.equal(await panel.locator('.trailInterpretation').count(), 0, 'late response does not restore invalidated interpretation');
  // Resolver errors remain explicit; author/year ambiguity survives manual confirmation.
  await panel.getByLabel('引用标记', { exact: true }).selectOption({ label: 'Smith (2020)' });
  assert.equal(await panel.getByLabel('匹配书目', { exact: true }).locator('option').count(), 3, 'duplicate author-year candidates retained');
  await selectEntry(); await state('BIBLIOGRAPHY_MATCH_ONLY');
  await button('查询来源元数据').click();
  await panel.getByText('Crossref 来源查询暂时不可用；不能将此解释为没有匹配来源。', { exact: true }).waitFor();
  assert.equal(await panel.locator('.trailIdentity').count(), 0);
  resolverMode = 'wrong-doi'; await button('查询来源元数据').click();
  await panel.getByText('来源 DOI 与请求不匹配。', { exact: true }).waitFor();
  await state('BIBLIOGRAPHY_MATCH_ONLY');
  resolverMode = 'valid'; await button('查询来源元数据').click();
  await panel.getByText('元数据候选已返回；请核对身份，不代表有全文或支持结论。', { exact: true }).waitFor();
  assert.equal(await button('确认这条来源身份').count(), 2, 'bibliography and exact-DOI candidate are separate');
  await button('确认这条来源身份').last().click(); await state('SOURCE_IDENTITY_RESOLVED_TEXT_UNAVAILABLE');
  assert.equal(await panel.locator('.trailInterpretation').count(), 0, 'metadata is not source support');
  const resolved = await downloadRecord(); assert.equal(resolved.identity.confidence, 'exact-doi'); assert.equal(resolved.resolution.ambiguity, 'multiple');
  await screenshot('04-metadata-not-support-1440');
  resolverMode = 'ten'; await button('查询来源元数据').click();
  await panel.getByText('元数据候选已返回；请核对身份，不代表有全文或支持结论。', { exact: true }).waitFor();
  await button('确认这条来源身份').last().click();
  const boundedRecord = await downloadRecord();
  assert.equal(boundedRecord.resolution.candidates.length, 10, 'combined bibliography and remote candidates stay within import bounds');
  assert.equal(boundedRecord.resolution.selectedBibliographyEntryId, boundedRecord.bibliography[0].id);
  await importRecord(boundedRecord);
  await panel.getByText('导入记录未验证。需重新提供字节相同的本地来源；不会信任导入的 AI 解释。', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => ({ local: Object.entries(localStorage), session: Object.entries(sessionStorage) })), { local: [], session: [] });
  assert.deepEqual(errors, [], 'browser runtime errors');
  assert.ok(externalRequests.every(request => request.url.startsWith('https://companion.example/api/')), 'no unconfigured external service contacted');
  const proof = { status: 'PASS', base, currentPdfSha256: sha(currentPdf), sourcePdfSha256: sourceHash, screenshots,
    source: 'Synthetic fixtures; controlled service mocks, not a real AI quality result.', serviceModes: serviceRequests.map(request => request.mode),
    coverage: ['seven evidence states', 'numeric and author/year ambiguity', 'local PDF extraction and exact UTF-16 locators', 'source-byte fingerprint', 'offline/no persistence', 'selected-excerpt-only model payload', 'wrong model input hash rejection', 'compound claim aspects', 'JSON export/import quarantine', 'changed-source rejection', 'matching reattachment clears old assessment', 'query-change late-response invalidation', 'resolver unavailable and wrong DOI fail closed', '1440x800 and 900x800 screenshots'],
    limitations: ['No real provider quality assertion; model/resolver responses controlled.', 'PDF text-layer selection and extraction tested, not arbitrary scientific PDF reading order or OCR.', 'Additional document/citation/endpoint races and hostile import combinations are covered by deterministic tests, not exhaustively by this E2E.'] };
  await writeFile(`${output}/proof.json`, JSON.stringify(proof, null, 2) + '\n');
  console.log('PASS: Evidence Trail local PDF → citation/bibliography → explicit identity → immutable excerpts → bounded model interpretation → export/import quarantine/revalidation; fail-closed resolver/model, stale query race, privacy, 1440/900 evidence.');
} catch (error) {
  await screenshot('failure').catch(() => {}); throw error;
} finally { await browser.close(); }
