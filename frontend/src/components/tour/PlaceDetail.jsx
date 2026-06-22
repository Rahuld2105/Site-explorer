import PropTypes from 'prop-types';
import ARViewer from '../ar/ARViewer';
import AROverlay from '../ar/AROverlay';
import AudioPlayer from '../common/AudioPlayer';

const LOCAL_AR_MODELS = {
  rajgad: '/models/rajgad-fort.gltf',
  'rajgad-fort': '/models/rajgad-fort.gltf',
  sinhagad: '/models/sinhagad-fort.gltf',
  'sinhagad-fort': '/models/sinhagad-fort.gltf',
  'shaniwar-wada': '/models/shaniwar-wada.gltf'
};

function normalizePlaceKey(value) {
  return String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
}

function resolveARModelUrl(aiContent, place) {
  const directUrl = aiContent?.ar_model_url || place?.ar_model_url;

  if (directUrl) {
    return directUrl;
  }

  const keys = [place?.place_id, place?.id, place?.slug, place?.name]
    .map(normalizePlaceKey)
    .filter(Boolean);

  return keys.map((key) => LOCAL_AR_MODELS[key]).find(Boolean) || '';
}

/**
 * Full place information block with AI media, AR view, and narrated captioning.
 */
export default function PlaceDetail({
  aiContent,
  audioSource,
  captions,
  guideLoading,
  isInsideGeofence,
  onStartTour,
  place
}) {
  const gallery = aiContent?.images || place?.images || [];
  const arModelUrl = resolveARModelUrl(aiContent, place);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="space-y-6">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{place?.category || place?.type || 'Destination'}</span>
            {place?.rating ? <span className="badge">Rating {place.rating}</span> : null}
            {isInsideGeofence ? <span className="badge">Geofence Active</span> : null}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {gallery.length ? (
              gallery.slice(0, 3).map((image, index) => (
                <img
                  key={image || `gallery-${index}`}
                  alt={`${place?.name} preview ${index + 1}`}
                  className="h-44 w-full rounded-[12px] object-cover"
                  src={image}
                />
              ))
            ) : (
              <div className="col-span-full flex h-48 items-center justify-center rounded-[12px] border border-dashed border-white/15 bg-slate-900/60 text-sm text-slate-400">
                No gallery assets available yet.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="font-heading text-2xl text-white">About this place</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {aiContent?.description || place?.description || 'Place details will appear here once loaded.'}
              </p>
            </div>

            <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tour Status</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {isInsideGeofence ? 'Auto guide zone detected' : 'Outside geofence'}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {isInsideGeofence
                  ? 'The AI guide can start automatically and trigger context-aware narration.'
                  : 'Tap the start button when you want to begin the guided tour experience.'}
              </p>
              {!isInsideGeofence ? (
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => onStartTour('outside')}
                  disabled={guideLoading}
                >
                  {guideLoading ? 'Launching...' : 'Start Tour'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl text-white">Immersive AR Guide</h2>
              <p className="mt-1 text-sm text-slate-400">Preview the destination in augmented reality.</p>
            </div>
          </div>

          <ARViewer
            alt={`${place?.name || 'Place'} AR model`}
            iosSrc={aiContent?.ar_ios_model_url || aiContent?.ios_model_url || place?.ar_ios_model_url || place?.ios_model_url}
            poster={gallery[0]}
            src={arModelUrl}
          />

          <div className="mt-4">
            <AROverlay caption={captions} />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="panel p-5">
          <h2 className="font-heading text-2xl text-white">Narration & Media</h2>
          <p className="mt-2 text-sm text-slate-400">
            TourVision plays backend-generated TTS narration and surfaces any supporting AI video.
          </p>

          <div className="mt-4">
            <AudioPlayer autoPlay src={audioSource} title="AI Narration" />
          </div>

          {aiContent?.ai_video_url ? (
            <video
              className="mt-5 h-64 w-full rounded-[12px] border border-white/10 bg-black object-cover"
              controls
              src={aiContent.ai_video_url}
            />
          ) : (
            <div className="mt-5 flex h-64 items-center justify-center rounded-[12px] border border-dashed border-white/15 bg-slate-900/60 text-sm text-slate-400">
              No AI video has been generated for this location yet.
            </div>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="font-heading text-2xl text-white">Visitor Notes</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Best for</p>
              <p className="mt-1">{place?.best_for || 'History walks, guided narration, and AR storytelling.'}</p>
            </div>
            <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Open hours</p>
              <p className="mt-1">{place?.hours || 'Refer to local listing or admin-managed metadata.'}</p>
            </div>
            <div className="rounded-[12px] border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">AI Summary</p>
              <p className="mt-1">{aiContent?.summary || 'No additional AI summary is available yet.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

PlaceDetail.propTypes = {
  aiContent: PropTypes.shape({
    ai_video_url: PropTypes.string,
    ar_ios_model_url: PropTypes.string,
    ar_model_url: PropTypes.string,
    description: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    ios_model_url: PropTypes.string,
    summary: PropTypes.string,
    tts_audio: PropTypes.string
  }),
  audioSource: PropTypes.string,
  captions: PropTypes.string,
  guideLoading: PropTypes.bool,
  isInsideGeofence: PropTypes.bool,
  onStartTour: PropTypes.func.isRequired,
  place: PropTypes.shape({
    ar_model_url: PropTypes.string,
    ar_ios_model_url: PropTypes.string,
    best_for: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    hours: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    ios_model_url: PropTypes.string,
    name: PropTypes.string,
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string
  })
};

PlaceDetail.defaultProps = {
  aiContent: null,
  audioSource: '',
  captions: '',
  guideLoading: false,
  isInsideGeofence: false,
  place: null
};
