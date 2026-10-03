import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../test/render';
import { Sheet, SheetBadge, SheetSection, useSheetClose } from './Sheet';

/**
 * Every detail screen in the app is a Sheet. Two things it promises are worth
 * protecting: it names itself for assistive tech, and it dismisses on Escape.
 * The third — `useSheetClose` falling back to a real route instead of
 * `navigate(-1)` — is the only reason a deep link does not dead-end.
 */

describe('Sheet', () => {
  it('is a labelled modal dialog', () => {
    renderWithRouter(
      <Sheet open onClose={vi.fn()} label="Receipt details">
        <p>Body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Receipt details' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders nothing at all when closed', () => {
    renderWithRouter(
      <Sheet open={false} onClose={vi.fn()} label="Receipt details">
        <p>Body</p>
      </Sheet>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <Sheet open onClose={onClose} label="Receipt details">
        <button type="button">Inside</button>
      </Sheet>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the scrim is tapped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <Sheet open onClose={onClose} label="Receipt details">
        <p>Body</p>
      </Sheet>,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks background scroll while open and restores it on unmount', () => {
    const { unmount } = renderWithRouter(
      <Sheet open onClose={vi.fn()} label="Receipt details">
        <p>Body</p>
      </Sheet>,
    );

    // Without this the list behind the sheet scrolls under the user's finger.
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('wraps focus from the last control back to the first', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Sheet open onClose={vi.fn()} label="Receipt details">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Sheet>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    await user.tab();

    // Focus must not escape the sheet into the page behind it.
    expect(first).toHaveFocus();
  });
});

/** Renders the close button plus the location it navigated to. */
function CloseHarness({ fallback }: { fallback: string }) {
  const close = useSheetClose(fallback);
  const location = useLocation();

  return (
    <>
      <button type="button" onClick={close}>
        Close
      </button>
      <output data-testid="where">
        {location.pathname}
        {location.search}
      </output>
    </>
  );
}

describe('useSheetClose', () => {
  it('falls back to the list route when the sheet was opened as a deep link', async () => {
    // A sheet loaded straight from a URL has no history behind it, so
    // navigate(-1) would leave the app entirely.
    const user = userEvent.setup();
    renderWithRouter(<CloseHarness fallback="/catalog?tab=receipts" />, {
      route: '/catalog/receipts/r1',
    });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/catalog?tab=receipts');
  });

  it('goes back rather than jumping to the fallback when history exists', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CloseHarness fallback="/catalog" />, { route: '/catalog/receipts/r1' });

    // Force a history entry behind the sheet, then go forward again.
    window.history.pushState({ idx: 4 }, '');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Exact match: it must not have taken the fallback path.
    expect(screen.getByTestId('where').textContent).toBe('/catalog/receipts/r1');
  });
});

describe('SheetSection and SheetBadge', () => {
  it('renders a section with its heading', () => {
    renderWithRouter(
      <SheetSection title="Line items">
        <p>2 items</p>
      </SheetSection>,
    );

    expect(screen.getByRole('heading', { name: 'Line items' })).toBeInTheDocument();
  });

  it('renders a badge with its text', () => {
    renderWithRouter(<SheetBadge tone="teal">Ingredients</SheetBadge>);

    expect(screen.getByText('Ingredients')).toBeInTheDocument();
  });
});
