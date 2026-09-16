import { describe, it, expect } from 'vitest';
import { confirmPassage, emptySession, parseProgress } from './session';
import { companionPrompt, companionRequest, parseHandoff, parseReply, safeUrl } from './protocol';

describe('reading without completion pressure', () => {
  it('counts only distinct explicit confirmations and unlocks at the chosen cadence', () => {
    let state = emptySession();
    for (const key of ['a','b']) { const next = confirmPassage(state,key,3); expect(next.unlock).toBe(false); state=next.session; }
    expect(confirmPassage(state,'a',3).session).toBe(state);
    const next = confirmPassage(state,'c',3); expect(next.unlock).toBe(true); expect(next.session.sinceCard).toBe(0);
    expect(confirmPassage(next.session,'c',3).unlock).toBe(false);
  });
  it('supports quiet mode with no cards', () => { expect(confirmPassage({confirmed:[],sinceCard:9},'x',0).unlock).toBe(false); });
  it('rejects malformed stored progress and never restores passage content', () => {
    expect(parseProgress('{')).toEqual({version:1,documents:{}});
    const parsed=parseProgress(JSON.stringify({version:1,documents:{doc:{confirmed:['private text','a'.repeat(64)],sinceCard:2,text:'secret'}}}));
    expect(parsed.documents.doc).toEqual({confirmed:['a'.repeat(64)],sinceCard:2});
    expect(JSON.stringify(parsed)).not.toContain('secret');
  });
});
describe('external companion input',()=>{
  it('preserves explicit source provenance for citations and story cards', () => {
    const paper = { id:'local-pdf', title:'Current paper', pages:2 };
    const selection = { text:'Selected text', page:1, context:'Page context', anchor:'' };
    const source = { title:'Source study', url:'https://doi.org/10.1234/study', locator:'p. 4, Experiment 1' };
    const request = companionRequest(paper, selection, 'An actual supplied source excerpt.', source);
    expect(request.references).toEqual([{ text:'An actual supplied source excerpt.', ...source }]);
    expect(companionPrompt(paper, selection, 'An actual supplied source excerpt.', source)).toContain(source.url);
    // A bibliography's first link is never silently assigned to the whole list.
    expect(companionRequest(paper, selection, 'Paper A https://doi.org/10.1234/a\nPaper B').references[0].url).toBe('');
    expect(companionRequest(paper, selection, 'Excerpt', {url:'javascript:alert(1)'}).references[0].url).toBe('');
  });
  it('accepts minimal Zotero handoff and strips unexpected fields',()=>{
    const payload={version:1,source:'zotero',selection:{text:'中文 selection',page:2},document:{title:'Paper',path:'/private/a.pdf'}};
    const parsed=parseHandoff('#grapepaper='+encodeURIComponent(JSON.stringify(payload)));
    expect(parsed?.selection.text).toBe('中文 selection'); expect(parsed?.document).not.toHaveProperty('path');
    expect(parseHandoff('#grapepaper='+encodeURIComponent(JSON.stringify({...payload,version:2})))).toBeNull();
  });
  it('rejects active or credentialed links and story without source',()=>{
    expect(safeUrl('javascript:alert(1)')).toBe(''); expect(safeUrl('https://user:pass@example.org')).toBe('');
    const reply=parseReply({explanation:'说明',stories:[{title:'Rumor',body:'unsupported',sourceUrl:'javascript:alert(1)'}]});
    expect(reply.stories).toEqual([]);
  });
});
