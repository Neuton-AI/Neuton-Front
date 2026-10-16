import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Layout } from './Layout';
it('renders required content and optional actions and navigation in order', () => {
  const { rerender } = render(
    <Layout
      mainContent={<main>Content</main>}
      actions={<button>Add</button>}
      footer={<nav>Navigation</nav>}
    />,
  );
  expect(screen.getByRole('main')).toHaveTextContent('Content');
  expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  expect(screen.getByRole('navigation')).toHaveTextContent('Navigation');
  rerender(<Layout mainContent={<main>Only content</main>} />);
  expect(screen.queryByRole('navigation')).toBeNull();
});
