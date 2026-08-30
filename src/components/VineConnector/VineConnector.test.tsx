import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VineConnector from './VineConnector';

describe('VineConnector', () => {
  it('is decorative, bounded, and non-interactive', () => {
    render(<VineConnector fromId="paragraph-1" toId="paragraph-2" />);
    const connector = screen.getByTestId('vine-connector');
    const svg = connector.querySelector('svg');
    expect(connector).toHaveAttribute('aria-hidden', 'true');
    expect(connector).toHaveAttribute('data-filled-area-ratio', '0.0215');
    expect(svg).toHaveAttribute('viewBox', '0 0 160 40');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(connector.querySelectorAll('[data-testid="vine-leaf"]')).toHaveLength(2);
    expect(connector.querySelector('linearGradient')).not.toBeInTheDocument();
  });

  it('uses the frozen stroke weights and leaf dimensions', () => {
    const { container } = render(<VineConnector fromId="a" toId="b" />);
    expect(container.querySelector('ellipse')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="vine-leaf"] > path')).toHaveLength(4);
    expect(container.querySelectorAll('path')).toHaveLength(7);
  });
});
