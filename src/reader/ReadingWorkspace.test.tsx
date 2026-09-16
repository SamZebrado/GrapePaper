import { webcrypto } from 'node:crypto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingWorkspace from './ReadingWorkspace';
import GrapeApplication from '../GrapeApplication';
import { digest, PROGRESS_KEY } from './session';
import { listenForHandoffs, routeHandoff } from './handoffChannel';
import type { ZoteroHandoff } from './protocol';

vi.mock('../App', () => ({ default: () => <div>Notes editor</div> }));
vi.mock('./session', async importOriginal => {
  const original = await importOriginal<typeof import('./session')>();
  return { ...original, digest: vi.fn(original.digest) };
});
vi.mock('./handoffChannel', () => ({
  listenForHandoffs: vi.fn(() => vi.fn()),
  routeHandoff: vi.fn(async () => false),
}));

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockReset();
  vi.mocked(localStorage.removeItem).mockReset();
  vi.mocked(listenForHandoffs).mockClear();
  vi.mocked(routeHandoff).mockResolvedValue(false);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function paste(text: string, title = 'The same paper') {
  fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('英文或中文选段'), { target: { value: text } });
  fireEvent.click(screen.getByText('开始伴读'));
  await waitFor(() => expect(screen.getByRole('button', { name: '✓ 我读过了' })).toBeEnabled());
}
const handoff: ZoteroHandoff = {
  version: 1, source: 'zotero', selection: { text: 'An incoming Zotero passage', page: 2 }, document: { title: 'Incoming paper' },
};

describe('reading workspace continuity', () => {
  it('keeps an unsaved reading selection and confirmation through a notes round trip', async () => {
    render(<GrapeApplication incoming={null} />);
    fireEvent.click(screen.getByRole('button', { name: '先试读一页示例 →' }));
    fireEvent.click(screen.getAllByRole('button', { name: '伴读这一段 →' })[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: '✓ 我读过了' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '✓ 我读过了' }));
    fireEvent.click(screen.getByRole('button', { name: '葡萄笔记' }));
    await screen.findByText('Notes editor');
    fireEvent.click(screen.getByRole('button', { name: '文献伴读' }));
    expect(screen.getByRole('button', { name: '✓ 已确认读过' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'The paragraph and the paper' })).toBeVisible();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('accumulates confirmations across different pasted passages from one titled paper', async () => {
    render(<ReadingWorkspace />);
    for (const [index, passage] of ['First passage', 'Second passage', 'Third passage'].entries()) {
      await paste(passage);
      expect(screen.queryByRole('status', { name: '阅读间奏' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '✓ 我读过了' }));
      if (index < 2) expect(screen.queryByRole('status', { name: '阅读间奏' })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('status', { name: '阅读间奏' })).toBeVisible();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('keeps source provenance in the API request and clears it for a different paper', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ explanation: 'A reading explanation' }) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ReadingWorkspace />);
    await paste('First selection');
    fireEvent.change(screen.getByLabelText('参考文献与来源原文'), { target: { value: 'An actual source excerpt.' } });
    fireEvent.change(screen.getByLabelText('来源标题（可选）'), { target: { value: 'The source study' } });
    fireEvent.change(screen.getByLabelText('来源链接（可选）'), { target: { value: 'https://doi.org/10.1234/source' } });
    fireEvent.change(screen.getByLabelText('页码或章节（可选）'), { target: { value: 'p. 4' } });
    fireEvent.click(screen.getByRole('button', { name: '生成中文伴读' }));
    await screen.findByText('A reading explanation');
    const first = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(first.references).toEqual([{ text: 'An actual source excerpt.', title: 'The source study', url: 'https://doi.org/10.1234/source', locator: 'p. 4' }]);
    await paste('Another selection', 'Different paper');
    expect(screen.getByLabelText('来源链接（可选）')).toHaveValue('');
    expect(screen.getByLabelText('参考文献与来源原文')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '生成中文伴读' }));
    await screen.findByText('A reading explanation');
    const second = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(second.references).toEqual([]);
  });

  it('does not claim persistent markers were cleared after storage failure', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, documents: {} }));
    render(<ReadingWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: '阅读偏好' }));
    expect(screen.getByRole('checkbox', { name: '在这台设备记住阅读标记' })).toBeChecked();
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => { throw new Error('Quota exceeded'); });
    fireEvent.click(screen.getByRole('button', { name: '清空阅读标记' }));
    expect(screen.getByRole('status')).toHaveTextContent('无法更新以前保存的标记');
    expect(localStorage.setItem).toHaveBeenCalledWith(PROGRESS_KEY, JSON.stringify({ version: 1, documents: {} }));
  });

  it('ignores a slow handoff identity after the reader chooses the demo', async () => {
    let complete: (id: string) => void = () => {};
    vi.mocked(digest).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    render(<ReadingWorkspace handoff={handoff} />);
    fireEvent.click(screen.getByRole('button', { name: '先试读一页示例 →' }));
    await act(async () => { complete('a'.repeat(64)); });
    expect(screen.getByRole('heading', { name: 'The paragraph and the paper' })).toBeVisible();
    expect(screen.queryByText('An incoming Zotero passage')).not.toBeInTheDocument();
  });

  it('ignores a slow pasted document after another document was chosen', async () => {
    let complete: (id: string) => void = () => {};
    vi.mocked(digest).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    render(<ReadingWorkspace />);
    fireEvent.change(screen.getByLabelText('英文或中文选段'), { target: { value: 'An older pasted selection' } });
    fireEvent.click(screen.getByText('开始伴读'));
    fireEvent.click(screen.getByRole('button', { name: '先试读一页示例 →' }));
    await act(async () => { complete('a'.repeat(64)); });
    expect(screen.getByRole('heading', { name: 'The paragraph and the paper' })).toBeVisible();
    expect(screen.queryByText('An older pasted selection', { selector: 'blockquote' })).not.toBeInTheDocument();
  });

  it('accepts later handoffs after choosing to read in a forwarded tab', async () => {
    vi.mocked(routeHandoff).mockResolvedValueOnce(true);
    render(<GrapeApplication incoming={handoff} />);
    fireEvent.click(await screen.findByRole('button', { name: '也在这里阅读' }));
    await waitFor(() => expect(listenForHandoffs).toHaveBeenCalledOnce());
    const accept = vi.mocked(listenForHandoffs).mock.calls[0][0];
    await act(async () => { accept({ ...handoff, selection: { text: 'Next selection in this tab', page: 3 } }); });
    await waitFor(() => expect(screen.getByText('Next selection in this tab', { selector: 'blockquote' })).toBeVisible());
  });
});
