import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getPlaceLocationLabel } from '../../utils/normalizePlace';

/**
 * Displays place header with breadcrumb, title, rating, and badges.
 */
export default function PlaceHeader({ place, badges }) {
  const price = Number(place?.price || place?.entry_fee || 0);
  const locationLabel = getPlaceLocationLabel(place);

  return (
    <div className="place-header">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/nearby">Explore</Link>
        <span>/</span>
        <span className="text-slate-900">{place?.name}</span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          {badges}
          <span className="badge badge-green">{price === 0 ? 'Free Entry' : `Rs ${price} / person`}</span>
        </div>

        <h1 className="mt-4 max-w-4xl text-slate-950">{place?.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
          <span>{locationLabel}</span>
          <span>•</span>
          <span>{'\u2605'} {Number(place?.rating || 4.8).toFixed(1)}</span>
          <span>•</span>
          <span>{Number(place?.review_count || 2341).toLocaleString()} reviews</span>
        </div>
      </div>
    </div>
  );
}

PlaceHeader.propTypes = {
  badges: PropTypes.node,
  place: PropTypes.shape({
    city: PropTypes.string,
    entry_fee: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    location: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        coordinates: PropTypes.array,
        type: PropTypes.string
      })
    ]),
    location_name: PropTypes.string,
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    review_count: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired
};

PlaceHeader.defaultProps = {
  badges: null
};
