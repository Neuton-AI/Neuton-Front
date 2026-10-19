import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeScanner } from './BarcodeScanner';

const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn<() => Promise<MediaStream>>();
const detect = vi.fn<() => Promise<{ rawValue: string }[]>>();
const formats = vi.fn<() => Promise<string[]>>();

class Detector {
  static getSupportedFormats = formats;
  detect = detect;
}

beforeEach(() => {
  stop.mockReset();
  getUserMedia.mockReset().mockResolvedValue(stream);
  detect.mockReset().mockResolvedValue([]);
  formats.mockReset().mockResolvedValue(['ean_13', 'upc_a']);
  vi.stubGlobal('BarcodeDetector', Detector);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
});

function enterBarcode(barcode = '7290000000001') {
  fireEvent.change(screen.getByLabelText('Or enter barcode'), {
    target: { value: barcode },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find price' }));
}

describe('BarcodeScanner', () => {
  it('keeps manual lookup available without a native barcode detector', async () => {
    vi.stubGlobal('BarcodeDetector', undefined);
    const onDetected = vi.fn();
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />);
    expect(await screen.findByText(/Live barcode scanning is unavailable/)).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    enterBarcode('012345678901');
    expect(onDetected).toHaveBeenCalledWith('012345678901');
    expect(screen.getByRole('button', { name: 'Find price' })).toBeDisabled();
  });

  it('shows a manual fallback after camera denial and validates input before lookup', async () => {
    getUserMedia.mockRejectedValue(new Error('denied'));
    const onDetected = vi.fn();
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />);
    expect(await screen.findByText(/Camera access is unavailable/)).toBeInTheDocument();
    enterBarcode('bad-code');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the 8–14 digits');
    expect(onDetected).not.toHaveBeenCalled();
    enterBarcode();
    expect(onDetected).toHaveBeenCalledOnce();
  });

  it('avoids requesting a camera when no supported retail formats are available', async () => {
    formats.mockResolvedValue(['qr_code']);
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/Live barcode scanning is unavailable/)).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('requests the rear camera, detects only once, and releases the camera immediately', async () => {
    detect.mockResolvedValue([{ rawValue: '7290000000001' }, { rawValue: '7290000000001' }]);
    const onDetected = vi.fn();
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />);
    await waitFor(() => expect(onDetected).toHaveBeenCalledOnce());
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    expect(onDetected).toHaveBeenCalledWith('7290000000001');
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Find price' })).toBeDisabled();
    expect(detect).toHaveBeenCalledOnce();
  });

  it('stops when busy and restarts after a failed lookup so another barcode can be submitted', async () => {
    const onDetected = vi.fn();
    const props = { onDetected, onClose: vi.fn() };
    const { rerender } = render(<BarcodeScanner {...props} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    enterBarcode();
    expect(stop).toHaveBeenCalledOnce();
    rerender(<BarcodeScanner {...props} busy />);
    rerender(<BarcodeScanner {...props} busy={false} error="Product not found" />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert')).toHaveTextContent('Product not found');
    enterBarcode('12345678');
    expect(onDetected).toHaveBeenCalledTimes(2);
    expect(onDetected).toHaveBeenLastCalledWith('12345678');
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('stops a camera permission request that resolves after the scanner is closed', async () => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { unmount } = render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    unmount();
    await act(async () => resolve(stream));
    expect(stop).toHaveBeenCalledOnce();
    expect(detect).not.toHaveBeenCalled();
  });

  it('ignores a detection that resolves after unmount', async () => {
    let resolve!: (value: { rawValue: string }[]) => void;
    detect.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const onDetected = vi.fn();
    const { unmount } = render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />);
    await waitFor(() => expect(detect).toHaveBeenCalledOnce());
    unmount();
    await act(async () => resolve([{ rawValue: '7290000000001' }]));
    expect(onDetected).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('owns keyboard focus, closes on Escape, stops the camera, and restores focus', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const { unmount } = render(<BarcodeScanner onDetected={vi.fn()} onClose={onClose} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    const close = screen.getByRole('button', { name: 'Close barcode scanner' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(screen.getByLabelText('Or enter barcode')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
