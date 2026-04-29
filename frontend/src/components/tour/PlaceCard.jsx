import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Airbnb-style place listing card with media-first layout and upfront pricing.
 */
export default function PlaceCard({ meta, onSelect, place }) {
  const [saved, setSaved] = useState(false);
  const image = place.image || place.images?.[0] || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80';
  const rating = Number(place.rating || 4.8).toFixed(1);
  const distance = place.distance ? `${Number(place.distance).toFixed(1)} km` : 'Nearby';
  const score = Number(place.score || 8.9).toFixed(1);
  const price = Number(place.price || place.entry_fee || 0);
  const hasAr = Boolean(place.has_ar || place.ar_model_url);
  const locationLabel =
    place.location_name ||
    place.city ||
    (typeof place.location === 'string' ? place.location : '') ||
    'TourVision destination';

  return (
    <article className="cursor-pointer" onClick={() => onSelect?.(place)}>
      <div className="relative aspect-[20/19] overflow-hidden rounded-[var(--r-lg)] bg-[var(--c-surface-inset)]">
        <img
          alt={place.name}
          className="h-full w-full object-cover transition duration-500 ease-out hover:scale-[1.03]"
          src={image}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSaved((current) => !current);
          }}
          className="absolute right-4 top-4 text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
          aria-label="Save place"
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <div className="px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-[1rem] font-semibold leading-6">{place.name}</h3>
          <span className="score-bubble">{score}</span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-[var(--c-text-secondary)]">
          <span>{locationLabel}</span>
          <span className="badge badge-neutral">{distance}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="badge badge-neutral">{place.category || place.type || 'Experience'}</span>
          {hasAr ? <span className="badge badge-teal">AR Available</span> : null}
        </div>

        <div className="mt-2 text-[13px] text-[var(--c-text-secondary)]">
          ⭐ {rating} · {Number(place.review_count || place.reviews || 1240).toLocaleString()} reviews
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-semibold text-[var(--c-text-primary)]">
            {price === 0 ? 'From ₹0 · Free Entry' : `₹${price} / person`}
          </span>
          {meta ? <span className="text-[13px] font-semibold text-[var(--c-primary)]">{meta}</span> : null}
        </div>
      </div>
    </article>
  );
}

PlaceCard.propTypes = {
  meta: PropTypes.string,
  onSelect: PropTypes.func,
  place: PropTypes.shape({
    ar_model_url: PropTypes.string,
    category: PropTypes.string,
    city: PropTypes.string,
    distance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    entry_fee: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    has_ar: PropTypes.bool,
    image: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    location: PropTypes.string,
    location_name: PropTypes.string,
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    review_count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    reviews: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string
  }).isRequired
};

PlaceCard.defaultProps = {
  meta: '',
  onSelect: undefined
};
