import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getNearbyServices } from "../../api/placeApi";
import { extractArray, extractData } from "../../api/responseUtils";
import { haversine } from "../../utils/geoUtils";

const SERVICE_TABS = [
  { key: "Hotels", label: "Hotels" },
  { key: "Restaurants", label: "Restaurants" },
  { key: "Hospitals", label: "Hospitals" },
  { key: "Fuel Stations", label: "Fuel Stations" },
  { key: "EV Charging Stations", label: "EV Charging" },
];

const SERVICE_CACHE_TTL_MS = 5 * 60 * 1000;
const serviceResponseCache = new Map();
const pendingServiceRequests = new Map();
const SERVICE_CATEGORY_LABELS = {
  fuel: "Fuel Stations",
  hospital: "Hospitals",
  hotel: "Hotels",
  restaurant: "Restaurants",
};

function normalizeCoordinates(location) {
  const coordinates = location?.location?.coordinates || location?.coordinates;
  const lat = Number(
    location?.lat ?? location?.latitude ?? coordinates?.lat ?? coordinates?.[1],
  );
  const lng = Number(
    location?.lng ?? location?.longitude ?? coordinates?.lng ?? coordinates?.[0],
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function normalizeService(item, index, origin) {
  const coordinates = item?.location?.coordinates || item?.coordinates;
  const lat = Number(item.lat ?? item.latitude ?? coordinates?.lat ?? coordinates?.[1]);
  const lng = Number(item.lng ?? item.longitude ?? coordinates?.lng ?? coordinates?.[0]);
  const rawType = String(item.type || item.category || "").toLowerCase();
  const serviceType = rawType.includes("fuel")
    ? "fuel"
    : rawType.includes("hospital")
      ? "hospital"
      : rawType.includes("restaurant")
        ? "restaurant"
        : rawType.includes("hotel")
          ? "hotel"
          : rawType;
  const distance =
    origin && Number.isFinite(lat) && Number.isFinite(lng)
      ? haversine(origin.lat, origin.lng, lat, lng)
      : Number(item.distance || 0);
  const durationMin = (distance / 32) * 60;

  return {
    id: item.id || item.osm_id || `osm-service-${index}`,
    name: item.name || "Unnamed place",
    category: SERVICE_CATEGORY_LABELS[serviceType] || item.category || item.type || "Service",
    address: item.address || item.location_name || "",
    distance,
    distanceLabel: `${distance.toFixed(1)} km away`,
    durationLabel: item.durationLabel || `${Math.max(1, Math.round(durationMin))} min drive`,
    googleMapsUrl:
      item.googleMapsUrl ||
      (Number.isFinite(lat) && Number.isFinite(lng)
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name || "Place"} ${lat},${lng}`)}`
        : ""),
  };
}

function readServices(response) {
  const directItems = extractArray(response, ["places", "items", "results"]);

  if (directItems.length) {
    return directItems;
  }

  const data = extractData(response);
  return data?.places || data?.items || data?.results || [];
}

function ServiceCard({ service }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-teal-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-teal-700">
            {service.category}
          </p>
          <h4 className="mt-1 truncate text-lg font-black text-slate-950">
            {service.name}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
              {service.distanceLabel}
            </span>
            {service.durationLabel ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                {service.durationLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--c-text-secondary)]">
            {service.address || "Address not listed in OpenStreetMap."}
          </p>
        </div>

        {service.googleMapsUrl ? (
          <a
            className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-teal-700"
            href={service.googleMapsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Maps
          </a>
        ) : null}
      </div>
    </article>
  );
}

ServiceCard.propTypes = {
  service: PropTypes.shape({
    address: PropTypes.string,
    category: PropTypes.string,
    distanceLabel: PropTypes.string,
    durationLabel: PropTypes.string,
    googleMapsUrl: PropTypes.string,
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default function PlaceNearbyTab({ placeLocation }) {
  const [activeTab, setActiveTab] = useState("Hotels");
  const [radiusKm, setRadiusKm] = useState(10);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const normalizedLocation = useMemo(() => normalizeCoordinates(placeLocation), [
    placeLocation?.lat,
    placeLocation?.lng,
    placeLocation?.latitude,
    placeLocation?.longitude,
    placeLocation?.coordinates?.lat,
    placeLocation?.coordinates?.lng,
    placeLocation?.coordinates?.[0],
    placeLocation?.coordinates?.[1],
    placeLocation?.location?.coordinates?.[0],
    placeLocation?.location?.coordinates?.[1],
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      if (!normalizedLocation) {
        setServices([]);
        setWarning("This place does not have coordinates for nearby services.");
        return;
      }

      setLoading(true);
      setWarning("");

      try {
        const cacheKey = `${normalizedLocation.lat.toFixed(5)}:${normalizedLocation.lng.toFixed(5)}:${radiusKm}`;
        const cached = serviceResponseCache.get(cacheKey);
        let response;

        if (cached && Date.now() - cached.createdAt < SERVICE_CACHE_TTL_MS) {
          response = cached.response;
        } else if (pendingServiceRequests.has(cacheKey)) {
          response = await pendingServiceRequests.get(cacheKey);
        } else {
          const request = getNearbyServices({
            lat: normalizedLocation.lat,
            lng: normalizedLocation.lng,
            radius: radiusKm,
          });

          pendingServiceRequests.set(cacheKey, request);
          response = await request;
          pendingServiceRequests.delete(cacheKey);
          serviceResponseCache.set(cacheKey, {
            createdAt: Date.now(),
            response,
          });
        }

        const data = extractData(response);
        const items = readServices(response).map((service, index) =>
          normalizeService(service, index, normalizedLocation),
        );

        if (isMounted) {
          setServices(items);
          setWarning(data?.warning ? "Nearby services are temporarily unavailable. The place details are still ready." : "");
        }
      } catch (error) {
        if (isMounted) {
          console.warn("Nearby services unavailable:", error);
          setServices([]);
          setWarning("Nearby services are temporarily unavailable. The place details are still ready.");
        }
      } finally {
        if (normalizedLocation) {
          const cacheKey = `${normalizedLocation.lat.toFixed(5)}:${normalizedLocation.lng.toFixed(5)}:${radiusKm}`;
          pendingServiceRequests.delete(cacheKey);
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, [normalizedLocation, radiusKm]);

  const groupedServices = useMemo(
    () =>
      SERVICE_TABS.reduce((groups, tab) => {
        groups[tab.key] = services.filter(
          (service) => service.category === tab.key,
        );
        return groups;
      }, {}),
    [services],
  );

  const visibleServices = groupedServices[activeTab] || [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--c-text-secondary)]">
            Nearby Services
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">
            Nearby Services Around This Place
          </h3>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          Radius
          <select
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
            <option value={25}>25 km</option>
          </select>
        </label>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--c-border)] pb-3">
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={[
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold transition",
              activeTab === tab.key
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700",
            ].join(" ")}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-75">
              {groupedServices[tab.key]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {warning}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`service-skeleton-${index}`}
              className="h-32 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      ) : visibleServices.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-500">
            No {activeTab.toLowerCase()} found in OpenStreetMap within {radiusKm} km.
          </p>
        </div>
      )}
    </section>
  );
}

PlaceNearbyTab.propTypes = {
  placeLocation: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
};

PlaceNearbyTab.defaultProps = {
  placeLocation: null,
};
