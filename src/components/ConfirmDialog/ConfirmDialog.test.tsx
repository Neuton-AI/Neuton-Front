import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { renderWithRouter } from '@/test/render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/**
 * The delete confirmation is the last thing between a tap and an irreversible
 * action, so what it promises matters: it names itself for assistive tech,
 * dismisses on Escape and on a scrim tap without confirming, traps focus, and
 * only fires onConfirm from the destructive button.
 */

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const result = renderWithRouter(
    <ConfirmDialog
      open
      title="Delete this order?"
      description="It stays on your records."
      confirmLabel="Delete order"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel, ...result };
}

describe('ConfirmDialog', () => {
  it('is a labelled modal dialog', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Delete this order?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('It stays on your records.')).toBeInTheDocument();
  });

  it('renders nothing at all when closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('confirms from the destructive button', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete order' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels without confirming', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes when the scrim is tapped', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('lands focus on Cancel so the destructive button is not a stray Enter away', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('locks background scroll while open and restores it on unmount', () => {
    const { unmount } = renderDialog();

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('wraps focus from the last control back to the first', async () => {
    const user = userEvent.setup();
    renderDialog();

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Delete order' });

    confirm.focus();
    await user.tab();

    // Focus must not escape the dialog into the page behind it.
    expect(cancel).toHaveFocus();
  });
});
