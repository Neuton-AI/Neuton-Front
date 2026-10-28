import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeAll, expect, it, vi } from 'vitest';
import { CapturePage } from './CapturePage';
import {
  useCapturePage,
  type CapturePageModel,
  type CaptureSource,
} from './CapturePage.module';

vi.mock('./CapturePage.module', () => ({ useCapturePage: vi.fn() }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
const source = (id: string, type = 'image/png'): CaptureSource => ({
  id,
  file: new File(
    ['document'],
    `${id}.${type === 'application/pdf' ? 'pdf' : 'png'}`,
    { type },
  ),
  previewUrl: type === 'application/pdf' ? null : `blob:${id}`,
});
const model = (): CapturePageModel => ({
  handleShutter: vi.fn(),
  handleFocus: vi.fn(),
  capturing: false,
  handleBrowse: vi.fn(),
  handleClose: vi.fn(),
  kind: 'receipt',
  setKind: vi.fn(),
  current: null,
  stacked: [],
  total: 0,
  adding: false,
  busy: false,
  locked: false,
  error: null,
  fileInputRef: createRef<HTMLInputElement>(),
  galleryInputRef: createRef<HTMLInputElement>(),
  nativeCameraInputRef: createRef<HTMLInputElement>(),
  videoRef: createRef<HTMLVideoElement>(),
  previewRef: createRef<HTMLDivElement>(),
  onPick: vi.fn(),
  handleFileInput: vi.fn(),
  handleDrop: vi.fn(),
  cancelPick: vi.fn(),
  retake: vi.fn(),
  addCurrent: vi.fn(),
  submit: vi.fn(),
  sourcePickerOpen: false,
  closeSourcePicker: vi.fn(),
  chooseSource: vi.fn(),
  reviewIndex: null,
  openReview: vi.fn(),
  closeReview: vi.fn(),
  setReviewIndex: vi.fn(),
  deleteSource: vi.fn(),
  moveSource: vi.fn(),
  replaceSource: vi.fn(),
  reviewSources: [],
  openCurrentReview: vi.fn(),
});

it('wires camera, browse, close and all document types', async () => {
  const state = model();
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Take photo' }));
  await user.click(screen.getByRole('button', { name: /Drop a file/ }));
  await user.click(screen.getByRole('button', { name: 'Order' }));
  await user.click(screen.getByRole('button', { name: 'Close capture' }));
  expect(state.handleShutter).toHaveBeenCalledOnce();
  expect(state.handleBrowse).toHaveBeenCalledOnce();
  expect(state.setKind).toHaveBeenCalledWith('order');
  expect(state.handleClose).toHaveBeenCalledOnce();
});

it('keeps Retake, Add and Send separate and disables adding at four sources', async () => {
  const state = {
    ...model(),
    current: source('current'),
    total: 4,
    stacked: [source('one'), source('two'), source('three')],
  };
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const user = userEvent.setup();
  expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Receipt' })).toBeDisabled();
  await user.click(
    screen.getByRole('button', { name: 'Review current document' }),
  );
  await user.click(screen.getByRole('button', { name: 'Retake' }));
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(state.retake).toHaveBeenCalledOnce();
  expect(state.submit).toHaveBeenCalledOnce();
  expect(state.addCurrent).not.toHaveBeenCalled();
  expect(state.openCurrentReview).toHaveBeenCalledOnce();
  expect(
    screen.getByRole('button', { name: 'Review 3 saved sources' }),
  ).toBeInTheDocument();
});

it('passes keyboard activation through to Add without requesting motion', async () => {
  const state = { ...model(), current: source('current'), total: 1 };
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  screen.getByRole('button', { name: 'Add' }).focus();
  await userEvent.setup().keyboard('{Enter}');
  expect(state.addCurrent).toHaveBeenCalledWith(true);
});

it('reviews only saved sources while preserving the current source outside the dialog', async () => {
  const state = {
    ...model(),
    current: source('current'),
    stacked: [source('one'), source('two', 'application/pdf')],
    reviewSources: [source('one'), source('two', 'application/pdf')],
    total: 3,
    reviewIndex: 0,
  };
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const dialog = within(
    screen.getByRole('dialog', { name: 'Review document sources' }),
  );
  expect(
    dialog.getByText('1 of 2', { selector: '.capture-review-count' }),
  ).toBeInTheDocument();
  expect(dialog.queryByText('current.png')).not.toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Move earlier' })).toBeDisabled();
  const user = userEvent.setup();
  await user.click(dialog.getByRole('button', { name: 'Next →' }));
  await user.click(dialog.getByRole('button', { name: 'Delete' }));
  await user.click(dialog.getByRole('button', { name: 'Replace' }));
  await user.click(dialog.getByRole('button', { name: 'Move later' }));
  expect(state.setReviewIndex).toHaveBeenCalledWith(1);
  expect(state.deleteSource).toHaveBeenCalledWith('one');
  expect(state.replaceSource).toHaveBeenCalledWith('one');
  expect(state.moveSource).toHaveBeenCalledWith('one', 1);
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { cancelable: true }),
  );
  expect(state.closeReview).toHaveBeenCalledOnce();
});

it('can reorder the current document in full review at the four-source limit', async () => {
  const current = source('current');
  const stacked = [source('one'), source('two'), source('three')];
  const state = {
    ...model(),
    current,
    stacked,
    total: 4,
    reviewIndex: 3,
    reviewSources: [...stacked, current],
  };
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const dialog = within(
    screen.getByRole('dialog', { name: 'Review document sources' }),
  );
  expect(
    dialog.getByText('4 of 4', { selector: '.capture-review-count' }),
  ).toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Next →' })).toBeDisabled();
  await userEvent
    .setup()
    .click(dialog.getByRole('button', { name: 'Move earlier' }));
  expect(state.moveSource).toHaveBeenCalledWith('current', -1);
});

it('offers gallery, file explorer and camera and accepts multiple files', async () => {
  const state = { ...model(), sourcePickerOpen: true };
  vi.mocked(useCapturePage).mockReturnValue(state);
  render(<CapturePage />);
  const dialog = within(
    screen.getByRole('dialog', { name: 'Choose upload source' }),
  );
  const user = userEvent.setup();
  await user.click(dialog.getByRole('button', { name: 'Photo gallery' }));
  await user.click(dialog.getByRole('button', { name: 'Browse files' }));
  await user.click(dialog.getByRole('button', { name: 'Take a photo' }));
  expect(
    vi.mocked(state.chooseSource).mock.calls.map(([value]) => value),
  ).toEqual(['gallery', 'file', 'camera']);
  const input = screen.getByLabelText('Choose document files');
  const files = [source('one').file, source('two').file];
  fireEvent.change(input, { target: { files } });
  expect(state.handleFileInput).toHaveBeenCalledTimes(1);
  expect(vi.mocked(state.handleFileInput).mock.calls[0][0].target.files).toBe(files);
});

it('retains the file preview and allows resubmission after a local save failure', () => {
  const current = source('document', 'application/pdf');
  vi.mocked(useCapturePage).mockReturnValue({
    ...model(),
    current,
    total: 1,
    error: 'Device storage is full',
  });
  render(<CapturePage />);
  expect(screen.getByText('document.pdf')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Retake' })).toBeEnabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Device storage is full');
});
