import PropTypes from 'prop-types';
import MapView from '../map/MapView';
import { formatDistanceMeters } from '../../utils/geoUtils';

/**
 * Sticky action card shown on desktop sidebar.
 * Displays pricing, booking options, and key actions.
 */
export default function PlaceActionCard({
  guideLoading,
  geofenceState,
  isInsideGeofence,
  location,
  onAddToWishlist,
  onStartTour,
  onViewGuide,
  place,
  price,
  saved,
  score,
  travelers,
  visitDate,
  onTravelersChange,
  onVisitDateChange
}) {
  const status = geofenceState?.status || (isInsideGeofence ? 'inside' : 'outside');
  const statusConfig = {
    inside: {
      badge: 'badge-green',
      label: 'Inside geofence',
      text: 'Visit check-in active'
    },
    near: {
      badge: 'badge-amber',
      label: 'Near geofence',
      text: 'Move closer to check in'
    },
    outside: {
      badge: 'badge-neutral',
      label: 'Outside geofence',
      text: 'Live GPS verification'
    }
  }[status] || {
    badge: 'badge-neutral',
    label: 'Outside geofence',
    text: 'Live GPS verification'
  };
  const placeCenter = geofenceState?.placeCoordinates;
  const canRenderMap = placeCenter && Number.isFinite(placeCenter.lat) && Number.isFinite(placeCenter.lng);

  return (
    <div className="sticky top-[110px] rounded-[var(--r-xl)] border border-[var(--c-border)] bg-white p-7 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="score-bubble">{score}</span>
          <p className="mt-2 text-sm font-semibold">Exceptional</p>
        </div>
        <button
          type="button"
          className="text-2xl text-[var(--c-primary)]"
          onClick={onAddToWishlist}
          aria-label="Add to wishlist"
        >
          {saved ? '\u2665' : '\u2661'}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Geofence</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{statusConfig.text}</p>
            </div>
            <span className={`badge ${statusConfig.badge}`}>
              <span className={`geofence-status-icon geofence-status-icon-${status}`} />
              {statusConfig.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold text-slate-500">Distance</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {formatDistanceMeters(geofenceState?.distanceMeters)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-bold text-slate-500">Radius</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {Math.round(geofenceState?.radiusMeters || 200)} m
              </p>
            </div>
          </div>
        </div>

        {canRenderMap ? (
          <div className="h-48 border-t border-slate-200">
            <MapView
              center={placeCenter}
              geofence={{
                center: placeCenter,
                placeName: place?.name,
                radiusMeters: geofenceState?.radiusMeters || 200,
                status
              }}
              places={[]}
              recenterOnCenterChange
              userLocation={location}
              zoom={16}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-sm text-[var(--c-text-secondary)]">Price</p>
        <p className="mt-1 text-2xl font-bold">
          {price === 0 ? 'Free Entry' : `Rs ${price}/person`}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="input-wrap">
          <span className="input-label">When are you visiting?</span>
          <input
            className="input"
            type="date"
            value={visitDate}
            onChange={(event) => onVisitDateChange(event.target.value)}
          />
        </label>

        <label className="input-wrap">
          <span className="input-label">Travelers</span>
          <select className="input" value={travelers} onChange={(event) => onTravelersChange(event.target.value)}>
            <option>1 traveler</option>
            <option>2 travelers</option>
            <option>Family</option>
            <option>Group</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        className="btn-primary btn-full btn-lg mt-6"
        onClick={() => onStartTour(isInsideGeofence ? 'inside' : 'outside')}
        disabled={guideLoading}
      >
        {guideLoading ? 'Starting...' : 'Start AI Tour'}
      </button>
      <button type="button" className="btn-outline btn-full mt-3" onClick={onAddToWishlist}>
        Add to Wishlist
      </button>

      <div className="my-5 flex items-center gap-3 text-sm text-[var(--c-text-secondary)]">
        <span className="h-px flex-1 bg-[var(--c-border)]" />
        or
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>

      <button type="button" className="btn-secondary btn-full" onClick={onViewGuide}>
        Audio Guide
      </button>

      <p className="mt-4 text-sm text-[var(--c-text-secondary)]">
        Instant confirmation · No booking required
      </p>
      <div className="mt-4 urgency-tag">42 people exploring this today</div>
    </div>
  );
}

PlaceActionCard.propTypes = {
  guideLoading: PropTypes.bool.isRequired,
  geofenceState: PropTypes.shape({
    distanceMeters: PropTypes.number,
    placeCoordinates: PropTypes.shape({
      lat: PropTypes.number,
      lng: PropTypes.number
    }),
    radiusMeters: PropTypes.number,
    status: PropTypes.string
  }),
  isInsideGeofence: PropTypes.bool.isRequired,
  location: PropTypes.shape({
    accuracy: PropTypes.number,
    lat: PropTypes.number,
    lng: PropTypes.number
  }),
  onAddToWishlist: PropTypes.func.isRequired,
  onStartTour: PropTypes.func.isRequired,
  onViewGuide: PropTypes.func.isRequired,
  onTravelersChange: PropTypes.func.isRequired,
  onVisitDateChange: PropTypes.func.isRequired,
  place: PropTypes.shape({
    name: PropTypes.string
  }),
  price: PropTypes.number.isRequired,
  saved: PropTypes.bool.isRequired,
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  travelers: PropTypes.string.isRequired,
  visitDate: PropTypes.string.isRequired
};

PlaceActionCard.defaultProps = {
  geofenceState: null,
  location: null,
  place: null
};
