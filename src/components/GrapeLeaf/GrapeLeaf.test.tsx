import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GrapeLeaf from './GrapeLeaf';
import { useDocumentStore } from '../../stores/documentStore';
import { UIProvider } from '../../contexts/UIContext';
import type { Annotation } from '../../types';
import en from '../../i18n/locales/en';
import zhCN from '../../i18n/locales/zh-CN';
import { openContextSurface } from '../../utils/contextSurface';

vi.mock('../../stores/documentStore');

const mockUseDocumentStore = useDocumentStore as unknown as ReturnType<typeof vi.fn>;

describe('GrapeLeaf V2', () => {
  let annotation: Annotation;
  let onOpenChat: ReturnType<typeof vi.fn<() => void>>;
  let editAnnotation: ReturnType<typeof vi.fn<(id: string, content: string) => void>>;
  let deleteAnnotation: ReturnType<typeof vi.fn<(id: string) => void>>;
  let mockState: {
    editAnnotation: typeof editAnnotation;
    deleteAnnotation: typeof deleteAnnotation;
    activeAnnotationId: string | null;
  };

  beforeEach(() => {
    annotation = {
      id: 'annot-1',
      paragraphId: 'para-1',
      content: 'Test annotation content',
      createdAt: Date.now(),
      chatThreads: [
        {
          id: 'thread-1',
          messages: [
            { id: 'msg-1', role: 'user', content: 'Question', createdAt: Date.now() },
            { id: 'msg-2', role: 'assistant', content: 'Answer', createdAt: Date.now() },
          ],
        },
      ],
    };
    onOpenChat = vi.fn<() => void>();
    editAnnotation = vi.fn<(id: string, content: string) => void>();
    deleteAnnotation = vi.fn<(id: string) => void>();
    mockState = { editAnnotation, deleteAnnotation, activeAnnotationId: null };
    mockUseDocumentStore.mockImplementation((selector: (state: typeof mockState) => unknown) =>
      selector(mockState)
    );
  });

  function renderLeaf(currentAnnotation = annotation) {
    return render(
      <UIProvider>
        <GrapeLeaf annotation={currentAnnotation} onOpenChat={onOpenChat} />
      </UIProvider>
    );
  }

  async function expandLeaf() {
    const trigger = screen.getByRole('button', {
      name: /Expand annotation: Test annotation content\. 2 discussion messages\./,
    });
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    return screen.findByRole('region', { name: 'Expanded annotation leaf' });
  }

  it('uses a named compact button and exposes the discussion count', () => {
    renderLeaf();
    const trigger = screen.getByRole('button', {
      name: /Expand annotation: Test annotation content\. 2 discussion messages\./,
    });
    expect(trigger).toHaveAttribute('aria-controls');
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('expands into explicit discussion, edit, delete, and collapse controls', async () => {
    renderLeaf();
    await expandLeaf();
    expect(screen.getByRole('button', { name: 'Open discussion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse annotation' })).toBeInTheDocument();
  });

  it('opens chat only from the explicit discussion control', async () => {
    renderLeaf();
    await expandLeaf();
    fireEvent.click(screen.getByTestId('annotation-leaf-content'));
    expect(onOpenChat).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open discussion' }));
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('marks chat-open state with text and aria-expanded', async () => {
    mockState.activeAnnotationId = 'annot-1';
    renderLeaf();
    const panel = await expandLeaf();
    expect(panel).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByText('Discussion open').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Discussion open' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('labels editing, disables whitespace save, and saves trimmed content', async () => {
    renderLeaf();
    await expandLeaf();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const textarea = await screen.findByRole('textbox', { name: 'Annotation text' });
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(save).toBeDisabled();
    fireEvent.change(textarea, { target: { value: '  Revised annotation  ' } });
    fireEvent.click(save);
    expect(editAnnotation).toHaveBeenCalledWith('annot-1', 'Revised annotation');
  });

  it('cancels editing with Escape and returns focus to Edit', async () => {
    renderLeaf();
    await expandLeaf();
    const edit = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(edit);
    const textarea = await screen.findByRole('textbox', { name: 'Annotation text' });
    fireEvent.change(textarea, { target: { value: 'Unsaved' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus());
    expect(editAnnotation).not.toHaveBeenCalled();
  });

  it('collapses with Escape and restores focus to the compact trigger', async () => {
    renderLeaf();
    const panel = await expandLeaf();
    fireEvent.keyDown(panel, { key: 'Escape' });
    const compact = await screen.findByRole('button', { name: /Expand annotation:/ });
    await waitFor(() => expect(compact).toHaveFocus());
  });

  it('collapses when a competing citation surface opens', async () => {
    renderLeaf();
    await expandLeaf();
    act(() => openContextSurface({ type: 'citation', ownerId: 'citation-1' }));
    expect(await screen.findByRole('button', { name: /Expand annotation:/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Expanded annotation leaf' })).not.toBeInTheDocument();
  });

  it('requires explicit delete confirmation', async () => {
    renderLeaf();
    await expandLeaf();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete annotation?' });
    expect(dialog).toHaveTextContent('Test annotation content');
    expect(deleteAnnotation).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(deleteAnnotation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const nextDialog = await screen.findByRole('alertdialog', { name: 'Delete annotation?' });
    fireEvent.click(within(nextDialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteAnnotation).toHaveBeenCalledTimes(1));
    expect(deleteAnnotation).toHaveBeenCalledWith('annot-1');
  });

  it('syncs external annotation updates when not editing', async () => {
    const { rerender } = renderLeaf();
    await expandLeaf();
    const updated = { ...annotation, content: 'Updated outside the leaf' };
    rerender(
      <UIProvider>
        <GrapeLeaf annotation={updated} onOpenChat={onOpenChat} />
      </UIProvider>
    );
    expect(await screen.findByText('Updated outside the leaf')).toBeInTheDocument();
  });

  it('keeps required leaf copy in both locale bundles', () => {
    expect(en.annotation.discussionOpen).toBe('Discussion open');
    expect(en.confirm.deleteAnnotationMessage).toContain('{{excerpt}}');
    expect(zhCN.annotation.discussionOpen).toBe('讨论已打开');
    expect(zhCN.confirm.deleteAnnotationMessage).toContain('{{excerpt}}');
  });
});
