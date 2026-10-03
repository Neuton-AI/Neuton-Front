import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../test/render';
import { BottomNav } from './BottomNav';
import { Fab, useFabNavigation } from './Fab';
import { PageHeader } from './PageHeader';
import { StatCard } from './StatCard';

/**
 * These are the persistent navigation chrome. The promises worth protecting
 * are structural: the FAB only offers actions the caller actually wired up, it
 * dismisses on Escape, BottomNav marks the active tab for assistive tech, and
 * StatCard never renders a half-built value.
 */

describe('Fab', () => {
  it('starts collapsed with a single button and no expanded state', () => {
    renderWithRouter(<Fab />);

    const trigger = screen.getByRole('button', { name: 'Open actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Scan with camera' })).toBeNull();
  });

  it('reveals an action only when the caller supplied its handler', async () => {
    // The actions list is filtered on onClick, so a missing handler means the
    // action must not appear as a dead button.
    const user = userEvent.setup();
    renderWithRouter(<Fab onCapture={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));

    expect(screen.getByRole('button', { name: /Scan with camera/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Upload file/ })).toBeNull();
  });

  it('flips aria-expanded and relabels itself while open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Fab onCapture={vi.fn()} onUploadFile={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));

    expect(screen.getByRole('button', { name: 'Close actions' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('runs the action handler once and closes itself', async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    renderWithRouter(<Fab onCapture={onCapture} />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.click(screen.getByRole('button', { name: /Scan with camera/ }));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Open actions' })).toBeInTheDocument();
  });

  it('dismisses on Escape', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Fab onCapture={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: /Scan with camera/ })).toBeNull();
  });

  it('dismisses when a pointer goes down outside the FAB', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <div>
        <Fab onCapture={vi.fn()} />
        <button type="button">Somewhere else</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    expect(screen.getByRole('button', { name: /Scan with camera/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Somewhere else' }));

    expect(screen.queryByRole('button', { name: /Scan with camera/ })).toBeNull();
  });
});

describe('useFabNavigation', () => {
  function Harness() {
    const { onCapture, onUploadFile } = useFabNavigation();
    const { pathname, search } = useLocation();
    return (
      <>
        <button type="button" onClick={onCapture}>
          camera
        </button>
        <button type="button" onClick={onUploadFile}>
          file
        </button>
        <output data-testid="where">
          {pathname}
          {search}
        </output>
      </>
    );
  }

  it('routes camera and file to the capture flow with the right source', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Harness />, { route: '/catalog' });

    await user.click(screen.getByRole('button', { name: 'camera' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/capture?source=camera');

    await user.click(screen.getByRole('button', { name: 'file' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/capture?source=file');
  });
});

describe('BottomNav', () => {
  it('is a labelled primary navigation landmark', () => {
    renderWithRouter(<BottomNav />, { route: '/dashboard' });

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('renders all four destinations as real links', () => {
    renderWithRouter(<BottomNav />, { route: '/dashboard' });

    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/dashboard',
      '/catalog',
      '/orders',
      '/profile',
    ]);
  });

  it('marks exactly the active tab with aria-current="page"', () => {
    renderWithRouter(<BottomNav />, { route: '/orders' });

    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', '/orders');
  });
});

describe('PageHeader', () => {
  it('renders the eyebrow, title and action', () => {
    renderWithRouter(
      <PageHeader
        eyebrow="Monday, 2 March"
        title="Catalog"
        action={<button type="button">Add item</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Catalog' })).toBeInTheDocument();
    expect(screen.getByText('Monday, 2 March')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('omits the back button when no handler is passed', () => {
    renderWithRouter(<PageHeader title="Dashboard" />);

    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });

  it('calls onBack from an icon-only button with a name', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithRouter(<PageHeader title="Receipt" onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('StatCard', () => {
  it('renders the label and value', () => {
    renderWithRouter(<StatCard label="Revenue" value="£1,204.50" />);

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('£1,204.50')).toBeInTheDocument();
  });

  it('renders the middle slot between label and value', () => {
    renderWithRouter(
      <StatCard label="Avg order" value="£18.40" middle={<button type="button">Toggle</button>} />,
    );

    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('leaves out the value paragraph entirely when no value is supplied', () => {
    const { container } = renderWithRouter(<StatCard label="Revenue" />);

    // An empty value must not render a stray "undefined" or "NaN".
    expect(container.textContent).toBe('Revenue');
  });

  it('renders the sub line only when given one', () => {
    const withSub = renderWithRouter(<StatCard label="Revenue" value="£0" sub="+12% vs last week" />);
    expect(withSub.container.textContent).toContain('+12% vs last week');

    const withoutSub = renderWithRouter(<StatCard label="Revenue" value="£0" />);
    expect(withoutSub.container.querySelectorAll('p')).toHaveLength(2);
  });
});
