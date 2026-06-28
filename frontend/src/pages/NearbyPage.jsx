import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getPlaceById } from "../api/placeApi";
import {
  extractArray,
  extractData,
  extractMessage,
} from "../api/responseUtils";
import MapView from "../components/map/MapView";
import { useLocationContext } from "../context/LocationContext";
import { haversine } from "../utils/geoUtils";
import { normalizePlace } from "../utils/normalizePlace";
import { resolvePlaceImage } from "../utils/placeImages";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_RADIUS_KM = 100;
const FILTER_CHIPS = [
  "All",
  "Top Rated",
  "Free Entry",
  "Nearest",
];
const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100, 250, 500];
const AVG_DRIVE_SPEED_KMH = 32;
const MAIN_HERITAGE_PLACE_IDS = [
  "rajgad_fort",
  "raigad_fort",
  "shaniwar_wada",
  "sinhagad_fort",
];

function formatDuration(minutes) {
  const rounded = Math.max(1, Math.round(minutes || 1));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (!hours) {
    return `${mins} min`;
  }

  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function estimateDriveMinutes(distanceKm) {
  return (Number(distanceKm || 0) / AVG_DRIVE_SPEED_KMH) * 60;
}

function buildGoogleMapsUrl(origin, destination) {
  const source = `${origin.lat},${origin.lng}`;
  const target = `${destination.lat},${destination.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: source,
    destination: target,
    dir_action: "navigate",
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatCoordinateLabel(point) {
  if (!point?.lat || !point?.lng) {
    return "";
  }

  return `${Number(point.lat).toFixed(5)}, ${Number(point.lng).toFixed(5)}`;
}

async function fetchRoute(origin, destination, fallbackDistanceKm) {
  const directDistance = Number.isFinite(Number(fallbackDistanceKm))
    ? Number(fallbackDistanceKm)
    : haversine(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
      );
  const fallbackRoute = {
    distanceKm: directDistance,
    durationMin: estimateDriveMinutes(directDistance),
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    source: "direct",
  };

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
    );

    if (!response.ok) {
      return fallbackRoute;
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route?.geometry?.coordinates?.length) {
      return fallbackRoute;
    }

    return {
      distanceKm: Number(route.distance || 0) / 1000,
      durationMin: Number(route.duration || 0) / 60,
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: "osrm",
    };
  } catch {
    return fallbackRoute;
  }
}

function isPlaceCollection(value) {
  return (
    Array.isArray(value) &&
    value.some((item) => item && typeof item === "object")
  );
}

function resolveNearbyPlaces(response) {
  const directList = extractArray(response, ["places", "items", "results"]);

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
    data?.data?.items,
  ];

  for (const candidate of nestedCandidates) {
    if (isPlaceCollection(candidate)) {
      return candidate;
    }
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (isPlaceCollection(value)) {
        return value;
      }

      if (value && typeof value === "object") {
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
  const distance =
    userLocation &&
    Number.isFinite(normalized.lat) &&
    Number.isFinite(normalized.lng)
      ? haversine(
          userLocation.lat,
          userLocation.lng,
          normalized.lat,
          normalized.lng,
        )
      : Number(normalized.distance || 0);

  return {
    ...normalized,
    distance,
    distanceLabel: `${distance.toFixed(1)} km away`,
    location_name:
      normalized.location_name || normalized.city || "TourVision destination",
  };
}

function NearbySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="skeleton h-24 rounded-2xl" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 17 17 7M9 7h8v8"
      />
    </svg>
  );
}

function RouteInfoPanel({
  isExpanded,
  isLoading,
  onClear,
  onToggle,
  routeInfo,
  selectedPlace,
}) {
  const destinationLabel =
    routeInfo?.destinationLabel || selectedPlace?.name || "Selected place";
  const startLabel = routeInfo?.originLabel || "Your live location";
  const title = `${startLabel} -> ${destinationLabel}`;

  return (
    <div className="absolute inset-x-3 bottom-3 z-[1200] animate-route-panel rounded-t-2xl border border-white/70 bg-white/90 p-3 shadow-xl shadow-slate-700/20 backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[21rem] sm:rounded-2xl sm:p-4">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
            {isLoading ? "Calculating route" : "Route"}
          </p>
          <h2 className="mt-1 truncate text-base font-black leading-6 text-slate-950">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-200 sm:hidden"
            onClick={onToggle}
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>

      <div
        className={`${isExpanded ? "grid" : "hidden sm:grid"} mt-3 grid-cols-2 gap-2`}
      >
        <div className="rounded-2xl bg-slate-50/95 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Distance
          </p>
          <p className="mt-1 text-lg font-black leading-none text-slate-950">
            {routeInfo?.distanceKm
              ? `${routeInfo.distanceKm.toFixed(1)} km`
              : isLoading
                ? "..."
                : "0.0 km"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50/95 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Est. time
          </p>
          <p className="mt-1 text-lg font-black leading-none text-slate-950">
            {routeInfo?.durationMin
              ? formatDuration(routeInfo.durationMin)
              : isLoading
                ? "..."
                : formatDuration(0)}
          </p>
        </div>
      </div>

      <div
        className={`${isExpanded ? "grid" : "hidden sm:grid"} mt-2 gap-2 text-xs font-semibold text-slate-600`}
      >
        <p className="rounded-2xl bg-white/75 px-3 py-2">
          Start: {startLabel}
          {routeInfo?.originCoordinateLabel ? (
            <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
              {routeInfo.originCoordinateLabel}
            </span>
          ) : null}
        </p>
        <p className="rounded-2xl bg-white/75 px-3 py-2">
          Destination: {destinationLabel}
          {routeInfo?.destinationCoordinateLabel ? (
            <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
              {routeInfo.destinationCoordinateLabel}
            </span>
          ) : null}
        </p>
      </div>

      {routeInfo?.googleMapsUrl ? (
        <a
          className={`${isExpanded ? "inline-flex" : "hidden sm:inline-flex"} mt-3 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-slate-950 to-teal-700 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 hover:shadow-xl`}
          href={routeInfo.googleMapsUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open in Google Maps
          <ExternalLinkIcon />
        </a>
      ) : null}
    </div>
  );
}

function PlaceListCard({
  isRouting,
  isSelected,
  onAiGuide,
  onExplore,
  onSelect,
  onShowRoute,
  place,
}) {
  const image = resolvePlaceImage(
    place,
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=700&auto=format&fit=crop&q=80",
  );
  const rating = Number(place.rating || 4.8).toFixed(1);
  const price = Number(place.price || place.entry_fee || 0);
  const hasAi = Boolean(
    place.has_ai_content || place.ai_content_available || true,
  );
  const travelTime = formatDuration(
    Number.isFinite(Number(place.durationMin))
      ? Number(place.durationMin)
      : estimateDriveMinutes(place.distance),
  );
  const isService = place.type === "service";

  return (
    <article
      className={[
        "group min-w-[82vw] cursor-pointer overflow-hidden rounded-2xl border bg-white p-3 shadow-sm transition-all duration-300 sm:min-w-0",
        isSelected
          ? "border-teal-400 shadow-xl shadow-teal-500/15 ring-4 ring-teal-100"
          : "border-slate-200/80 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/80",
      ].join(" ")}
      onClick={onSelect}
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          <img
            alt={place.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={image}
          />
          {isSelected ? (
            <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-teal-300 shadow-lg shadow-teal-300/60" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold text-slate-950">
                {place.name}
              </h3>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {place.location_name}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
              ★ {rating}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {place.distanceLabel ||
                `${Number(place.distance || 0).toFixed(1)} km`}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
              {travelTime} drive
            </span>
            {hasAi ? (
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                AI Guide
              </span>
            ) : null}
            {price === 0 ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                Free
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex gap-2">
            {!isService ? (
              <button
                type="button"
                className="rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-teal-700"
                onClick={(event) => {
                  event.stopPropagation();
                  onExplore();
                }}
              >
                Explore
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-teal-600 px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-70"
              disabled={isRouting}
              onClick={(event) => {
                event.stopPropagation();
                onShowRoute();
              }}
            >
              {isRouting ? "Routing..." : "Show Route"}
            </button>
            {!isService ? (
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-extrabold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                onClick={(event) => {
                  event.stopPropagation();
                  onAiGuide();
                }}
              >
                AI Guide
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

PlaceListCard.propTypes = {
  isRouting: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onAiGuide: PropTypes.func.isRequired,
  onExplore: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onShowRoute: PropTypes.func.isRequired,
  place: PropTypes.shape({
    ai_content_available: PropTypes.bool,
    distance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    distanceLabel: PropTypes.string,
    durationMin: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    entry_fee: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    has_ai_content: PropTypes.bool,
    image: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    location_name: PropTypes.string,
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tags: PropTypes.arrayOf(PropTypes.string),
    type: PropTypes.string,
  }).isRequired,
};

export default function NearbyPage() {
  const navigate = useNavigate();
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const {
    error: locationError,
    isLocating,
    location,
    requestLocation,
  } = useLocationContext();
  const [liveLocation, setLiveLocation] = useState(null);
  const [debouncedLocation, setDebouncedLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChip, setActiveChip] = useState("All");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [search, setSearch] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [routePanelExpanded, setRoutePanelExpanded] = useState(true);
  const [routeLoadingId, setRouteLoadingId] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const activeLocation = liveLocation || location;
  const routeOrigin = debouncedLocation || activeLocation;

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        setLiveLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeLocation?.lat || !activeLocation?.lng) {
      setDebouncedLocation(null);
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setDebouncedLocation({
        lat: Number(activeLocation.lat),
        lng: Number(activeLocation.lng),
        accuracy: activeLocation.accuracy,
      });
    }, 450);

    return () => window.clearTimeout(timerId);
  }, [activeLocation?.accuracy, activeLocation?.lat, activeLocation?.lng]);

  useEffect(() => {
    let isMounted = true;

    const loadNearbyPlaces = async () => {
      if (!debouncedLocation?.lat || !debouncedLocation?.lng) {
        if (isMounted) {
          setPlaces([]);
          setLoading(false);
          setRouteInfo(null);
        }
        return;
      }

      setLoading(true);
      setUsedFallback(false);

      try {
        const responses = await Promise.all(
          MAIN_HERITAGE_PLACE_IDS.map((placeId) => getPlaceById(placeId)),
        );
        const list = responses
          .map((response) => extractData(response)?.place)
          .filter(Boolean)
          .map((place, index) => enrichNearbyPlace(place, index, debouncedLocation))
          .filter((place) => place.distance <= radiusKm);

        if (isMounted) {
          setPlaces(list);
          setSelectedPlaceId(list[0]?.id || null);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(extractMessage(error, "Unable to load nearby places."));
          setPlaces([]);
          setSelectedPlaceId(null);
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
  }, [debouncedLocation?.lat, debouncedLocation?.lng, radiusKm]);

  const results = useMemo(() => {
    let filtered = [...places];
    const query = search.trim().toLowerCase();

    if (query) {
      filtered = filtered.filter((place) =>
        `${place.name} ${place.location_name} ${place.category || ""} ${place.type || ""}`
          .toLowerCase()
          .includes(query),
      );
    }

    if (activeChip === "Top Rated") {
      filtered.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (activeChip === "Free Entry") {
      filtered = filtered.filter(
        (place) => Number(place.price || place.entry_fee || 0) === 0,
      );
    } else if (activeChip === "Nearest") {
      filtered.sort(
        (a, b) => Number(a.distance || 0) - Number(b.distance || 0),
      );
    }

    return filtered;
  }, [activeChip, places, search]);

  const selectedPlace = useMemo(
    () =>
      results.find((place) => String(place.id) === String(selectedPlaceId)) ||
      results[0] ||
      null,
    [results, selectedPlaceId],
  );
  const routeLoadingPlace = useMemo(
    () =>
      results.find((place) => String(place.id) === String(routeLoadingId)) ||
      selectedPlace,
    [results, routeLoadingId, selectedPlace],
  );
  const routePanelVisible = Boolean(routeInfo || routeLoadingId);

  const mapCenter =
    selectedPlace?.lat && selectedPlace?.lng
      ? { lat: Number(selectedPlace.lat), lng: Number(selectedPlace.lng) }
      : routeOrigin || DEFAULT_CENTER;

  const selectPlace = (place) => {
    setSelectedPlaceId(place.id);
  };

  const setChip = (chip) => {
    setActiveChip(chip);
  };

  const showRoute = async (place) => {
    if (!routeOrigin?.lat || !routeOrigin?.lng) {
      toast.error("Live location is required to show a route.");
      return;
    }

    if (
      !Number.isFinite(Number(place.lat)) ||
      !Number.isFinite(Number(place.lng))
    ) {
      toast.error("This place does not have valid map coordinates.");
      return;
    }

    setSelectedPlaceId(place.id);
    setRouteLoadingId(place.id);
    setRoutePanelExpanded(true);

    const origin = {
      lat: Number(routeOrigin.lat),
      lng: Number(routeOrigin.lng),
    };
    const destination = {
      lat: Number(place.lat),
      lng: Number(place.lng),
    };
    const startingDistanceKm = Number(place.distance || 0);
    const startingDurationMin = Number.isFinite(Number(place.durationMin))
      ? Number(place.durationMin)
      : estimateDriveMinutes(startingDistanceKm);

    setRouteInfo({
      distanceKm: startingDistanceKm,
      durationMin: startingDurationMin,
      coordinates: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      source: "card",
      originLabel: "Your live location",
      originCoordinateLabel: formatCoordinateLabel(origin),
      destinationLabel: place.name,
      destinationCoordinateLabel: formatCoordinateLabel(destination),
      googleMapsUrl: buildGoogleMapsUrl(origin, destination),
      placeId: place.id,
    });

    const route = await fetchRoute(origin, destination, startingDistanceKm);
    const distanceLabel = `${route.distanceKm.toFixed(1)} km away`;

    setPlaces((currentPlaces) =>
      currentPlaces.map((currentPlace) =>
        String(currentPlace.id) === String(place.id)
          ? {
              ...currentPlace,
              distance: route.distanceKm,
              distanceLabel,
              durationMin: route.durationMin,
            }
          : currentPlace,
      ),
    );

    setRouteInfo({
      ...route,
      originLabel: "Your live location",
      originCoordinateLabel: formatCoordinateLabel(origin),
      destinationLabel: place.name,
      destinationCoordinateLabel: formatCoordinateLabel(destination),
      googleMapsUrl: buildGoogleMapsUrl(origin, destination),
      placeId: place.id,
    });
    setRouteLoadingId(null);
  };

  const explorePlace = (place) => {
    navigate(`/place/${place.id}`);
  };

  const startGuide = (place) => {
    navigate(`/place/${place.id}`);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("tourvision:start-ai-guide", {
          detail: { placeId: place.id },
        }),
      );
    }, 600);
  };

  const mapPanel = (
    <div className="relative isolate h-full min-h-[360px] overflow-hidden bg-slate-100">
      {loading ? (
        <div className="absolute inset-0 z-[1100] bg-white/80 p-5 backdrop-blur-sm">
          <div className="skeleton h-full rounded-2xl" />
        </div>
      ) : null}
      <div className="absolute inset-0 z-0">
        <MapView
          center={mapCenter}
          places={results}
          routeCoordinates={routeInfo?.coordinates || []}
          routePanelVisible={routePanelVisible}
          selectedPlaceId={selectedPlace?.id}
          userLocation={routeOrigin}
          onMarkerClick={selectPlace}
          zoom={routeOrigin ? 13 : 5}
        />
      </div>
      <div
        className={[
          "pointer-events-none absolute z-[1190] rounded-full border border-white/60 bg-white/90 px-4 py-2 text-sm font-extrabold text-slate-800 shadow-lg backdrop-blur-xl",
          routePanelVisible
            ? "right-4 top-4 sm:bottom-5 sm:left-5 sm:right-auto sm:top-auto"
            : "bottom-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto",
        ].join(" ")}
      >
        {results.length} places
      </div>
      {routePanelVisible ? (
        <RouteInfoPanel
          isExpanded={routePanelExpanded}
          isLoading={Boolean(routeLoadingId)}
          routeInfo={routeInfo}
          selectedPlace={routeLoadingPlace}
          onClear={() => {
            setRouteInfo(null);
            setRouteLoadingId(null);
          }}
          onToggle={() => setRoutePanelExpanded((current) => !current)}
        />
      ) : null}
    </div>
  );

  if (!activeLocation && !isLocating) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-teal-50 py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-200/70 backdrop-blur-xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
              Nearby Places
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Enable location to explore around you
            </h1>
            <p className="mt-4 text-slate-600">
              {locationError ||
                "We need your current location to fetch nearby historical places and calculate distance."}
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="btn-primary mt-7"
            >
              Enable Location
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/60 py-6 lg:py-8">
      <div className="container">
        <div className="mb-5 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm shadow-slate-200/80 backdrop-blur-xl sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">
                Nearby Places
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Explore Nearby Heritage Places
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Discover nearby heritage places with routes, ratings,
                AI guidance, and directions.
              </p>
            </div>
            <label className="relative block">
              <span className="sr-only">Search nearby places</span>
              <input
                className="h-12 w-full rounded-full border border-slate-200 bg-white px-5 pr-12 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                placeholder="Search forts or landmarks"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={[
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold transition-all duration-300",
                    activeChip === chip
                      ? "bg-gradient-to-r from-slate-950 to-teal-700 text-white shadow-lg shadow-teal-500/20"
                      : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-teal-200 hover:text-teal-800",
                  ].join(" ")}
                  onClick={() => setChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <label className="flex items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm sm:justify-start">
                <span>Radius</span>
                <select
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="bg-transparent text-xs font-extrabold text-slate-800 outline-none"
                >
                  {RADIUS_OPTIONS_KM.map((option) => (
                    <option key={option} value={option}>
                      {option} km
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm font-semibold text-slate-500">
                {loading
                  ? "Finding database heritage places..."
                  : `${results.length} database heritage places within ${radiusKm} km`}
                {usedFallback ? (
                  <span className="ml-2 text-amber-600">Fallback results</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <aside className="order-2 lg:order-1">
            <div className="mb-3 hidden items-center justify-between lg:flex">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                Results
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                DB heritage only
              </span>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:max-h-[75vh] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <NearbySkeleton key={`nearby-skeleton-${index}`} />
                ))}
              </div>
            ) : results.length ? (
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:max-h-[75vh] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
                {results.map((place) => (
                  <PlaceListCard
                    key={place.id}
                    isRouting={String(routeLoadingId) === String(place.id)}
                    isSelected={String(place.id) === String(selectedPlace?.id)}
                    onAiGuide={() => startGuide(place)}
                    onExplore={() => explorePlace(place)}
                    onSelect={() => showRoute(place)}
                    onShowRoute={() => showRoute(place)}
                    place={place}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-extrabold text-slate-950">
                  No nearby places found
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Try another filter or search term.
                </p>
              </div>
            )}
          </aside>

          <section className="order-1 h-[56vh] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/50 lg:sticky lg:top-20 lg:order-2 lg:h-[calc(100vh-6rem)]">
            {mapPanel}
          </section>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("tourvision:open-chat"))}
        className="fixed bottom-24 right-4 z-30 rounded-full border border-white/60 bg-white/75 px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-xl shadow-slate-400/30 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white lg:bottom-8"
      >
        AI Guide
      </button>
    </div>
  );
}
