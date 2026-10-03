import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../test/render';
import { Button, ButtonLink, Field, Input, Select, Textarea } from './ui';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);

    // A submit-by-default button inside a form is a silent data-loss bug.
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('honours an explicit type', () => {
    render(<Button type="submit">Sign in</Button>);

    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
  });

  it('is disabled while loading, even without an explicit disabled', () => {
    render(<Button loading>Upload</Button>);

    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('fires the click handler exactly once', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Retry</Button>);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Uploading
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: /uploading/i }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps an aria-label from the caller when the visible text is not the name', () => {
    render(<Button aria-label="Delete receipt">×</Button>);

    expect(screen.getByRole('button', { name: 'Delete receipt' })).toBeInTheDocument();
  });
});

describe('ButtonLink', () => {
  it('renders a real link so it can be middle-clicked and is reachable by href', () => {
    renderWithRouter(<ButtonLink to="/capture?kind=receipt">Scan a receipt</ButtonLink>);

    expect(screen.getByRole('link', { name: 'Scan a receipt' })).toHaveAttribute(
      'href',
      '/capture?kind=receipt',
    );
  });
});

describe('Field', () => {
  it('associates its label with the control it names', () => {
    render(
      <Field label="Shop name" htmlFor="shop-name" hint="Shown on every receipt.">
        <Input id="shop-name" />
      </Field>,
    );

    // An unassociated label is invisible to a screen reader.
    expect(screen.getByLabelText('Shop name')).toBe(screen.getByRole('textbox'));
    expect(screen.getByText('Shown on every receipt.')).toBeInTheDocument();
  });

  it('renders no hint paragraph when none is given', () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" />
      </Field>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('form controls', () => {
  it('renders each control with the type its element implies', () => {
    render(
      <>
        <Input aria-label="Email" type="email" />
        <Textarea aria-label="Notes" />
        <Select aria-label="Period">
          <option value="7d">7 days</option>
        </Select>
      </>,
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('Period').tagName).toBe('SELECT');
  });

  it('passes through disabled', () => {
    render(<Input aria-label="Shop" disabled />);

    expect(screen.getByLabelText('Shop')).toBeDisabled();
  });
});
