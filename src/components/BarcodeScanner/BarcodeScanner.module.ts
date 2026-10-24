import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ProductDetails } from './ManualProductForm';
import type { RecipeUsageContext } from '@/features/recipes/measurementUnits';

export type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
  onManualSave?: (details: ProductDetails) => void;
  ingredient?: {
    rawMaterialName: string;
  } & RecipeUsageContext;
  currency?: string;
  paused?: boolean;
  onModeChange?: () => void;
};

type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): {
    detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
  };
  getSupportedFormats?: () => Promise<string[]>;
};

const RETAIL_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];
const MANUAL_FALLBACK = 'Live barcode scanning is unavailable. Enter the barcode below.';

export function useBarcodeScanner({
  onDetected,
  onClose,
  busy = false,
  error,
  paused = false,
}: BarcodeScannerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onDetected, onClose });
  const submitted = useRef(false);
  const stopCamera = useRef<() => void>(() => {});
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [pending, setPending] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    callbacks.current = { onDetected, onClose };
  }, [onDetected, onClose]);

  const close = useCallback(() => {
    submitted.current = true;
    stopCamera.current();
    callbacks.current.onClose();
  }, []);

  const detect = useCallback(
    (value: string) => {
      if (busy || submitted.current) return;
      submitted.current = true;
      setPending(true);
      stopCamera.current();
      callbacks.current.onDetected(value);
    },
    [busy],
  );

  // A failed lookup releases the one-scan latch so the user can try another product.
  useEffect(() => {
    if (!busy && error) {
      submitted.current = false;
      setPending(false);
    }
  }, [busy, error]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        close();
      }
      if (event.key !== 'Tab') return;
      event.stopImmediatePropagation();
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [close]);

  useEffect(() => {
    if (busy || pending || paused) return;
    let active = true;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const video = videoRef.current;
    const stop = () => {
      active = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      cameraTrack.current = null;
      setTorchAvailable(false);
      setTorchOn(false);
      if (video) video.srcObject = null;
    };
    stopCamera.current = stop;

    async function start() {
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setCameraNotice(MANUAL_FALLBACK);
        return;
      }
      try {
        const supported = await Detector.getSupportedFormats?.();
        if (!active) return;
        const formats = RETAIL_FORMATS.filter((format) => !supported || supported.includes(format));
        if (!formats.length) {
          setCameraNotice(MANUAL_FALLBACK);
          return;
        }
        const detector = new Detector({ formats });
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          camera.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = camera;
        const track = camera.getVideoTracks?.()[0];
        cameraTrack.current = track ?? null;
        setTorchAvailable(
          Boolean((track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch),
        );
        if (video) video.srcObject = camera;
        setCameraNotice(null);
        const scan = async () => {
          if (!active) return;
          if (video && video.readyState >= 2) {
            try {
              const results = await detector.detect(video);
              if (!active) return;
              const result = results.find((item) => /^\d{8,14}$/.test(item.rawValue));
              if (result) {
                detect(result.rawValue);
                return;
              }
            } catch {
              // A changing camera frame can be temporarily unavailable to the detector.
            }
          }
          if (active) timer = setTimeout(() => void scan(), 250);
        };
        void scan();
      } catch {
        if (active) {
          stop();
          setCameraNotice('Camera access is unavailable. Enter the barcode below.');
        }
      }
    }
    void start();
    return stop;
  }, [busy, pending, paused, detect]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = barcode.trim();
    if (!/^\d{8,14}$/.test(value)) {
      setValidationError('Enter the 8–14 digits printed below the barcode.');
      return;
    }
    setValidationError(null);
    detect(value);
  };

  async function toggleTorch() {
    if (!cameraTrack.current || !torchAvailable) return;
    try {
      await cameraTrack.current.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn(!torchOn);
    } catch {
      setCameraNotice('Flashlight is unavailable on this camera.');
    }
  }

  return {
    titleId,
    dialogRef,
    closeRef,
    videoRef,
    close,
    barcode,
    setBarcode,
    submit,
    cameraNotice,
    validationError,
    waiting: busy || pending,
    torchAvailable,
    torchOn,
    toggleTorch,
  };
}
