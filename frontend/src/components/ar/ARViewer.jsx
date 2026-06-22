import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';

/**
 * Wrapper around model-viewer for AR-ready place models.
 */
export default function ARViewer({ alt, iosSrc, poster, src }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [markerFound, setMarkerFound] = useState(false);
  const [arStatus, setArStatus] = useState('idle');
  const [viewerError, setViewerError] = useState('');
  const videoRef = useRef(null);
  const modelViewerRef = useRef(null);

  useEffect(() => {
    let stream;

    async function startCamera() {
      if (!cameraOpen || !navigator.mediaDevices?.getUserMedia) {
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    startCamera().catch(() => setCameraOpen(false));

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraOpen]);

  useEffect(() => {
    const viewer = modelViewerRef.current;

    if (!viewer) {
      return undefined;
    }

    const handleStatus = (event) => setArStatus(event.detail?.status || 'idle');
    const handleError = () => setViewerError('This AR model could not be loaded. Check the model URL and file format.');
    const handleLoad = () => setViewerError('');

    viewer.addEventListener('ar-status', handleStatus);
    viewer.addEventListener('error', handleError);
    viewer.addEventListener('load', handleLoad);

    return () => {
      viewer.removeEventListener('ar-status', handleStatus);
      viewer.removeEventListener('error', handleError);
      viewer.removeEventListener('load', handleLoad);
    };
  }, [src]);

  const handleOpenAR = () => {
    const viewer = modelViewerRef.current;

    if (viewer?.activateAR) {
      viewer.activateAR();
      return;
    }

    setCameraOpen(true);
  };

  if (cameraOpen) {
    return (
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-[var(--shadow-card)]">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.55))]" />
        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-dashed border-teal-300/90" />
        {markerFound ? (
          <div className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-[70%] place-items-center rounded-xl border border-teal-200/70 bg-teal-400/25 text-center text-sm font-black text-white shadow-2xl backdrop-blur-md">
            3D Heritage Overlay
          </div>
        ) : null}
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/45 p-3 text-white backdrop-blur">
          <p className="text-sm font-bold">{markerFound ? 'Guide overlay is active.' : 'Use this camera guide to preview where AR content would appear.'}</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-full bg-teal-500 px-3 py-1.5 text-xs font-black text-white" onClick={() => setMarkerFound(true)}>
              Show Overlay
            </button>
            <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black text-white" onClick={() => setCameraOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-center text-sm text-slate-300 shadow-[var(--shadow-card)]">
        {poster ? <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" src={poster} /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/70" />
        <div className="relative max-w-sm px-6">
          <p className="font-heading text-xl text-white">AR Guide Preview</p>
          <p className="mt-2">A real 3D placement model is not attached yet, so this opens a camera-based AR guide preview.</p>
          <button type="button" className="mt-4 rounded-full bg-teal-500 px-4 py-2 text-sm font-black text-white" onClick={() => setCameraOpen(true)}>
            Start AR Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-[var(--shadow-card)]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,_transparent_56%,_rgba(2,6,23,0.52)_100%)]" />
      <div className="absolute left-5 top-5 z-10 rounded-full border border-white/10 bg-black/[0.35] px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/90 backdrop-blur-xl">
        AR Ready
      </div>
      {/* model-viewer is a web component provided by the model-viewer package. */}
      <model-viewer
        ref={modelViewerRef}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-placement="floor"
        auto-rotate
        camera-controls
        className="h-[420px] w-full bg-slate-950"
        exposure="0.9"
        ios-src={iosSrc}
        shadow-intensity="1"
        src={src}
        alt={alt}
        touch-action="pan-y"
      >
        <button
          slot="ar-button"
          type="button"
          className="absolute bottom-5 right-5 z-20 rounded-full bg-teal-500 px-4 py-2 text-sm font-black text-white shadow-lg transition hover:bg-teal-400"
        >
          View in AR
        </button>
      </model-viewer>
      <div className="absolute inset-x-5 bottom-5 z-10 flex max-w-[calc(100%-10rem)] flex-wrap items-center gap-2 text-xs font-bold text-white">
        <span className="rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
          {arStatus === 'session-started' ? 'AR session active' : 'Drag to preview, then place on your floor'}
        </span>
        <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur transition hover:bg-white/25" onClick={handleOpenAR}>
          Launch
        </button>
        <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur transition hover:bg-white/25" onClick={() => setCameraOpen(true)}>
          Camera Guide
        </button>
      </div>
      {viewerError ? (
        <div className="absolute inset-x-5 top-16 z-20 rounded-xl border border-rose-200/40 bg-rose-950/80 p-3 text-sm font-semibold text-rose-50 backdrop-blur">
          {viewerError}
        </div>
      ) : null}
    </div>
  );
}

ARViewer.propTypes = {
  alt: PropTypes.string,
  iosSrc: PropTypes.string,
  poster: PropTypes.string,
  src: PropTypes.string
};

ARViewer.defaultProps = {
  alt: 'AR place model',
  iosSrc: '',
  poster: '',
  src: ''
};
