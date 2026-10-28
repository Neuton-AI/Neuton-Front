import { Sheet, SheetBadge, SheetSection } from '@/components/Sheet/Sheet';
import { useSheetClose } from '@/components/Sheet/Sheet.module';
import { renderWithRouter } from '@/test/render';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

/**
 * Every detail screen in the app is a Sheet. Two things it promises are worth
 * protecting: it names itself for assistive tech, and it dismisses on Escape.
 * The third — `useSheetClose` falling back to a real route instead of
 * `navigate(-1)` — is the only reason a deep link does not dead-end.
 */

describe('Sheet', () => {
  function swipe(target: Element, x = 0, y = window.innerHeight * 0.15 + 1) {
    fireEvent.touchStart(target, {
      touches: [{ identifier: 1, clientX: 100, clientY: 100 }],
    });
    fireEvent.touchMove(target, {
      touches: [{ identifier: 1, clientX: 100 + x, clientY: 100 + y }],
    });
    fireEvent.touchEnd(target, {
      touches: [],
      changedTouches: [{ identifier: 1, clientX: 100 + x, clientY: 100 + y }],
    });
  }

  function renderDraggable() {
    const onClose = vi.fn();
    renderWithRouter(
      <Sheet open onClose={onClose} label="Details">
        <div style={{ overflowY: 'auto' }} data-testid="scroll-content">
          <p>Details content</p>
          <button type="button">Edit</button>
        </div>
      </Sheet>,
    );
    return { onClose, content: screen.getByTestId('scroll-content') };
  }

  it.each([
    [400, 59, false],
    [400, 60, false],
    [400, 61, true],
    [800, 119, false],
    [800, 120, false],
    [800, 121, true],
    [1200, 180, false],
    [1200, 181, true],
  ])('uses more than 15%% of a %ipx viewport for a %ipx pull', (height, distance, dismiss) => {
    vi.stubGlobal('innerHeight', height);
    const { onClose, content } = renderDraggable();
    swipe(content, 0, distance);
    expect(onClose).toHaveBeenCalledTimes(dismiss ? 1 : 0);
    expect(screen.getByRole('dialog').style.getPropertyValue('--sheet-drag-y')).toBe('0px');
  });

  it('dismisses when content is swiped down from the top', () => {
    const { onClose } = renderDraggable();
    swipe(screen.getByText('Details content'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserves scrolling when the content starts below the top', () => {
    const { onClose, content } = renderDraggable();
    content.scrollTop = 100;
    swipe(screen.getByText('Details content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismisses from the handle even when content is scrolled', () => {
    const { onClose, content } = renderDraggable();
    content.scrollTop = 100;
    swipe(screen.getByRole('dialog').querySelector('[data-sheet-drag-handle]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    [0, 30],
    [120, 20],
    [0, -120],
  ])('keeps short or non-downward gestures open (%i, %i)', (x, y) => {
    const { onClose } = renderDraggable();
    swipe(screen.getByText('Details content'), x, y);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores the sheet when a touch gesture is cancelled', () => {
    const { onClose, content } = renderDraggable();
    fireEvent.touchStart(content, {
      touches: [{ identifier: 1, clientX: 100, clientY: 100 }],
    });
    fireEvent.touchMove(content, {
      touches: [{ identifier: 1, clientX: 100, clientY: 220 }],
    });
    fireEvent.touchCancel(content);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').style.getPropertyValue('--sheet-drag-y')).toBe('0px');
  });

  it('leaves controls usable instead of starting a drag', () => {
    const { onClose } = renderDraggable();
    swipe(screen.getByRole('button', { name: 'Edit' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not take over a content scroll that reaches the top mid-gesture', () => {
    const { onClose, content } = renderDraggable();
    content.scrollTop = 20;
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    content.scrollTop = 0;
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 250 }] });
    fireEvent.touchEnd(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels a drag when a second finger joins', () => {
    const { onClose, content } = renderDraggable();
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 220 }] });
    fireEvent.touchStart(content, {
      touches: [
        { clientX: 100, clientY: 220 },
        { clientX: 200, clientY: 220 },
      ],
    });
    fireEvent.touchEnd(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dismiss the sheet underneath a nested dialog', () => {
    const onClose = vi.fn();
    renderWithRouter(
      <Sheet open onClose={onClose} label="Details">
        <div role="dialog" aria-label="Confirm">
          <p>Confirmation content</p>
        </div>
      </Sheet>,
    );
    swipe(screen.getByText('Confirmation content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('follows the finger and returns to rest after a short pull', () => {
    const { onClose, content } = renderDraggable();
    fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 130 }] });
    expect(screen.getByRole('dialog').style.getPropertyValue('--sheet-drag-y')).toBe('30px');
    fireEvent.touchEnd(content);
    expect(screen.getByRole('dialog').style.getPropertyValue('--sheet-drag-y')).toBe('0px');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismisses with a mouse drag released outside the sheet', () => {
    const { onClose, content } = renderDraggable();
    const endY = 100 + window.innerHeight * 0.15 + 1;
    fireEvent.mouseDown(content, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: endY });
    fireEvent.mouseUp(window, { clientX: 100, clientY: endY });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

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
    renderWithRouter(<CloseHarness fallback="/catalog" />, {
      initialEntries: ['/orders', '/catalog/receipts/r1'],
      initialIndex: 1,
    });

    // Force a history entry behind the sheet, then go forward again.
    window.history.pushState({ idx: 4 }, '');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Exact match: it must not have taken the fallback path.
    expect(screen.getByTestId('where').textContent).toBe('/orders');
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
