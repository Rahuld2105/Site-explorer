import { FALLBACK_PLACES } from '../constants/homeData';

/**
 * Normalizes a raw place object (from API) into the shape the UI expects.
 * @param {object} place - Raw place data
 * @param {number} index - Array index (used for fallback values)
 * @returns {object} Normalized place
 */
export function normalizePlace(place, index) {
  const coordinates = place.coordinates || place.location?.coordinates || place.geometry?.coordinates;
  const lat =
    Number(place.lat ?? place.latitude ?? coordinates?.lat ?? coordinates?.[1] ?? place.location?.lat);
  const lng =
    Number(place.lng ?? place.longitude ?? coordinates?.lng ?? coordinates?.[0] ?? place.location?.lng);
  const safeLocation =
    place.location_name ||
    place.city ||
    (typeof place.location === 'string' ? place.location : '') ||
    (Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : 'TourVision destination');

  return {
    id: place.id || index + 1,
    name: place.name || place.title || `Place ${index + 1}`,
    location_name: safeLocation,
    category: place.category || place.type || 'Experience',
    distance: Number(place.distance || 0),
    rating: Number(place.rating || 4.8),
    review_count: place.review_count || place.reviews || 1200 + index * 117,
    price: Number(place.price || place.entry_fee || 0),
    free_entry: Number(place.price || place.entry_fee || 0) === 0,
    has_ar: Boolean(place.has_ar || place.ar_model_url),
    image:
      place.image ||
      place.images?.[0] ||
      FALLBACK_PLACES[index % FALLBACK_PLACES.length].image,
    score: Number(place.score || 8.7 + (index % 5) * 0.2).toFixed(1),
    region:
      place.region ||
      place.country ||
      (index % 2 === 0 ? 'India' : 'Asia'),
    lat: Number.isFinite(lat) ? lat : FALLBACK_PLACES[index % FALLBACK_PLACES.length].lat,
    lng: Number.isFinite(lng) ? lng : FALLBACK_PLACES[index % FALLBACK_PLACES.length].lng,
    coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    city: place.city || '',
    type: place.type || '',
    tags: place.tags || []
  };
}
