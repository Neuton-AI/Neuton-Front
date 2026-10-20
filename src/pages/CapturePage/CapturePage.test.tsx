import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { expect, it, vi } from 'vitest';
import { CapturePage } from './CapturePage';
import { useCapturePage, type CapturePageModel } from './CapturePage.module';
vi.mock('./CapturePage.module', () => ({ useCapturePage: vi.fn() }));
const model = (): CapturePageModel => ({
  handleShutter: vi.fn(),
  handleBrowse: vi.fn(),
  handleNativeCamera: vi.fn(),
  handleRetake: vi.fn(),
  handleFocus: vi.fn().mockResolvedValue(undefined),
  focusPoint: null,
  kind: 'receipt',
  setKind: vi.fn(),
  file: null,
  previewUrl: null,
  progress: null,
  error: null,
  busy: false,
  capturing: false,
  fileInputRef: createRef<HTMLInputElement>(),
  nativeCameraInputRef: createRef<HTMLInputElement>(),
  videoRef: createRef<HTMLVideoElement>(),
  onPick: vi.fn(),
  handleClose: vi.fn(),
});
it('wires accessible camera, browse and close controls to the module', async () => {
  const state = model();
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Take photo' }));
  await user.click(screen.getByRole('button', { name: /Drop a file/ }));
  await user.click(screen.getByRole('button', { name: 'Close capture' }));
  await user.click(screen.getByRole('button', { name: 'Use phone camera' }));
  const tap = new Event('pointerup', { bubbles: true });
  Object.defineProperties(tap, {
    isPrimary: { value: true },
    button: { value: 0 },
    clientX: { value: 100 },
    clientY: { value: 150 },
  });
  fireEvent(screen.getByLabelText('Camera preview'), tap);
  expect(state.handleFocus).toHaveBeenCalledWith(100, 150);
  expect(state.handleShutter).toHaveBeenCalledOnce();
  expect(state.handleBrowse).toHaveBeenCalledOnce();
  expect(state.handleClose).toHaveBeenCalledOnce();
  expect(state.handleNativeCamera).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Take photo with phone camera')).toHaveAttribute(
    'capture',
    'environment',
  );
});
it('renders upload state, errors and previews without owning their behavior', () => {
  vi.mocked(useCapturePage).mockReturnValue({
    ...model(),
    file: new File(['x'], 'scan.png'),
    previewUrl: 'blob:preview',
    busy: true,
    error: 'Upload rejected',
    progress: { phase: 'uploading', ratio: 0.5 },
  });
  render(<CapturePage />);
  expect(screen.getByRole('img', { name: 'Selected document preview' })).toHaveAttribute(
    'src',
    'blob:preview',
  );
  expect(screen.getByRole('button', { name: 'Upload document' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Upload rejected');
  expect(screen.getByText('Sending the file to storage…')).toBeInTheDocument();
});
