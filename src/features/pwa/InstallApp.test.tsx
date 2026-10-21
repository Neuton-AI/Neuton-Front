import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallProvider } from './InstallProvider';
import { InstallAppButton, InstallAppPopover } from './InstallApp';

function renderInstall() {
  return render(
    <InstallProvider>
      <InstallAppButton />
      <InstallAppPopover />
    </InstallProvider>,
  );
}

function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome desktop');
});

describe('PWA installation', () => {
  it('keeps the Profile button visible without a native prompt and opens browser instructions', () => {
    renderInstall();
    expect(screen.queryByRole('complementary', { name: 'Install Neuton' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('dialog', { name: 'Install Neuton' })).toHaveTextContent('browser menu');
  });

  it('captures the browser event and consumes it once even with repeated clicks', async () => {
    renderInstall();
    const { event, prompt } = offerInstall();
    expect(event.defaultPrevented).toBe(true);
    const button = screen.getByRole('button', { name: 'Install app' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('remembers Not now across remounts while keeping Profile installation available', () => {
    const view = renderInstall();
    offerInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('complementary', { name: 'Install Neuton' })).not.toBeInTheDocument();
    view.unmount();
    renderInstall();
    offerInstall();
    expect(screen.queryByRole('complementary', { name: 'Install Neuton' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
  });

  it('suppresses the popover after native dismissal and allows a fresh browser event', async () => {
    renderInstall();
    offerInstall('dismissed');
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument(),
    );
    offerInstall();
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
  });

  it('hides both entry points when installed, including later browser events', () => {
    renderInstall();
    offerInstall();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    offerInstall();
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
  });

  it('does not prompt in standalone mode', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    renderInstall();
    offerInstall();
    expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();
  });

  it('shows actionable iOS instructions and closes them accessibly', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari');
    renderInstall();
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(screen.getByRole('dialog', { name: 'Install Neuton' })).toHaveTextContent(
      'Add to Home Screen',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles native prompt failures without leaving an unusable button', async () => {
    renderInstall();
    const { prompt } = offerInstall();
    prompt.mockRejectedValue(new Error('Browser refused'));
    fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('browser menu');
    expect(screen.getByRole('button', { name: 'Install app' })).toBeEnabled();
  });
});
