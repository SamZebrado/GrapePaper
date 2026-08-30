import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../types';
import DewdropCitation from './DewdropCitation';
import { openContextSurface } from '../../utils/contextSurface';

const citation: Citation = {
  id: 'citation-1',
  key: '[1]',
  authors: 'Ada Author & Lin Scholar',
  title: 'A careful study of quiet academic interfaces',
  year: '2026',
  abstract: 'A'.repeat(320),
  doi: '10.1000/example',
  zoteroKey: 'SHOULD_NOT_RENDER',
};

describe('DewdropCitation', () => {
  it('uses a named semantic button with a controlled preview', () => {
    render(<DewdropCitation citation={citation} />);
    const trigger = screen.getByRole('button', { name: /Citation \[1\]/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-controls');

    fireEvent.focus(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /Citation \[1\] preview/ })).toBeInTheDocument();
  });

  it('opens on hover and closes after pointer departure', () => {
    vi.useFakeTimers();
    render(<DewdropCitation citation={citation} />);
    const wrapper = screen.getByRole('button', { name: /Citation \[1\]/ }).parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    act(() => vi.advanceTimersByTime(81));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('pins with activation and closes with Escape', () => {
    render(<DewdropCitation citation={citation} />);
    const trigger = screen.getByRole('button', { name: /Citation \[1\]/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('pins with Enter and Space without relying on pointer activation', () => {
    render(<DewdropCitation citation={citation} />);
    const trigger = screen.getByRole('button', { name: /Citation \[1\]/ });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(trigger).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('exposes an operable DOI, the display-only boundary, and no Zotero action', () => {
    render(<DewdropCitation citation={citation} />);
    fireEvent.focus(screen.getByRole('button', { name: /Citation \[1\]/ }));
    const doi = screen.getByRole('link', { name: 'View DOI in a new tab' });
    expect(doi).toHaveAttribute('href', 'https://doi.org/10.1000/example');
    expect(doi).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /Zotero/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('citation-boundary-note')).toHaveTextContent(
      'Sample citation · Display only · Cannot be created, edited, deleted, or synced to Zotero in V2.',
    );
  });

  it('offers an explicit continuation control for a clamped abstract', () => {
    render(<DewdropCitation citation={citation} />);
    fireEvent.focus(screen.getByRole('button', { name: /Citation \[1\]/ }));
    const toggle = screen.getByRole('button', { name: 'Show full abstract' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits empty optional rows', () => {
    render(<DewdropCitation citation={{ id: 'citation-2', key: '[2]' }} />);
    fireEvent.focus(screen.getByRole('button', { name: /Citation \[2\]/ }));
    expect(screen.getByText('Untitled citation')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abstract/i })).not.toBeInTheDocument();
  });

  it('closes when a competing annotation surface opens', () => {
    render(<DewdropCitation citation={citation} />);
    const trigger = screen.getByRole('button', { name: /Citation \[1\]/ });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => openContextSurface({ type: 'annotation', ownerId: 'annot-1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
