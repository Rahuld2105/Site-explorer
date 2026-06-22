import PropTypes from 'prop-types';
import ARViewer from '../ar/ARViewer';
import AROverlay from '../ar/AROverlay';

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
 * AR Tour tab component with AR viewer and overlay captions.
 */
export default function PlaceARTourTab({ aiContent, captions, gallery, place }) {
  const arModelUrl = resolveARModelUrl(aiContent, place);

  return (
    <div className="space-y-5">
      <ARViewer
        alt={`${place?.name || 'Place'} AR model`}
        iosSrc={aiContent?.ar_ios_model_url || aiContent?.ios_model_url || place?.ar_ios_model_url || place?.ios_model_url}
        poster={gallery[0]}
        src={arModelUrl}
      />
      <AROverlay
        caption={captions || aiContent?.summary || 'Point your camera and follow the guide overlays.'}
        title="AR Caption Layer"
      />
    </div>
  );
}

PlaceARTourTab.propTypes = {
  aiContent: PropTypes.shape({
    ar_ios_model_url: PropTypes.string,
    ar_model_url: PropTypes.string,
    ios_model_url: PropTypes.string,
    summary: PropTypes.string
  }),
  captions: PropTypes.string,
  gallery: PropTypes.arrayOf(PropTypes.string),
  place: PropTypes.shape({
    ar_ios_model_url: PropTypes.string,
    ar_model_url: PropTypes.string,
    ios_model_url: PropTypes.string,
    name: PropTypes.string
  })
};

PlaceARTourTab.defaultProps = {
  aiContent: null,
  captions: '',
  gallery: [],
  place: null
};
