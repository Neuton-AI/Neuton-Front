import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '../test/render';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('tells the visitor the page is missing', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('offers a way back to the dashboard', () => {
    renderWithRouter(<NotFoundPage />);

    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
