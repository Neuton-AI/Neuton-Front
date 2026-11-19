import { buildRecipe } from '@/test/factories/recipes.factory';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { RecipePicker } from './RecipePicker';

const cake = buildRecipe({ name: 'Honey Cake', imageUrl: '/cake.webp' });
const defaults = { recipes: [cake], loading: false, error: false, disabled: false, onAdd: vi.fn() };

it('dismisses on Escape and outside clicks, and leaves keyboard tab order intact', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<><p>Outside</p><RecipePicker {...defaults} onAdd={onAdd} /><button>Next</button></>);
  const trigger = screen.getByRole('button', { name: 'Add item' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(screen.getByText('Outside'));
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.tab();
  expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(onAdd).not.toHaveBeenCalled();
});

it('shows loading, error, empty and no-match states and reuses the preview fallback', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<RecipePicker {...defaults} loading recipes={[]} />);
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  expect(screen.getByText('Loading shop recipes…')).toBeInTheDocument();
  rerender(<RecipePicker {...defaults} error recipes={[]} />);
  expect(screen.getByText('Could not load shop recipes.')).toBeInTheDocument();
  rerender(<RecipePicker {...defaults} recipes={[]} />);
  expect(screen.getByText('No active, verified recipes yet.')).toBeInTheDocument();
  rerender(<RecipePicker {...defaults} />);
  const option = screen.getByRole('option', { name: 'Honey Cake' });
  const image = option.querySelector('img')!;
  expect(image).toHaveAttribute('src', '/cake.webp');
  fireEvent.error(image);
  expect(option.querySelector('img')).toBeNull();
  expect(option.querySelector('svg')).toBeInTheDocument();
  await user.type(screen.getByRole('combobox'), 'pie');
  expect(screen.getByText('No matching recipes.')).toBeInTheDocument();
  expect(screen.getByText('0 recipes')).toBeInTheDocument();
});

it('reveals and focuses Add item after closing the picker on selection', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  const reveal = vi.fn(() => expect(screen.queryByRole('listbox')).toBeNull());
  render(<RecipePicker {...defaults} onAdd={onAdd} />);
  const trigger = screen.getByRole('button', { name: 'Add item' });
  Object.defineProperty(trigger, 'scrollIntoView', { value: reveal });
  await user.click(trigger);
  await user.click(screen.getByRole('option', { name: 'Honey Cake' }));
  expect(onAdd).toHaveBeenCalledWith(cake);
  expect(reveal).toHaveBeenCalledWith({ block: 'nearest' });
  expect(trigger).toHaveFocus();
});
