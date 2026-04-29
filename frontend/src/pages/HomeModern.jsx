import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getPlaces, scanQr } from "../api/placeApi";
import { extractArray as sharedExtractArray, extractData, extractMessage } from "../api/responseUtils";
import QRScanner from "../components/qr/QRScanner";
import { useLocationContext } from "../context/LocationContext";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  { icon: "🏛", label: "Monuments", color: "bg-amber-50 text-amber-600" },
  { icon: "🌿", label: "Nature", color: "bg-green-50 text-green-600" },
  { icon: "🍜", label: "Food", color: "bg-red-50 text-red-600" },
  { icon: "🎭", label: "Culture", color: "bg-purple-50 text-purple-600" },
  { icon: "🏖", label: "Beaches", color: "bg-sky-50 text-sky-600" },
  { icon: "🚵", label: "Adventure", color: "bg-orange-50 text-orange-600" },
];

const FALLBACK_PLACES = [
  {
    id: 1,
    name: "Amber Fort",
    location_name: "Jaipur, India",
    distance: 2.1,
    rating: 4.9,
    review_count: 2341,
    price: 0,
    free_entry: true,
    has_ar: true,
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&auto=format&fit=crop&q=80",
    score: 9.1,
  },
  {
    id: 2,
    name: "Marine Drive",
    location_name: "Mumbai, India",
    distance: 3.4,
    rating: 4.8,
    review_count: 1820,
    price: 250,
    free_entry: false,
    has_ar: false,
    image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&auto=format&fit=crop&q=80",
    score: 8.9,
  },
  {
    id: 3,
    name: "Humayun Tomb",
    location_name: "Delhi, India",
    distance: 5.3,
    rating: 4.9,
    review_count: 3011,
    price: 300,
    free_entry: false,
    has_ar: true,
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&auto=format&fit=crop&q=80",
    score: 9.4,
  },
  {
    id: 4,
    name: "Sunset Cliffs",
    location_name: "Goa, India",
    distance: 1.8,
    rating: 4.7,
    review_count: 954,
    price: 0,
    free_entry: true,
    has_ar: false,
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80",
    score: 8.8,
  },
];

function normalizePlace(place, index) {
  return {
    id: place.id || index + 1,
    name: place.name || place.title || `Place ${index + 1}`,
    location_name: place.location_name || place.city || "TourVision destination",
    distance: Number(place.distance || 0),
    rating: Number(place.rating || 4.8),
    review_count: place.review_count || place.reviews || 1200,
    price: Number(place.price || place.entry_fee || 0),
    free_entry: Number(place.price || place.entry_fee || 0) === 0,
    has_ar: Boolean(place.has_ar || place.ar_model_url),
    image: place.image || place.images?.[0] || FALLBACK_PLACES[index % FALLBACK_PLACES.length].image,
    score: Number(place.score || 8.7 + (index % 5) * 0.2).toFixed(1),
  };
}

function extractArray(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  const d = response.data ?? response;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.places)) return d.places;
  if (d && Array.isArray(d.results)) return d.results;
  if (d && Array.isArray(d.items)) return d.items;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

function PlaceCard({ place, onOpen, onToggleSave, saved }) {
  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg hover:border-slate-300"
      onClick={() => onOpen(place)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          alt={place.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          src={place.image}
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {place.has_ar && (
            <span className="rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-xs font-semibold text-slate-700">
              ✨ AR
            </span>
          )}
          {place.free_entry && (
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              FREE
            </span>
          )}
        </div>
        {/* Heart button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(place.id);
          }}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur transition hover:bg-white"
          aria-label="Save place"
        >
          <span className="text-lg">{saved ? "❤️" : "🤍"}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-heading font-semibold text-slate-900 line-clamp-1">{place.name}</h3>
          <div className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1">
            <span className="text-xs font-bold text-slate-900">★ {Number(place.score).toFixed(1)}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-3 line-clamp-1">{place.location_name}</p>

        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900">
            {place.distance > 0 ? `${place.distance.toFixed(1)} km away` : "Nearby"}
          </span>
          <span className="text-slate-500">{Number(place.review_count).toLocaleString()} reviews</span>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="font-semibold text-slate-900">
            {place.free_entry ? "Free Entry" : `₹${place.price} / person`}
          </p>
        </div>
      </div>
    </article>
  );
}

PlaceCard.propTypes = {
  place: PropTypes.shape({
    distance: PropTypes.number,
    free_entry: PropTypes.bool,
    has_ar: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    image: PropTypes.string.isRequired,
    location_name: PropTypes.string,
    name: PropTypes.string.isRequired,
    price: PropTypes.number,
    rating: PropTypes.number,
    review_count: PropTypes.number,
    score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onToggleSave: PropTypes.func.isRequired,
  saved: PropTypes.bool,
};

PlaceCard.defaultProps = {
  saved: false,
};

/**
 * Modern mobile-first Home page with greeting, location, and trending places.
 */
export default function HomeModern() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location, enableLocation } = useLocationContext();

  const [trendingPlaces, setTrendingPlaces] = useState(FALLBACK_PLACES);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Fetch trending places
  useEffect(() => {
    let isMounted = true;

    const loadTrending = async () => {
      if (!location) return;
      setLoading(true);
      try {
        const response = await getPlaces({
          lat: location.lat,
          lng: location.lng,
          radius: 20,
        });
        const list = sharedExtractArray(response);
        const normalized = list.map(normalizePlace);
        if (isMounted && normalized.length) {
          setTrendingPlaces(normalized);
        }
      } catch (error) {
        console.warn("Trending places fallback engaged.", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTrending();
    return () => {
      isMounted = false;
    };
  }, [location]);

  const handleOpenPlace = (place) => {
    navigate(`/place/${place.id}`);
  };

  const handleToggleSave = (placeId) => {
    setSavedIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const handleQrDetected = async (decodedText) => {
    try {
      const response = await scanQr({ qr_data: decodedText });
      const data = extractData(response);
      const placeId = data?.place_id || data?.placeId;
      if (!placeId) throw new Error("QR scan did not return a place id.");
      setScannerOpen(false);
      toast.success("Opening your landmark experience.");
      navigate(`/place/${placeId}`);
    } catch (error) {
      toast.error(extractMessage(error, "Unable to process this QR code."));
    }
  };

  const greeting = user?.name ? `Hi, ${user.name}` : "Welcome to TourVision";
  const timeOfDay = new Date().getHours() < 12 ? "🌅" : new Date().getHours() < 18 ? "☀️" : "🌙";

  return (
    <>
      {scannerOpen && <QRScanner onDetected={handleQrDetected} onClose={() => setScannerOpen(false)} />}

      {/* ── GREETING SECTION ── */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="flex items-center gap-2 font-heading text-2xl sm:text-3xl font-bold text-slate-900">
            <span>{timeOfDay}</span> {greeting}
          </h1>
          <p className="mt-2 text-slate-600">Discover amazing places near you</p>
        </div>
      </section>

      {/* ── LOCATION SECTION ── */}
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {location ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your Location</p>
                  <p className="text-xs text-slate-600">{location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}</p>
                </div>
              </div>
              <button type="button" onClick={enableLocation} className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                Update
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable Location</p>
                  <p className="text-xs text-slate-600">Get personalized recommendations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={enableLocation}
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Enable
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">Explore by Category</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.label}
                type="button"
                onClick={() => navigate('/nearby')}
                className={`flex flex-shrink-0 flex-col items-center gap-2 rounded-xl ${category.color} px-4 py-3 transition hover:shadow-md`}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs font-semibold whitespace-nowrap">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING PLACES ── */}
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Trending Now</h2>
            <button
              type="button"
              onClick={() => navigate('/nearby')}
              className="text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              View All →
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full border-4 border-slate-200 border-t-teal-600 h-12 w-12" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trendingPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onOpen={handleOpenPlace}
                  onToggleSave={handleToggleSave}
                  saved={savedIds.includes(place.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── QR SCAN FLOATING BUTTON ── */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700 hover:shadow-xl lg:bottom-8"
        aria-label="Scan QR code"
      >
        <span className="text-2xl">📷</span>
      </button>
    </>
  );
}
