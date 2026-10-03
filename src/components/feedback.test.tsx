import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, InlineNotice, Skeleton, Spinner } from './feedback';

/**
 * These primitives are where the Front states what a screen currently is
 * (loading / empty / failed) and, critically, whether a screen reader and a
 * keyboard user can perceive it. `role="alert"` and `role="status"` are the
 * only thing announcing an async outcome, so they are worth pinning.
 */

describe('Spinner', () => {
  it('is hidden from assistive tech — it conveys no information', () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Skeleton', () => {
  it('is aria-hidden, because a loading placeholder is not content', () => {
    const { container } = render(<Skeleton className="h-24" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ErrorState', () => {
  it('announces itself as an alert', () => {
    render(<ErrorState message="Could not load your shops" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your shops');
  });

  it('offers no retry affordance when no handler is given', () => {
    render(<ErrorState message="Boom" />);

    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('calls onRetry when the retry button is pressed', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders the title, body and an optional action', () => {
    render(
      <EmptyState
        title="No recipes yet"
        body="Scan a recipe card and Neuton will draft it."
        action={<button type="button">Add a recipe</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No recipes yet' })).toBeInTheDocument();
    expect(screen.getByText('Scan a recipe card and Neuton will draft it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a recipe' })).toBeInTheDocument();
  });

  it('omits the action slot entirely when no action is supplied', () => {
    render(<EmptyState title="Inventory is empty" body="Upload a supplier receipt." />);

    expect(screen.getByRole('heading', { name: 'Inventory is empty' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('InlineNotice', () => {
  it('is a polite status region for the info and success tones', () => {
    render(<InlineNotice>Sending the file to storage…</InlineNotice>);
    expect(screen.getByRole('status')).toHaveTextContent('Sending the file to storage…');

    render(<InlineNotice tone="success">Done</InlineNotice>);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('keeps the same role for the error tone', () => {
    render(<InlineNotice tone="error">Storage upload failed</InlineNotice>);

    expect(screen.getByRole('status')).toHaveTextContent('Storage upload failed');
  });
});
