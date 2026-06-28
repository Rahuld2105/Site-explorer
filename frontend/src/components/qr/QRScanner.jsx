import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Html5Qrcode } from 'html5-qrcode';
import { recognizeImage } from '../../api/mlApi';

const SCANNER_ID = 'tourvision-qr-reader';

function extractRecognitionPayload(response) {
  return response?.data?.data || response?.data?.result || response?.data || response || {};
}

function getRecognitionName(result) {
  return (
    result?.name ||
    result?.place ||
    result?.label ||
    result?.classification ||
    result?.class_name ||
    result?.className ||
    'Landmark detected'
  );
}

export default function QRScanner({ isOpen = true, onClose, onDetected, onImageDetected }) {
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('qr');
  const [cameraError, setCameraError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageResult, setImageResult] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn('QR scanner stop warning:', error);
    }

    try {
      await scanner.clear();
    } catch (error) {
      console.warn('QR scanner cleanup warning:', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || mode !== 'qr') {
      return undefined;
    }

    let isActive = true;
    setCameraError('');
    setLoading(true);
    setScanned(false);
    scannedRef.current = false;

    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setCameraError('Camera access requires HTTPS or localhost.');
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        async (decodedText) => {
          if (!isActive || scannedRef.current) return;
          console.log('QR:', decodedText);
          isActive = false;
          scannedRef.current = true;
          setScanned(true);
          setLoading(true);

          try {
            await stopScanner();
            await onDetected(decodedText);
          } finally {
            setLoading(false);
          }
        }
      )
      .then(() => {
        if (isActive) {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to start QR scanner:', error);
        if (isActive) {
          setCameraError(
            error?.message ||
              'Camera access was blocked. Allow camera permission and try again.'
          );
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      stopScanner();
    };
  }, [isOpen, mode, onDetected, stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      setMode('qr');
      setImageError('');
      setImagePreview('');
      setImageResult(null);
      setImageLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const nextPreview = URL.createObjectURL(file);
    setImagePreview(nextPreview);
    setImageError('');
    setImageResult(null);
    setImageLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await recognizeImage(formData);
      const result = extractRecognitionPayload(response);
      setImageResult(result);

      if (result?.is_confident === false || result?.place_id === 'unknown-or-unsupported') {
        setImageError(result?.description || 'Unable to confidently identify this place.');
        return;
      }

      await onImageDetected?.(result);
    } catch (error) {
      console.error('Image recognition failed:', error);
      setImageError(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Image scan failed. Make sure the ML service is running and try again.'
      );
    } finally {
      setImageLoading(false);
      event.target.value = '';
    }
  };

  const handleClose = async () => {
    await stopScanner();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4">
      <div className="panel-strong max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl text-white">QR and Image Scanner</h2>
            <p className="text-sm text-slate-400">
              Scan a place QR or upload a landmark image for CNN recognition
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm"
            onClick={handleClose}
          >
            Close scanner
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              mode === 'qr' ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setMode('qr')}
          >
            QR Scanner
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              mode === 'image' ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            onClick={async () => {
              await stopScanner();
              setMode('image');
            }}
          >
            Image Scanner
          </button>
        </div>

        {mode === 'qr' ? (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900">
            <div id={SCANNER_ID} className="min-h-[320px]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[260px] w-[260px] rounded-[20px] border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.42)]" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-4 py-4 text-center">
              <p className="text-sm font-semibold text-white">
                {loading || scanned ? 'Scanning...' : 'Camera ready'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageFile}
            />
            <button
              type="button"
              className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-slate-950/40 px-5 text-center transition hover:border-teal-300/70 hover:bg-slate-950/70"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
            >
              {imagePreview ? (
                <img
                  alt="Selected landmark"
                  className="max-h-72 w-full rounded-lg object-contain"
                  src={imagePreview}
                />
              ) : (
                <>
                  <span className="text-4xl">IMG</span>
                  <span className="mt-4 text-base font-extrabold text-white">
                    Upload or capture landmark image
                  </span>
                  <span className="mt-2 max-w-sm text-sm text-slate-400">
                    The CNN recognition service will identify the place from the image.
                  </span>
                </>
              )}
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageLoading}
              >
                {imageLoading ? 'Scanning image...' : imagePreview ? 'Scan another image' : 'Choose image'}
              </button>
              <span className="rounded-full border border-teal-300/30 bg-teal-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-100">
                CNN ready
              </span>
            </div>

            {imageResult ? (
              <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                <p className="font-extrabold">{getRecognitionName(imageResult)}</p>
                {typeof imageResult.confidence !== 'undefined' ? (
                  <p className="mt-1 text-emerald-100/80">
                    Confidence: {Math.round(Number(imageResult.confidence || 0) * 100)}%
                  </p>
                ) : null}
                {Array.isArray(imageResult.facts) && imageResult.facts.length ? (
                  <p className="mt-2 text-emerald-100/80">{imageResult.facts[0]}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {mode === 'qr' && cameraError ? (
          <div className="mt-4 rounded-[12px] border border-rose-300/40 bg-rose-500/10 p-4 text-sm font-medium text-rose-100">
            {cameraError}
          </div>
        ) : null}
        {mode === 'image' && imageError ? (
          <div className="mt-4 rounded-[12px] border border-rose-300/40 bg-rose-500/10 p-4 text-sm font-medium text-rose-100">
            {imageError}
          </div>
        ) : null}
        {mode === 'qr' && !cameraError ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            Works on HTTPS or localhost. If the camera is blocked, allow camera access in your browser settings.
          </p>
        ) : null}
        {mode === 'image' && !imageError ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            Image recognition uses the configured ML service at runtime.
          </p>
        ) : null}
      </div>
    </div>
  );
}

QRScanner.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDetected: PropTypes.func.isRequired,
  onImageDetected: PropTypes.func,
};

QRScanner.defaultProps = {
  onImageDetected: null
};
