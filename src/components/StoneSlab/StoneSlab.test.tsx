import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UIProvider } from '../../contexts/UIContext';
import type { Paragraph } from '../../types';
import en from '../../i18n/locales/en';
import zhCN from '../../i18n/locales/zh-CN';
import StoneSlab from './StoneSlab';

const paragraph: Paragraph = {
  id: 'para-stone',
  order: 1,
  content: '<p>Academic prose about evidence, interpretation, and careful revision.</p>',
  annotations: [],
  citations: [],
};

function renderSlab(options?: { onDelete?: (id: string) => void }) {
  const onDelete = options?.onDelete ?? vi.fn<(id: string) => void>();
  const onUpdate = vi.fn<(content: string) => void>();
  const onAddAnnotation = vi.fn<(paragraphId: string) => void>();

  function Harness() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <UIProvider>
        <StoneSlab
          paragraph={paragraph}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddAnnotation={onAddAnnotation}
          isSelected={selectedId === paragraph.id}
          onSelect={setSelectedId}
        />
      </UIProvider>
    );
  }

  return { ...render(<Harness />), onDelete, onUpdate, onAddAnnotation };
}

describe('StoneSlab V2', () => {
  it('provides named editor and toolbar controls with explicit format state', async () => {
    renderSlab();

    expect(await screen.findByRole('textbox', { name: 'Paragraph 1 editor' })).toHaveAttribute(
      'aria-multiline',
      'true'
    );
    expect(screen.getByRole('button', { name: '+ Annotation' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Delete stone slab 1' })).toHaveAttribute(
      'type',
      'button'
    );
  });

  it('keeps selected and editing states distinct and semantic', async () => {
    renderSlab();
    const slab = screen.getByTestId('stone-slab-para-stone');
    const editor = await screen.findByRole('textbox', { name: 'Paragraph 1 editor' });

    expect(slab).toHaveAttribute('data-selected', 'false');
    expect(slab).toHaveAttribute('data-editing', 'false');

    fireEvent.pointerDown(slab);
    await waitFor(() => expect(slab).toHaveAttribute('aria-current', 'true'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(slab).toHaveAttribute('data-editing', 'false');

    fireEvent.focus(editor);
    await waitFor(() => expect(slab).toHaveAttribute('data-editing', 'true'));
  });

  it('exposes active bold state after toolbar activation', async () => {
    renderSlab();
    const bold = await screen.findByRole('button', { name: 'Bold' });

    fireEvent.click(bold);

    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
  });

  it('does not delete before confirmation and restores focus after Escape', async () => {
    const onDelete = vi.fn<(id: string) => void>();
    renderSlab({ onDelete });
    const deleteButton = await screen.findByRole('button', { name: 'Delete stone slab 1' });
    deleteButton.focus();

    fireEvent.click(deleteButton);
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete stone slab 1?' });
    expect(onDelete).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('Academic prose about evidence');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    fireEvent.keyDown(dialog.parentElement as HTMLElement, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(deleteButton).toHaveFocus());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('traps confirmation focus and deletes exactly once after explicit confirmation', async () => {
    const onDelete = vi.fn<(id: string) => void>();
    renderSlab({ onDelete });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete stone slab 1' }));

    const dialog = await screen.findByRole('alertdialog');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirmDelete = screen.getByRole('button', { name: 'Delete' });

    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog.parentElement as HTMLElement, { key: 'Tab', shiftKey: true });
    expect(confirmDelete).toHaveFocus();
    fireEvent.keyDown(dialog.parentElement as HTMLElement, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.click(confirmDelete);
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(onDelete).toHaveBeenCalledWith('para-stone');
  });

  it('keeps the required StoneSlab copy available in both locale bundles', () => {
    expect(en.editor.slabSelectedLabel).toContain('selected');
    expect(en.confirm.deleteSlabMessage).toContain('{{excerpt}}');
    expect(zhCN.editor.slabSelectedLabel).toContain('已选中');
    expect(zhCN.confirm.deleteSlabMessage).toContain('{{excerpt}}');
  });
});
