import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getPlaces } from '../api/placeApi';
import { extractArray, extractData, extractMessage } from '../api/responseUtils';
import MapView from '../components/map/MapView';
import PlaceCard from '../components/tour/PlaceCard';
import { useLocationContext } from '../context/LocationContext';
import { FALLBACK_PLACES } from '../constants/homeData';
import { haversine } from '../utils/geoUtils';
import { normalizePlace } from '../utils/normalizePlace';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_RADIUS_KM = 20;
const FILTER_CHIPS = ['All', 'Top Rated', 'AR', 'Free Entry', 'Nearest'];

function NearbySkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton aspect-[20/19] rounded-[var(--r-lg)]" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-3/5" />
      <div className="skeleton h-4 w-2/5" />
    </div>
  );
}

function isPlaceCollection(value) {
  return Array.isArray(value) && value.some((item) => item && typeof item === 'object');
}

function resolveNearbyPlaces(response) {
  const directList = extractArray(response, ['places', 'items', 'results']);

  if (directList.length) {
    return directList;
  }

  const data = extractData(response);
  const nestedCandidates = [
    data?.places?.items,
    data?.places?.results,
    data?.places?.docs,
    data?.items?.places,
    data?.results?.places,
    data?.data?.places,
    data?.data?.items
  ];

  for (const candidate of nestedCandidates) {
    if (isPlaceCollection(candidate)) {
      return candidate;
    }
  }

  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (isPlaceCollection(value)) {
        return value;
      }

      if (value && typeof value === 'object') {
        for (const nestedValue of Object.values(value)) {
          if (isPlaceCollection(nestedValue)) {
            return nestedValue;
          }
        }
      }
    }
  }

  return [];
}

function enrichNearbyPlace(place, index, userLocation) {
  const normalized = normalizePlace(place, index);
  const distance = userLocation && Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng)
    ? haversine(userLocation.lat, userLocation.lng, normalized.lat, normalized.lng)
    : Number(normalized.distance || 0);

  return {
    ...normalized,
    distance,
    distanceLabel: `${distance.toFixed(1)} km away`,
    location_name: normalized.location_name || normalized.city || 'TourVision destination'
  };
}

/**
 * Nearby places experience with live location fetch, map, filters, and result list.
 */
export default function NearbyPage() {
  const navigate = useNavigate();
  const { error: locationError, isLocating, location, requestLocation } = useLocationContext();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChip, setActiveChip] = useState('All');
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    console.log('NEARBY PLACES:', places);
  }, [places]);

  useEffect(() => {
    let isMounted = true;

    const loadNearbyPlaces = async () => {
      if (!location?.lat || !location?.lng) {
        if (isMounted) {
          setPlaces([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setUsedFallback(false);

      try {
        const response = await getPlaces({
          lat: location.lat,
          lng: location.lng,
          radius: DEFAULT_RADIUS_KM
        });

        console.log('NEARBY DATA:', response);

        const nearbyItems = resolveNearbyPlaces(response);
        const list = nearbyItems.map((place, index) =>
          enrichNearbyPlace(place, index, location)
        );

        if (isMounted) {
          setPlaces(list);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(extractMessage(error, 'Unable to load nearby places.'));
          setPlaces(
            FALLBACK_PLACES.map((place, index) => enrichNearbyPlace(place, index, location))
          );
          setUsedFallback(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadNearbyPlaces();

    return () => {
      isMounted = false;
    };
  }, [location?.lat, location?.lng]);

  const results = useMemo(() => {
    let filtered = [...places];

    if (activeChip === 'Top Rated') {
      filtered.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (activeChip === 'AR') {
      filtered = filtered.filter((place) => place.has_ar);
    } else if (activeChip === 'Free Entry') {
      filtered = filtered.filter((place) => Number(place.price || 0) === 0);
    } else if (activeChip === 'Nearest') {
      filtered.sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
    }

    return filtered;
  }, [activeChip, places]);

  const mapPanel = (
    <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-text-secondary)]">Map View</p>
          <p className="mt-1 font-semibold">Nearby places around you</p>
        </div>
        <span className="badge badge-teal">{results.length} pins</span>
      </div>
      <div className="h-[380px] sm:h-[460px]">
        <MapView
          center={location || DEFAULT_CENTER}
          places={results}
          userLocation={location}
          onMarkerClick={(place) => navigate(`/place/${place.id}`)}
          zoom={location ? 13 : 5}
        />
      </div>
    </div>
  );

  if (!location && !isLocating) {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-[var(--r-xl)] border border-[var(--c-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--c-text-secondary)]">Nearby Places</p>
            <h1 className="mt-3 text-[2rem]">Enable location to see places around you</h1>
            <p className="mt-3 text-[var(--c-text-secondary)]">
              {locationError || 'We need your current location to fetch nearby places and calculate distance.'}
            </p>
            <button type="button" onClick={requestLocation} className="btn-primary mt-6">
              Enable Location
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="mb-6">
          <p className="text-sm text-[var(--c-text-secondary)]">
            Discover places within {DEFAULT_RADIUS_KM} km of your current location.
          </p>
          <h1 className="mt-1 text-[2rem]">Nearby Places</h1>
        </div>

        {mapPanel}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="filter-chips py-0">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${activeChip === chip ? 'active' : ''}`}
                onClick={() => setActiveChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMobileMapOpen(true)}
            className="btn-outline btn-sm lg:hidden"
          >
            View Map
          </button>
        </div>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--c-text-secondary)]">Results</p>
              <h2 className="mt-1 text-[1.5rem] font-bold">Nearby Places List</h2>
            </div>
            <div className="text-right text-sm text-[var(--c-text-secondary)]">
              <p>{loading ? 'Finding places...' : `${results.length} places found`}</p>
              {usedFallback ? <p>Showing fallback recommendations</p> : null}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <NearbySkeleton key={`nearby-skeleton-${index}`} />
              ))}
            </div>
          ) : results.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-3">
              {results.map((place) => (
                <PlaceCard
                  key={place.id}
                  meta={place.distanceLabel}
                  onSelect={(selected) => navigate(`/place/${selected.id}`)}
                  place={place}
                />
              ))}
            </div>
          ) : (
            <div className="card card-bordered flex items-center gap-4 p-6">
              <div className="text-3xl">🧭</div>
              <div>
                <p className="font-semibold">No nearby places found</p>
                <p className="text-sm text-[var(--c-text-secondary)]">
                  Try increasing your search radius or moving to a busier area.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {mobileMapOpen ? (
        <div className="bottom-sheet-overlay lg:hidden">
          <div className="bottom-sheet !p-0">
            <div className="bottom-sheet-handle mt-3" />
            <div className="px-4 pb-4">
              <div className="h-[56vh] overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)]">
                <MapView
                  center={location || DEFAULT_CENTER}
                  places={results}
                  userLocation={location}
                  onMarkerClick={(place) => navigate(`/place/${place.id}`)}
                  zoom={location ? 13 : 5}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-semibold">{results.length} places</p>
                <button type="button" className="btn-outline btn-sm" onClick={() => setMobileMapOpen(false)}>
                  Close Map
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
