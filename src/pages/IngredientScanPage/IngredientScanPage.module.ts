import { useAuth, useShopMemberships } from '@/features/auth/supabase';
import { useLinkIngredient, useRecipe } from '@/features/recipes/recipesApi';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
const MIN_BARCODE_LENGTH = 4;
const MAX_BARCODE_LENGTH = 64;
const DETECT_INTERVAL_MS = 200;
const SUCCESS_HOLD_MS = 600;
const CAMERA_UNAVAILABLE_MESSAGE =
  'Camera access denied or unavailable. Enter the barcode below instead.';

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

export function useIngredientScanPage() {
  const { id: recipeId = '', ingredientId = '' } = useParams();

  const { user, token } = useAuth();

  const { activeShopId } = useShopMemberships(user?.id);

  const navigate = useNavigate();

  // Best-effort ingredient name for the subtitle; the scanner works without it.
  const recipeQuery = useRecipe(token, activeShopId, recipeId);
  const ingredient = recipeQuery.data?.recipe.costing.ingredients.find(
    (row) => row.id === ingredientId,
  );
  const ingredientName = ingredient ? (ingredient.rawName ?? ingredient.name) : null;

  const linkMutation = useLinkIngredient(token, activeShopId, recipeId, ingredientId);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Guards both the decode loop and a second mutate while one is in flight;
  // refs are not reactive, so the visible "Linking…" state comes from isPending.
  const linkingRef = useRef(false);
  const lastDetectedCodeRef = useRef<string | null>(null);
  const navigateTimeoutRef = useRef<number | null>(null);
  const linkRef = useRef<(barcode: string) => void>(() => undefined);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);

  const succeed = useCallback(() => {
    setLinked(true);
    navigateTimeoutRef.current = window.setTimeout(() => navigate(-1), SUCCESS_HOLD_MS);
  }, [navigate]);

  const link = useCallback(
    (rawCode: string) => {
      if (linkingRef.current) return;
      const trimmed = rawCode.trim();
      if (trimmed.length < MIN_BARCODE_LENGTH || trimmed.length > MAX_BARCODE_LENGTH) {
        setLinkError(
          `Barcodes are ${MIN_BARCODE_LENGTH} to ${MAX_BARCODE_LENGTH} characters long.`,
        );
        return;
      }
      linkingRef.current = true;
      setLinkError(null);
      linkMutation.mutate(
        { barcode: trimmed },
        {
          onSuccess: succeed,
          onError: (cause) => {
            linkingRef.current = false;
            // Let the camera retry the same code after a failed lookup.
            lastDetectedCodeRef.current = null;
            setLinkError(cause instanceof Error ? cause.message : 'Could not link this barcode.');
          },
        },
      );
    },
    [linkMutation, succeed],
  );

  useEffect(() => {
    linkRef.current = link;
  }, [link]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(CAMERA_UNAVAILABLE_MESSAGE);
      return;
    }

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (active) setCameraError(CAMERA_UNAVAILABLE_MESSAGE);
      }
    }

    void startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const Detector = getBarcodeDetectorCtor();
    if (!Detector) {
      setUnsupported(true);
      return;
    }
    let detector: BarcodeDetectorInstance;
    try {
      detector = new Detector({ formats: SUPPORTED_FORMATS });
    } catch {
      setUnsupported(true);
      return;
    }

    const intervalId = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || linkingRef.current) return;
      detector
        .detect(video)
        .then((barcodes) => {
          const rawValue = barcodes[0]?.rawValue;
          if (!rawValue || linkingRef.current || lastDetectedCodeRef.current === rawValue) return;
          lastDetectedCodeRef.current = rawValue;
          linkRef.current(rawValue);
        })
        .catch(() => undefined);
    }, DETECT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(
    () => () => {
      if (navigateTimeoutRef.current !== null) {
        window.clearTimeout(navigateTimeoutRef.current);
      }
    },
    [],
  );

  return {
    videoRef,
    cameraError,
    unsupported,
    ingredientName,
    barcode,
    setBarcode,
    submitManual: () => link(barcode),
    linkError,
    linking: linkMutation.isPending,
    linked,
    close: () => navigate(-1),
  };
}

export type IngredientScanPageModel = ReturnType<typeof useIngredientScanPage>;
