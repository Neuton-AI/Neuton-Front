import type { CapturePageModel } from './CapturePage.module';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

type Props = Pick<
  CapturePageModel,
  'galleryInputRef' | 'fileInputRef' | 'nativeCameraInputRef' | 'handleFileInput'
>;

export function CaptureFileInputs({
  galleryInputRef,
  fileInputRef,
  nativeCameraInputRef,
  handleFileInput,
}: Props) {
  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        aria-label="Choose photos from gallery"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        hidden
        onChange={handleFileInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Choose document files"
        accept={ACCEPTED}
        multiple
        hidden
        onChange={handleFileInput}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        aria-label="Take a photo with device camera"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFileInput}
      />
    </>
  );
}
