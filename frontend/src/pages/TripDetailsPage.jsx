import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ExpenseTracker from '../components/expense/ExpenseTracker';
import MapView from '../components/map/MapView';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  DEFAULT_ORIGIN,
  TRANSPORT_OPTIONS,
  buildGoogleMapsUrl,
  fetchRoutePlan,
  formatCurrency,
  formatDistance,
  formatDuration,
  getNearestStop,
  getRemainingRouteCoordinates,
  getRouteDistanceKm,
  resolveDestinationPlace
} from '../utils/tripPlanning';
import {
  STATUS_META,
  TRIP_STATUSES,
  calculateTripSummary,
  readTripsFromStorage,
  updateTripStatus,
  writeTripsToStorage
} from '../utils/tripExpenses';

const GEOFENCE_RADIUS_KM = 0.2;

function ProgressRing({ value }) {
  const progress = Math.min(100, Math.max(0, Number(value || 0)));

  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full bg-slate-100">
      <div className="absolute inset-0 rounded-full transition-all duration-700" style={{ background: `conic-gradient(#10b981 ${progress * 3.6}deg, #e2e8f0 0deg)` }} />
      <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white shadow-inner">
        <span className="text-3xl font-black text-slate-950">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function ConfirmationModal({ action, onClose, onConfirm }) {
  if (!action) {
    return null;
  }

  const labels = {
    cancel: ['Cancel trip', 'This moves the trip into Cancelled Trips and keeps its history.'],
    complete: ['Complete trip', 'This marks the journey complete and moves it into Completed Trips.'],
    delete: ['Delete trip', 'This permanently removes the trip and all linked expenses from this device.'],
    pause: ['Pause trip', 'Live progress will stop changing until you resume the trip.']
  };
  const [title, body] = labels[action.type] || labels.cancel;
  const destructive = action.type === 'delete';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{action.trip.name}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700" onClick={onClose}>
            Keep Trip
          </button>
          <button
            type="button"
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-lg ${destructive ? 'bg-rose-600' : 'bg-slate-950'}`}
            onClick={() => onConfirm(action)}
          >
            {destructive ? 'Delete' : title}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildFallbackRoutePlan(trip) {
  const stops = (trip.destinationDetails?.length ? trip.destinationDetails : trip.destinations || []).map(resolveDestinationPlace);
  const routeCoordinates = trip.routeData?.routeCoordinates?.length
    ? trip.routeData.routeCoordinates
    : stops.map((stop) => [stop.lat, stop.lng]);

  return {
    routeCoordinates,
    segments: trip.routeData?.segments || [],
    source: trip.routeData?.source || 'stored',
    stops,
    totalDistanceKm: Number(trip.routeData?.distanceKm || 0),
    totalDurationMin: Number(trip.routeData?.etaMinutes || 0)
  };
}

function getTripProgress(trip, stops) {
  const completedStopIds = trip.routeData?.completedStopIds || [];
  const visitedCount = completedStopIds.length || Number(trip.routeData?.currentStopIndex || 0);
  return {
    completedStopIds,
    progress: stops.length ? Math.round((Math.min(visitedCount, stops.length) / stops.length) * 100) : 0,
    visitedCount: Math.min(visitedCount, stops.length)
  };
}

function ManageTripMap({ completedStopIds, location, remainingCoordinates, routePlan, selectedPlaceId, setSelectedPlaceId }) {
  const [focusedLocation, setFocusedLocation] = useState(null);
  const places = routePlan.stops.map((stop) => ({
    ...stop,
    status: completedStopIds.includes(stop.id) ? 'completed' : 'upcoming',
    statusLabel: completedStopIds.includes(stop.id) ? 'Completed' : 'Upcoming'
  }));
  const selectedPlace = places.find((place) => String(place.id) === String(selectedPlaceId));
  const center = focusedLocation || selectedPlace || places[0] || DEFAULT_ORIGIN;

  const handleMarkerClick = (place) => {
    setSelectedPlaceId(place.id);
    setFocusedLocation(place);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl shadow-slate-300/40">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Live Map</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Real location, visited stops, remaining route</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!location}
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setFocusedLocation(location ? { ...location, name: 'Current Location' } : null)}
          >
            Locate Me
          </button>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">OpenStreetMap + Leaflet</span>
        </div>
      </div>
      <div className="h-[470px]">
        <MapView
          center={center}
          onMarkerClick={handleMarkerClick}
          places={places}
          recenterOnCenterChange
          routeCoordinates={remainingCoordinates}
          selectedPlaceId={selectedPlaceId}
          userLocation={location}
          zoom={location ? 13 : 10}
        />
      </div>
    </section>
  );
}

function LiveStats({ locationError, nearest, nextStop, remainingDistanceKm, remainingDurationMin, routeName }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Current stop</p>
        <p className="mt-2 text-xl font-black text-slate-950">{nearest?.stop?.name || 'Locating'}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">{nearest?.distanceKm !== Infinity ? `${Math.round((nearest?.distanceKm || 0) * 1000)} m away` : locationError || 'Waiting for GPS'}</p>
      </div>
      <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Next</p>
        <p className="mt-2 text-xl font-black text-slate-950">{nextStop?.name || 'All stops visited'}</p>
        <p className="mt-1 text-sm font-bold text-slate-500">{routeName}</p>
      </div>
      <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Distance remaining</p>
        <p className="mt-2 text-xl font-black text-slate-950">{formatDistance(remainingDistanceKm)}</p>
      </div>
      <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-slate-200/60">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">ETA</p>
        <p className="mt-2 text-xl font-black text-slate-950">{formatDuration(remainingDurationMin)}</p>
      </div>
    </div>
  );
}

function LiveTripDashboard({ location, locationError, onTripUpdate, routePlan, summary, trip }) {
  const [selectedPlaceId, setSelectedPlaceId] = useState(routePlan.stops[0]?.id || null);
  const { completedStopIds, progress, visitedCount } = getTripProgress(trip, routePlan.stops);
  const nextStop = routePlan.stops.find((stop) => !completedStopIds.includes(stop.id)) || null;
  const nearest = getNearestStop(location, routePlan.stops);
  const remainingCoordinates = getRemainingRouteCoordinates(routePlan.routeCoordinates, location);
  const storedRemainingDistanceKm = Math.max(0, getRouteDistanceKm(remainingCoordinates));
  const remainingDistanceKm = location && remainingCoordinates.length ? storedRemainingDistanceKm : Math.max(0, Number(routePlan.totalDistanceKm || 0) * (1 - progress / 100));
  const transport = TRANSPORT_OPTIONS.find((item) => item.id === trip.transport) || TRANSPORT_OPTIONS[0];
  const remainingDurationMin = remainingDistanceKm ? (remainingDistanceKm / transport.speedKmh) * 60 * transport.timeFactor : 0;
  const routeName = nextStop ? `${nearest?.stop?.name || 'Current location'} -> ${nextStop.name}` : 'Route complete';
  const mapsUrl = nextStop ? buildGoogleMapsUrl(nextStop, location) : null;
  const budgetUsage = trip.totalBudget ? Math.min(100, Math.round((summary.total / trip.totalBudget) * 100)) : 0;

  useEffect(() => {
    if (!location || !nextStop || trip.status !== TRIP_STATUSES.ONGOING) {
      return;
    }

    const distanceToNextKm = getNearestStop(location, [nextStop]).distanceKm;

    if (distanceToNextKm <= GEOFENCE_RADIUS_KM) {
      const nextCompletedStopIds = [...new Set([...(trip.routeData?.completedStopIds || []), nextStop.id])];
      onTripUpdate({
        ...trip,
        routeData: {
          ...trip.routeData,
          completedStopIds: nextCompletedStopIds,
          currentStopIndex: nextCompletedStopIds.length,
          lastArrivalAt: new Date().toISOString(),
          progress: routePlan.stops.length ? Math.round((nextCompletedStopIds.length / routePlan.stops.length) * 100) : 0
        },
        updatedAt: new Date().toISOString()
      });
    }
  }, [location?.lat, location?.lng, nextStop?.id, onTripUpdate, routePlan.stops.length, trip]);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ManageTripMap
          completedStopIds={completedStopIds}
          location={location}
          remainingCoordinates={remainingCoordinates}
          routePlan={routePlan}
          selectedPlaceId={selectedPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
        />

        <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-slate-300/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Manage Trip</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Live journey dashboard</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{trip.status === TRIP_STATUSES.PAUSED ? 'Paused' : 'Tracking with browser GPS'}</p>
            </div>
            <ProgressRing value={progress} />
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black text-slate-500">Trip completion</span>
                <span className="font-black text-slate-950">{visitedCount}/{routePlan.stops.length} visited</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Current route</p>
              <p className="mt-2 text-xl font-black text-emerald-900">{routeName}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black text-slate-500">Budget used</span>
                <span className="font-black text-slate-950">{trip.totalBudget ? `${budgetUsage}%` : 'Open'}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${budgetUsage}%` }} />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-500">{formatCurrency(summary.total)} spent</p>
            </div>
          </div>

          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5">
              Open in Google Maps
            </a>
          ) : null}
        </div>
      </div>

      <LiveStats
        locationError={locationError}
        nearest={nearest}
        nextStop={nextStop}
        remainingDistanceKm={remainingDistanceKm}
        remainingDurationMin={remainingDurationMin}
        routeName={routeName}
      />
    </section>
  );
}

function CompletedTripStats({ routePlan, summary, trip }) {
  const durationDays = trip.startDate && trip.completedAt ? Math.max(1, Math.ceil((new Date(trip.completedAt).getTime() - new Date(trip.startDate).getTime()) / 86400000)) : trip.duration;
  const visitedCount = trip.routeData?.completedStopIds?.length || routePlan.stops.length;

  return (
    <section className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-xl shadow-violet-100/50">
      <h2 className="text-2xl font-black text-violet-900">Completed Trip Stats</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total distance', formatDistance(routePlan.totalDistanceKm || trip.routeData?.distanceKm || 0)],
          ['Total expense', formatCurrency(summary.total)],
          ['Destinations visited', `${visitedCount}/${routePlan.stops.length}`],
          ['Trip duration', `${durationDays || 1} day${durationDays === 1 ? '' : 's'}`]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-400">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TripMemories({ onTripUpdate, trip }) {
  const [isUploading, setIsUploading] = useState(false);
  const memories = trip.memories || [];

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setIsUploading(true);

    const uploaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `memory-${Date.now()}-${file.name}`,
                mediaUrl: reader.result,
                mimeType: file.type,
                name: file.name,
                tripId: trip.id,
                uploadedAt: new Date().toISOString()
              });
            };
            reader.readAsDataURL(file);
          })
      )
    );

    onTripUpdate({
      ...trip,
      coverImage: trip.coverImage || uploaded.find((item) => item.mimeType.startsWith('image/'))?.mediaUrl || trip.coverImage,
      memories: [...uploaded, ...memories],
      updatedAt: new Date().toISOString()
    });
    event.target.value = '';
    setIsUploading(false);
  };

  const deleteMemory = (memoryId) => {
    onTripUpdate({
      ...trip,
      memories: memories.filter((memory) => memory.id !== memoryId),
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <section id="trip-memories" className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Trip Memories</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Photos and videos from this trip</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Stored trip-wise with media URL, trip ID, and upload date.</p>
        </div>
        <label className="cursor-pointer rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-lg">
          {isUploading ? 'Uploading...' : 'Upload Media'}
          <input className="sr-only" type="file" accept="image/*,video/*" multiple onChange={handleUpload} />
        </label>
      </div>

      {memories.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {memories.map((memory) => (
            <article key={memory.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="aspect-video bg-slate-200">
                {memory.mimeType?.startsWith('video/') ? (
                  <video className="h-full w-full object-cover" src={memory.mediaUrl} controls />
                ) : (
                  <img className="h-full w-full object-cover" src={memory.mediaUrl} alt={memory.name || 'Trip memory'} />
                )}
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-black text-slate-950">{memory.name || 'Trip media'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {new Date(memory.uploadedAt).toLocaleString()} - Trip {memory.tripId}
                </p>
                <button type="button" className="mt-3 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-rose-600 shadow-sm" onClick={() => deleteMemory(memory.id)}>
                  Delete media
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
          Upload photos or videos after completing the trip.
        </div>
      )}
    </section>
  );
}

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { error: locationError, loading: locationLoading, location, requestLocation } = useGeolocation();
  const [trips, setTrips] = useState(() => readTripsFromStorage());
  const [confirmAction, setConfirmAction] = useState(null);
  const [routePlan, setRoutePlan] = useState(null);

  const trip = useMemo(() => trips.find((currentTrip) => currentTrip.id === id) || null, [id, trips]);
  const summary = useMemo(() => (trip ? calculateTripSummary(trip) : null), [trip]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutePlan() {
      if (!trip) {
        return;
      }

      const storedPlan = buildFallbackRoutePlan(trip);

      if (storedPlan.routeCoordinates.length > 1 && storedPlan.totalDistanceKm) {
        setRoutePlan(storedPlan);
        return;
      }

      const fetched = await fetchRoutePlan(DEFAULT_ORIGIN, trip.destinations, trip.transport || 'car');
      if (!cancelled) {
        setRoutePlan(fetched);
      }
    }

    loadRoutePlan();

    return () => {
      cancelled = true;
    };
  }, [trip?.id, trip?.transport, trip?.destinations]);

  const persistTrips = (nextTrips) => {
    setTrips(nextTrips);
    writeTripsToStorage(nextTrips);
  };

  const handleUpdateTrip = (nextTrip) => {
    persistTrips(trips.map((currentTrip) => (currentTrip.id === nextTrip.id ? nextTrip : currentTrip)));
  };

  const handleStatusChange = (status) => {
    handleUpdateTrip(updateTripStatus(trip, status));
  };

  const handleConfirm = (action) => {
    if (action.type === 'delete') {
      persistTrips(trips.filter((currentTrip) => currentTrip.id !== action.trip.id));
      navigate('/trips');
      return;
    }

    if (action.type === 'cancel') {
      handleUpdateTrip(updateTripStatus(action.trip, TRIP_STATUSES.CANCELLED));
    }

    if (action.type === 'complete') {
      const completedStopIds = routePlan?.stops?.map((stop) => stop.id) || action.trip.routeData?.completedStopIds || [];
      handleUpdateTrip(
        updateTripStatus(
          {
            ...action.trip,
            routeData: {
              ...action.trip.routeData,
              completedStopIds,
              currentStopIndex: completedStopIds.length,
              progress: 100
            }
          },
          TRIP_STATUSES.COMPLETED
        )
      );
    }

    if (action.type === 'pause') {
      handleUpdateTrip(updateTripStatus(action.trip, TRIP_STATUSES.PAUSED));
    }

    setConfirmAction(null);
  };

  const handleSettle = (settlement) => {
    handleUpdateTrip({
      ...trip,
      settledExpenses: [
        {
          ...settlement,
          date: new Date().toISOString(),
          id: `settled-${Date.now()}`
        },
        ...(trip.settledExpenses || [])
      ],
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteSettlement = (settlementId) => {
    handleUpdateTrip({
      ...trip,
      settledExpenses: (trip.settledExpenses || []).filter((settlement) => settlement.id !== settlementId),
      updatedAt: new Date().toISOString()
    });
  };

  if (!trip) {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <p className="font-bold text-slate-900">Trip not found</p>
            <p className="mt-2 text-sm text-slate-500">This trip may have been removed or never created.</p>
            <Link to="/trips" className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
              Back to Trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[trip.status] || STATUS_META[TRIP_STATUSES.PLANNED];
  const paidMost = Object.entries(summary.paidTotals).sort((first, second) => second[1] - first[1])[0];
  const isManageMode = [TRIP_STATUSES.ONGOING, TRIP_STATUSES.PAUSED].includes(trip.status);

  return (
    <div className="section-sm bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)]">
      <div className="container space-y-6">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link to="/trips" className="text-sm font-bold text-slate-500 transition hover:text-slate-900">
                Back to My Trips
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusMeta.accent}`}>{statusMeta.label}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{trip.participants.length} travelers</span>
                {trip.transport ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{trip.transport.toUpperCase()}</span> : null}
              </div>
              <h1 className="mt-3 text-4xl font-black text-slate-950">{trip.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {(trip.destinations || []).length ? trip.destinations.join(' -> ') : 'Destinations not set yet'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {trip.status === TRIP_STATUSES.PLANNED ? (
                <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-lg" onClick={() => handleStatusChange(TRIP_STATUSES.ONGOING)}>
                  Start Trip
                </button>
              ) : null}
              {trip.status === TRIP_STATUSES.ONGOING ? (
                <button type="button" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-700" onClick={() => setConfirmAction({ trip, type: 'pause' })}>
                  Pause Trip
                </button>
              ) : null}
              {trip.status === TRIP_STATUSES.PAUSED ? (
                <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-lg" onClick={() => handleStatusChange(TRIP_STATUSES.ONGOING)}>
                  Resume Trip
                </button>
              ) : null}
              {trip.status !== TRIP_STATUSES.COMPLETED && trip.status !== TRIP_STATUSES.CANCELLED ? (
                <button type="button" className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-lg" onClick={() => setConfirmAction({ trip, type: 'complete' })}>
                  Complete Trip
                </button>
              ) : null}
              {trip.status !== TRIP_STATUSES.CANCELLED && trip.status !== TRIP_STATUSES.COMPLETED ? (
                <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700" onClick={() => setConfirmAction({ trip, type: 'cancel' })}>
                  Cancel Trip
                </button>
              ) : null}
              <button type="button" className="rounded-2xl px-4 py-2.5 text-sm font-black text-rose-600 transition hover:bg-rose-50" onClick={() => setConfirmAction({ trip, type: 'delete' })}>
                Delete Trip
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-3xl border border-white/80 bg-white/85 p-3 shadow-lg shadow-slate-200/60 backdrop-blur">
          {[
            ['Manage Trip', '#manage-trip'],
            ['Expenses', '#trip-expenses'],
            ['Trip Memories', '#trip-memories'],
            ['Settlements', '#settlements']
          ].map(([label, href]) => (
            <a key={label} href={href} className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-950 hover:text-white">
              {label}
            </a>
          ))}
        </div>

        <div id="manage-trip">
          {!routePlan ? (
            <div className="rounded-3xl border border-white/80 bg-white p-8 text-center font-black text-slate-500 shadow-xl">Preparing route...</div>
          ) : isManageMode ? (
            <LiveTripDashboard
              location={trip.status === TRIP_STATUSES.PAUSED ? null : location}
              locationError={locationError || (locationLoading ? 'Locating...' : '')}
              onTripUpdate={handleUpdateTrip}
              routePlan={routePlan}
              summary={summary}
              trip={trip}
            />
          ) : trip.status === TRIP_STATUSES.COMPLETED ? (
            <CompletedTripStats routePlan={routePlan} summary={summary} trip={trip} />
          ) : (
            <section className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Saved plan</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Start this plan to enter Manage Trip</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Distance</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatDistance(routePlan.totalDistanceKm || trip.routeData?.distanceKm || 0)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">ETA</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatDuration(routePlan.totalDurationMin || trip.routeData?.etaMinutes || 0)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Budget</p>
                  <p className="mt-2 text-xl font-black text-slate-950">{trip.totalBudget ? formatCurrency(trip.totalBudget) : 'Open'}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {isManageMode && locationError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {locationError} <button type="button" className="underline" onClick={requestLocation}>Try again</button>
          </div>
        ) : null}

        {trip.status === TRIP_STATUSES.COMPLETED ? (
          <TripMemories trip={trip} onTripUpdate={handleUpdateTrip} />
        ) : null}

        <div id="trip-expenses" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <ExpenseTracker trip={trip} onTripUpdate={handleUpdateTrip} />

          <section className="space-y-6">
            <div id="settlements" className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Expense analytics</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Who owes whom</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Paid most</p>
                  <p className="mt-2 font-black text-slate-950">{paidMost?.[0] || 'None'}</p>
                  <p className="text-sm font-bold text-slate-500">{formatCurrency(paidMost?.[1] || 0)}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-500">Pending</p>
                  <p className="mt-2 font-black text-rose-700">{formatCurrency(summary.pendingSettlementTotal)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600">Settled</p>
                  <p className="mt-2 font-black text-emerald-700">{formatCurrency(summary.settledTotal)}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {trip.participants.map((participant) => {
                  const balance = summary.balances[participant] || 0;
                  const isPositive = balance >= 0;

                  return (
                    <div key={participant} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-950">{participant}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Paid {formatCurrency(summary.paidTotals[participant] || 0)} - Share {formatCurrency(summary.owedTotals[participant] || 0)}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-black ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isPositive ? 'Gets back' : 'Owes'} {formatCurrency(Math.abs(balance))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Settlements</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Pending split actions</h2>

              {summary.settlements.length ? (
                <div className="mt-5 space-y-3">
                  {summary.settlements.map((settlement) => (
                    <div key={`${settlement.from}-${settlement.to}-${settlement.amount}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-slate-900">
                          {settlement.from} owes {settlement.to} {formatCurrency(settlement.amount)}
                        </p>
                        <button type="button" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white" onClick={() => handleSettle(settlement)}>
                          Mark as Settled
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  Everyone is settled up for this trip.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Settled history</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Completed transactions</h2>

              {(trip.settledExpenses || []).length ? (
                <div className="mt-5 space-y-3">
                  {trip.settledExpenses.map((settlement) => (
                    <div key={settlement.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700">Settled</span>
                          <p className="mt-2 font-bold text-emerald-950">
                            {settlement.from} paid {settlement.to} {formatCurrency(settlement.amount)}
                          </p>
                        </div>
                        <button type="button" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-rose-600 shadow-sm" onClick={() => handleDeleteSettlement(settlement.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                  Settled transactions will move here so the active balance stays clean.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal action={confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleConfirm} />
    </div>
  );
}
