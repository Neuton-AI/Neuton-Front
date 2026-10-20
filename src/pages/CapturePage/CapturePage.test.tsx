import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { expect, it, vi } from 'vitest';
import { CapturePage } from './CapturePage';
import { useCapturePage, type CapturePageModel } from './CapturePage.module';
vi.mock('./CapturePage.module', () => ({ useCapturePage: vi.fn() }));
const model = (): CapturePageModel => ({
  handleShutter: vi.fn(),
  handleBrowse: vi.fn(),
  kind: 'receipt',
  setKind: vi.fn(),
  file: null,
  previewUrl: null,
  progress: null,
  error: null,
  busy: false,
  fileInputRef: createRef<HTMLInputElement>(),
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
  expect(state.handleShutter).toHaveBeenCalledOnce();
  expect(state.handleBrowse).toHaveBeenCalledOnce();
  expect(state.handleClose).toHaveBeenCalledOnce();
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
it('delegates source selection to the native picker without an app chooser or capture override', () => {
  vi.mocked(useCapturePage).mockReturnValue(model());
  render(<CapturePage />);
  const input = screen.getByLabelText('Choose document');
  expect(input).toHaveAttribute('type', 'file');
  expect(input.getAttribute('accept')).toContain('application/pdf');
  expect(input.getAttribute('accept')).toContain('image/heic');
  expect(input).not.toHaveAttribute('capture');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
