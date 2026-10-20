import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CapturePage } from './CapturePage';
import { useCapturePage, type CapturePageModel } from './CapturePage.module';
vi.mock('./CapturePage.module', async (original) => ({
  ...(await original<typeof import('./CapturePage.module')>()),
  useCapturePage: vi.fn(),
}));
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
  galleryInputRef: createRef<HTMLInputElement>(),
  cameraInputRef: createRef<HTMLInputElement>(),
  browseButtonRef: createRef<HTMLButtonElement>(),
  galleryButtonRef: createRef<HTMLButtonElement>(),
  sourceChooserOpen: false,
  closeSourceChooser: vi.fn(),
  chooseSource: vi.fn(),
  videoRef: createRef<HTMLVideoElement>(),
  onPick: vi.fn(),
  handleClose: vi.fn(),
});
describe('upload sources', () => {
  it('offers exactly three sources and routes each selection', async () => {
    const state = { ...model(), sourceChooserOpen: true };
    vi.mocked(useCapturePage).mockReturnValue(state);
    render(<CapturePage />);
    const dialog = screen.getByRole('dialog', { name: 'Choose upload source' });
    expect(within(dialog).getAllByRole('button')).toHaveLength(4); // Three sources and close.
    const gallery = within(dialog).getByRole('button', {
      name: /Gallery Select/,
    });
    const user = userEvent.setup();
    await user.click(gallery);
    await user.click(within(dialog).getByRole('button', { name: /File explorer Select/ }));
    await user.click(within(dialog).getByRole('button', { name: /Native camera Take/ }));
    expect(vi.mocked(state.chooseSource).mock.calls).toEqual([['gallery'], ['file'], ['camera']]);
    await user.keyboard('{Escape}');
    expect(state.closeSourceChooser).toHaveBeenCalled();
  });

  it('uses image-only inputs for gallery/camera and adds capture only to native camera', () => {
    const state = model();
    vi.mocked(useCapturePage).mockReturnValue(state);
    render(<CapturePage />);
    const gallery = screen.getByLabelText('Choose gallery image');
    const explorer = screen.getByLabelText('Choose document');
    const camera = screen.getByLabelText('Take native camera photo');
    for (const input of [gallery, camera]) {
      expect(input.getAttribute('accept')).toContain('image/heic');
      expect(input.getAttribute('accept')).not.toContain('application/pdf');
    }
    expect(explorer.getAttribute('accept')).toContain('application/pdf');
    expect(gallery).not.toHaveAttribute('capture');
    expect(explorer).not.toHaveAttribute('capture');
    expect(camera).toHaveAttribute('capture', 'environment');
    const image = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    const pdf = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(gallery, { target: { files: [image] } });
    fireEvent.change(explorer, { target: { files: [pdf] } });
    fireEvent.change(camera, { target: { files: [image] } });
    expect(vi.mocked(state.onPick).mock.calls).toEqual([[image], [pdf], [image]]);
  });
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
