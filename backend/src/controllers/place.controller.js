const mongoose = require("mongoose");
const axios = require("axios");

const Place = require("../models/Place");
const HeritagePlace = require("../models/HeritagePlace");
const asyncHandler = require("../utils/asyncHandler");
const { calculateNearbyScore } = require("../utils/scoring");
const {
  getGeofenceStatus,
  getZoneByFenceMatch,
  haversineDistanceMeters,
  isPointInsideGeofence,
  normalizeGeofenceRadiusMeters,
} = require("../services/geofence.service");
const { generatePlaceContent } = require("../services/aiContent.service");
const { failure, success } = require("../utils/response");

const OVERPASS_URL =
  process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK_URL =
  process.env.OVERPASS_FALLBACK_URL ||
  "https://overpass.kumi.systems/api/interpreter";
const OVERPASS_TIMEOUT_MS = Number(process.env.OVERPASS_TIMEOUT_MS || 20000);
const OVERPASS_RETRY_COUNT = Number(process.env.OVERPASS_RETRY_COUNT || 2);
const OVERPASS_ENDPOINTS = [
  ...new Set([OVERPASS_URL, OVERPASS_FALLBACK_URL].filter(Boolean)),
];
const NEARBY_SERVICE_CACHE_TTL_MS = Number(
  process.env.NEARBY_SERVICE_CACHE_TTL_MS || 5 * 60 * 1000,
);
const AVG_DRIVE_SPEED_KMH = 32;
const nearbyServiceCache = new Map();
const pendingNearbyServiceRequests = new Map();

function parsePlaceIdentifier(id) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }

  return { place_id: id };
}

async function findTourPlaceByIdentifier(id) {
  const query = parsePlaceIdentifier(id);
  const place = await Place.findOne(query);

  if (place) {
    return { place, source: "places" };
  }

  const heritageQuery = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { place_id: id }, { slug: id }] }
    : { $or: [{ place_id: id }, { slug: id }] };
  const heritagePlace = await HeritagePlace.findOne(heritageQuery);

  return heritagePlace ? { place: heritagePlace, source: "heritage" } : null;
}

function normalizeQueryNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRadiusInMeters(radiusValue, fallbackKm) {
  const radiusKm = Number(radiusValue || fallbackKm);
  return Number.isFinite(radiusKm) ? radiusKm * 1000 : fallbackKm * 1000;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePlaceCoordinates(place) {
  const coordinates = place?.location?.coordinates || place?.coordinates;
  const lat = Number(
    place?.latitude ?? place?.lat ?? coordinates?.lat ?? coordinates?.[1],
  );
  const lng = Number(
    place?.longitude ?? place?.lng ?? coordinates?.lng ?? coordinates?.[0],
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDuration(minutes) {
  const rounded = Math.max(1, Math.round(minutes || 1));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (!hours) {
    return `${mins} min`;
  }

  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function buildAddress(tags = {}) {
  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);

  return addressParts.join(", ");
}

function resolveServiceCategory(tags = {}) {
  if (
    ["hotel", "guest_house", "hostel", "motel", "apartment"].includes(
      tags.tourism,
    )
  ) {
    return "Hotels";
  }

  if (
    ["restaurant", "fast_food", "cafe", "food_court"].includes(tags.amenity)
  ) {
    return "Restaurants";
  }

  if (tags.amenity === "fuel") {
    return "Fuel Stations";
  }

  if (tags.amenity === "charging_station") {
    return "EV Charging Stations";
  }

  if (tags.amenity === "hospital" || tags.healthcare === "hospital") {
    return "Hospitals";
  }

  return null;
}

function resolveServiceTags(tags = {}, category) {
  if (category === "Restaurants") {
    const values = [
      tags.cuisine,
      tags.diet,
      tags["diet:vegetarian"] === "yes" ? "Vegetarian" : "",
      tags["diet:non-vegetarian"] === "yes" ? "Non-Vegetarian" : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (values.includes("vegetarian") || values.includes("veg")) {
      return ["Vegetarian"];
    }

    return ["Non-Vegetarian"];
  }

  if (category === "Fuel Stations" || category === "EV Charging Stations") {
    const fuelTags = [];

    if (
      tags.amenity === "charging_station" ||
      tags["socket:type2"] ||
      tags["socket:chademo"]
    ) {
      fuelTags.push("EV Charging");
    }

    if (tags.cng === "yes" || tags["fuel:cng"] === "yes") {
      fuelTags.push("CNG");
    }

    if (tags["fuel:diesel"] === "yes") {
      fuelTags.push("Diesel");
    }

    if (
      tags["fuel:octane_91"] === "yes" ||
      tags["fuel:petrol"] === "yes" ||
      !fuelTags.length
    ) {
      fuelTags.push("Petrol");
    }

    return [...new Set(fuelTags)];
  }

  if (category === "Hospitals") {
    return tags.emergency === "yes" || tags["emergency_service"] === "yes"
      ? ["Emergency"]
      : [];
  }

  return [];
}

function buildGoogleMapsUrl(lat, lng, name) {
  const params = new URLSearchParams({
    api: "1",
    query: `${name} ${lat},${lng}`,
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function buildOverpassQuery(lat, lng, radiusInMeters) {
  const radiusMeters = Math.max(Math.round(radiusInMeters), 1);

  return `
[out:json][timeout:25];
(
  node["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"](around:${radiusMeters},${lat},${lng});
  way["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"](around:${radiusMeters},${lat},${lng});
  relation["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"](around:${radiusMeters},${lat},${lng});
  node["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radiusMeters},${lat},${lng});
  relation["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radiusMeters},${lat},${lng});
  node["amenity"~"^(fuel|charging_station)$"](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(fuel|charging_station)$"](around:${radiusMeters},${lat},${lng});
  relation["amenity"~"^(fuel|charging_station)$"](around:${radiusMeters},${lat},${lng});
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
  way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
);
out center tags;
  `;
}

function getResponseDataLength(data) {
  if (!data) {
    return 0;
  }

  if (typeof data === "string") {
    return data.length;
  }

  try {
    return JSON.stringify(data).length;
  } catch (error) {
    return 0;
  }
}

function logOverpassError(label, error) {
  console.error(`[NearbyServices] ${label}`);
  console.error("[NearbyServices] error.message:", error.message);
  console.error(
    "[NearbyServices] error.response?.status:",
    error.response?.status,
  );
  console.error("[NearbyServices] error.response?.data:", error.response?.data);
  console.error("[NearbyServices] stack:", error.stack);
}

async function requestOverpass(query) {
  const body = new URLSearchParams();
  body.append("data", query);

  let lastError = null;

  for (const url of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= OVERPASS_RETRY_COUNT; attempt += 1) {
      try {
        console.log("[NearbyServices] Overpass request URL:", url);
        console.log("[NearbyServices] Overpass query:", query);
        console.log("[NearbyServices] Overpass attempt:", attempt + 1);

        const response = await axios.post(url, body.toString(), {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "TourVision/1.0",
          },
          timeout: OVERPASS_TIMEOUT_MS,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          transitional: {
            clarifyTimeoutError: true,
          },
        });

        console.log(
          "[NearbyServices] Overpass response status:",
          response.status,
        );
        console.log(
          "[NearbyServices] Overpass response data length:",
          getResponseDataLength(response.data),
        );

        return {
          response,
          sourceUrl: url,
        };
      } catch (error) {
        lastError = error;
        console.error("[NearbyServices] Overpass request failed", {
          url,
          attempt: attempt + 1,
          errorStatus: error.response?.status || null,
          errorMessage: error.message,
          errorResponse: error.response?.data || null,
        });

        if (attempt < OVERPASS_RETRY_COUNT) {
          await new Promise((resolve) =>
            setTimeout(resolve, 350 * (attempt + 1)),
          );
        }
      }
    }
  }

  throw lastError || new Error("All Overpass endpoints failed");
}

function normalizeOverpassElement(element, origin) {
  const tags = element.tags || {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const category = resolveServiceCategory(tags);
  const name = tags.name;

  if (!category || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const distance = haversineKm(origin.lat, origin.lng, lat, lng);
  const durationMin = (distance / AVG_DRIVE_SPEED_KMH) * 60;
  const tagsList = resolveServiceTags(tags, category);
  const address = buildAddress(tags);

  return {
    id: `osm-${element.type}-${element.id}`,
    osm_id: element.id,
    osm_type: element.type,
    name,
    category,
    type: "service",
    tags: tagsList,
    address,
    location_name: address || tags["addr:full"] || tags.operator || category,
    lat,
    lng,
    distance: Number(distance.toFixed(2)),
    distanceLabel: `${distance.toFixed(1)} km away`,
    durationMin: Number(durationMin.toFixed(1)),
    durationLabel: `${formatDuration(durationMin)} drive`,
    rating: tags.rating ? Number(tags.rating) : null,
    emergency: category === "Hospitals" && tagsList.includes("Emergency"),
    googleMapsUrl: buildGoogleMapsUrl(lat, lng, name),
  };
}

async function fetchNearbyServices({ lat, lng, radiusInMeters }) {
  console.log("[NearbyServices] fetchNearbyServices entered", {
    lat,
    lng,
    radiusInMeters,
  });

  const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${Math.round(radiusInMeters)}`;
  const cached = nearbyServiceCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < NEARBY_SERVICE_CACHE_TTL_MS) {
    console.log("[NearbyServices] cache hit", {
      cacheKey,
      count: cached.items.length,
    });
    return {
      items: cached.items,
      sourceUrl: cached.sourceUrl,
      warning: null,
    };
  }

  if (pendingNearbyServiceRequests.has(cacheKey)) {
    console.log("[NearbyServices] joining in-flight request", { cacheKey });
    return pendingNearbyServiceRequests.get(cacheKey);
  }

  const pendingRequest = (async () => {
    console.log("[NearbyServices] before building Overpass query", {
      lat,
      lng,
      radiusInMeters,
    });

    const query = buildOverpassQuery(lat, lng, radiusInMeters);
    console.log("[NearbyServices] Overpass query built", query);

    let osmResponse;
    let sourceUrl = null;

    try {
      const result = await requestOverpass(query);
      osmResponse = result.response;
      sourceUrl = result.sourceUrl;

      console.log("[NearbyServices] after receiving Overpass response", {
        status: osmResponse.status,
        sourceUrl,
        hasData: Boolean(osmResponse.data),
        hasElements: Boolean(osmResponse.data?.elements),
        elementsIsArray: Array.isArray(osmResponse.data?.elements),
        elementCount: Array.isArray(osmResponse.data?.elements)
          ? osmResponse.data.elements.length
          : null,
      });
    } catch (error) {
      logOverpassError("Overpass API call failed", error);
      return {
        items: [],
        sourceUrl: null,
        warning: "OpenStreetMap Overpass API is unavailable right now.",
      };
    }

    if (!osmResponse.data) {
      console.error("[NearbyServices] Overpass response data is missing");
      return {
        items: [],
        sourceUrl,
        warning: "Overpass response did not include data.",
      };
    }

    if (!osmResponse.data.elements) {
      console.error(
        "[NearbyServices] Overpass response data.elements is missing",
        {
          data: osmResponse.data,
        },
      );
      return {
        items: [],
        sourceUrl,
        warning: "Overpass response did not include elements.",
      };
    }

    if (!Array.isArray(osmResponse.data.elements)) {
      console.error(
        "[NearbyServices] Overpass response data.elements is not an array",
        {
          elementsType: typeof osmResponse.data.elements,
        },
      );
      return {
        items: [],
        sourceUrl,
        warning: "Overpass response elements were not an array.",
      };
    }

    const seen = new Set();
    let items;

    try {
      console.log("[NearbyServices] before mapping osmResponse.data.elements", {
        elementCount: osmResponse.data.elements.length,
      });

      items = osmResponse.data.elements
        .map((element) => normalizeOverpassElement(element, { lat, lng }))
        .filter(Boolean)
        .filter((item) => {
          const key = `${item.category}:${item.name.toLowerCase()}:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`;

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .sort((first, second) => first.distance - second.distance)
        .slice(0, 75);
    } catch (error) {
      logOverpassError("Overpass mapping failed", error);
      throw error;
    }

    nearbyServiceCache.set(cacheKey, {
      createdAt: Date.now(),
      items,
      sourceUrl,
    });

    console.log("[NearbyServices] mapped Overpass services", {
      count: items.length,
    });

    return {
      items,
      sourceUrl,
      warning: null,
    };
  })();

  pendingNearbyServiceRequests.set(cacheKey, pendingRequest);

  try {
    return await pendingRequest;
  } finally {
    pendingNearbyServiceRequests.delete(cacheKey);
  }
}

async function fetchNearbyPlaces({
  lat,
  lng,
  radiusInMeters,
  excludeId = null,
  limit = 20,
}) {
  const query =
    lat !== null && lng !== null
      ? {
          location: {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
              $maxDistance: radiusInMeters,
            },
          },
        }
      : {};

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const places = await Place.find(query).limit(limit);

  return places
    .map((place) => {
      const base = place.toJSON();
      const { distanceKm, score } = calculateNearbyScore(
        base,
        lat !== null && lng !== null ? { lat, lng } : null,
      );

      return {
        ...base,
        distance: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
        score,
      };
    })
    .sort((first, second) => second.score - first.score);
}

const getPlaces = asyncHandler(async (req, res) => {
  const lat = normalizeQueryNumber(req.query.lat);
  const lng = normalizeQueryNumber(req.query.lng);
  const radiusInMeters = normalizeRadiusInMeters(req.query.radius, 5);
  const limit = Number(req.query.limit || 20);

  const items = await fetchNearbyPlaces({
    lat,
    lng,
    radiusInMeters,
    limit,
  });

  return success(res, {
    places: items,
    items,
    total: items.length,
  });
});

const getNearbyPlaces = asyncHandler(async (req, res) => {
  const lat = normalizeQueryNumber(req.query.lat);
  const lng = normalizeQueryNumber(req.query.lng);
  const radiusInMeters = normalizeRadiusInMeters(req.query.radius, 5);
  const limit = Number(req.query.limit || 12);

  if (lat === null || lng === null) {
    return failure(res, 400, "lat and lng query parameters are required.");
  }

  const items = await fetchNearbyPlaces({
    lat,
    lng,
    radiusInMeters,
    limit,
  });

  return success(res, {
    places: items,
    items,
    total: items.length,
  });
});

const getNearbyServices = asyncHandler(async (req, res) => {
  console.log("[NearbyServices] controller entered", {
    query: req.query,
  });

  const lat = normalizeQueryNumber(req.query.lat);
  const lng = normalizeQueryNumber(req.query.lng);
  const radiusInMeters = normalizeRadiusInMeters(req.query.radius, 5);

  if (lat === null || lng === null) {
    return failure(res, 400, "lat and lng query parameters are required.");
  }

  console.log("[NearbyServices] after validating lat/lng", {
    userLat: lat,
    userLng: lng,
    radiusKm: Number((radiusInMeters / 1000).toFixed(1)),
  });

  let nearbyServicesResult;

  try {
    nearbyServicesResult = await fetchNearbyServices({
      lat,
      lng,
      radiusInMeters,
    });
  } catch (error) {
    logOverpassError("getNearbyServices failed", error);
    nearbyServicesResult = {
      items: [],
      sourceUrl: null,
      warning: "Nearby services are temporarily unavailable.",
    };
  }

  const items = nearbyServicesResult.items;

  console.log("[NearbyServices] before returning final response", {
    total: items.length,
    radiusKm: Number((radiusInMeters / 1000).toFixed(1)),
    source: "openstreetmap-overpass",
    sourceUrl: nearbyServicesResult.sourceUrl,
    warning: nearbyServicesResult.warning,
  });

  return success(res, {
    places: items,
    items,
    total: items.length,
    radiusKm: Number((radiusInMeters / 1000).toFixed(1)),
    source: "openstreetmap-overpass",
    sourceUrl: nearbyServicesResult.sourceUrl,
    warning: nearbyServicesResult.warning,
  });
});

const getPlaceById = asyncHandler(async (req, res) => {
  const found = await findTourPlaceByIdentifier(req.params.id);

  if (!found) {
    return failure(res, 404, "Place not found.");
  }

  const { place, source } = found;
  const basePlace = place.toJSON();
  const normalizedCoordinates = normalizePlaceCoordinates(basePlace);
  const lat = normalizedCoordinates?.lat;
  const lng = normalizedCoordinates?.lng;
  const nearbyPlaces =
    source === "places" && lat !== undefined && lng !== undefined
      ? await fetchNearbyPlaces({
          lat,
          lng,
          radiusInMeters: 15000,
          excludeId: place._id,
          limit: 6,
        })
      : [];

  return success(res, {
    place: {
      ...basePlace,
      lat: normalizedCoordinates?.lat ?? null,
      lng: normalizedCoordinates?.lng ?? null,
      latitude: normalizedCoordinates?.lat ?? basePlace.latitude,
      longitude: normalizedCoordinates?.lng ?? basePlace.longitude,
      data_source: source,
      nearby_places: nearbyPlaces,
    },
  });
});

const getPlaceAiContent = asyncHandler(async (req, res) => {
  const found = await findTourPlaceByIdentifier(req.params.id);

  if (!found) {
    return failure(res, 404, "Place not found.");
  }

  const { place, source } = found;

  if (source === "heritage") {
    return success(res, {
      content: {
        ...place.ai_content,
        description: place.description,
        history: place.history || place.ai_content?.history,
        architecture: place.architecture || place.ai_content?.architecture,
        summary: place.ai_content?.overview || place.description,
        ar_model_url: place.ar_model_url || "",
        tts_audio_url: "",
      },
    });
  }

  if (!place.ai_content?.description && !place.ai_content?.summary) {
    const generatedContent = await generatePlaceContent(place.toJSON());
    place.ai_content = {
      ...place.ai_content,
      ...generatedContent,
      status: place.ai_content?.status || "pending",
      updated_at: new Date(),
    };
    place.has_ai_content = true;
    place.ai_content_available = true;
    await place.save();
  }

  return success(res, {
    content: {
      ...place.ai_content,
      ar_model_url: place.ai_content?.ar_model_url || place.ar_model_url || "",
      tts_audio_url: place.ai_content?.tts_audio || "",
    },
  });
});

const scanQr = asyncHandler(async (req, res) => {
  const qrId = String(req.body.qr_id || req.body.qr_data || "").trim();
  console.log("Received QR:", qrId);

  if (!qrId) {
    return failure(res, 400, "qr_id or qr_data is required.");
  }

  console.log("Searching HeritagePlace...");
  const exactQrIdPattern = new RegExp(`^${escapeRegex(qrId)}$`, "i");
  const place = await HeritagePlace.findOne({
    $or: [
      { qr_id: exactQrIdPattern },
      { place_id: exactQrIdPattern },
      { slug: exactQrIdPattern },
    ],
  });
  const source = "heritage";

  if (!place) {
    console.log("No matching place found");
    console.log(
      await HeritagePlace.find(
        {},
        {
          name: 1,
          place_id: 1,
          qr_id: 1,
        },
      ),
    );
    return failure(res, 404, "No place found for this QR code.");
  }

  try {
 await HeritagePlace.updateOne(
  { _id: place._id },
  {
    $set: {
      "qr_stats.last_scan_at": new Date()
    },
    $inc: {
      "qr_stats.total_scans": 1
    }
  }
);

  console.log("SAVE SUCCESS");
} catch (err) {
  console.error("SAVE ERROR:");
  console.error(err);
  throw err;
}

console.log("BEFORE RESPONSE");

  return res.status(200).json({
    success: true,
    place_id: place.place_id,
    placeId: place.place_id,
    source,
    place: {
      ...place.toJSON(),
      data_source: source,
    },
  });
});

function getGeofenceEvent(status, previousStatus) {
  if (status === "inside" && previousStatus !== "inside") {
    return "enter";
  }

  if (status === "inside") {
    return "check_in";
  }

  if (previousStatus === "inside" && status !== "inside") {
    return "exit";
  }

  return status === "near" ? "near" : null;
}

function shouldStoreGeofenceVisit(place, sessionId, userId, status, now) {
  const visits = Array.isArray(place.geofence_visits)
    ? place.geofence_visits
    : [];
  const lastVisit = [...visits].reverse().find((visit) => {
    const sameUser = userId && String(visit.user || "") === String(userId);
    const sameSession = sessionId && visit.session_id === sessionId;
    return sameUser || sameSession;
  });

  if (!lastVisit) {
    return status !== "outside";
  }

  const lastTime = new Date(lastVisit.checked_at || 0).getTime();
  const minutesSinceLast = (now.getTime() - lastTime) / 60000;

  return (
    lastVisit.status !== status ||
    (status === "inside" && minutesSinceLast >= 15)
  );
}

async function recordGeofenceVisit(place, payload) {
  if (
    !payload.event ||
    !shouldStoreGeofenceVisit(
      place,
      payload.session_id,
      payload.user,
      payload.status,
      payload.checked_at,
    )
  ) {
    return false;
  }

  const existingVisits = Array.isArray(place.geofence_visits)
    ? place.geofence_visits
    : [];
  place.geofence_visits = [...existingVisits.slice(-49), payload];

  place.visit_stats = {
    ...(place.visit_stats?.toObject?.() || place.visit_stats || {}),
    total_checkins:
      Number(place.visit_stats?.total_checkins || 0) +
      (payload.status === "inside" ? 1 : 0),
    total_entries:
      Number(place.visit_stats?.total_entries || 0) +
      (payload.event === "enter" ? 1 : 0),
    total_exits:
      Number(place.visit_stats?.total_exits || 0) +
      (payload.event === "exit" ? 1 : 0),
    last_checkin_at:
      payload.status === "inside"
        ? payload.checked_at
        : place.visit_stats?.last_checkin_at || null,
  };

  await place.save();
  return true;
}

const checkGeofence = asyncHandler(async (req, res) => {
  const found = await findTourPlaceByIdentifier(req.params.id);

  if (!found) {
    return failure(res, 404, "Place not found.");
  }

  const { place } = found;
  const lat = normalizeQueryNumber(req.body.lat ?? req.query.lat);
  const lng = normalizeQueryNumber(req.body.lng ?? req.query.lng);

  if (lat === null || lng === null) {
    return failure(res, 400, "lat and lng are required.");
  }

  const placeCoordinates = normalizePlaceCoordinates(place);

  if (!placeCoordinates) {
    return failure(
      res,
      422,
      "This place does not have coordinates for geofencing.",
    );
  }

  const radiusMeters = normalizeGeofenceRadiusMeters(place);
  const distanceMeters = haversineDistanceMeters(
    { lat, lng },
    placeCoordinates,
  );
  const status = getGeofenceStatus(distanceMeters, radiusMeters);
  const previousStatus =
    req.body.previousStatus || req.query.previousStatus || null;
  const inside = status === "inside";
  const polygonInside = isPointInsideGeofence(place.geofence_polygon, lat, lng);
  const now = new Date();
  const event = getGeofenceEvent(status, previousStatus);
  let stored = false;

  if (req.method === "POST") {
    stored = await recordGeofenceVisit(place, {
      user:
        req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
          ? req.user._id
          : null,
      session_id: String(
        req.body.sessionId || req.body.session_id || req.query.sessionId || "",
      ),
      status,
      event,
      distance_meters: Math.round(distanceMeters),
      radius_meters: Math.round(radiusMeters),
      accuracy_meters: Number.isFinite(
        Number(req.body.accuracy ?? req.query.accuracy),
      )
        ? Number(req.body.accuracy ?? req.query.accuracy)
        : null,
      coordinates: { lat, lng },
      checked_at: now,
    });
  }

  return success(res, {
    place_id: place.place_id,
    place: {
      id: place._id,
      place_id: place.place_id,
      name: place.name,
      lat: placeCoordinates.lat,
      lng: placeCoordinates.lng,
    },
    isInside: inside,
    inside,
    polygonInside,
    status,
    zone: getZoneByFenceMatch(status),
    event,
    stored,
    distanceMeters: Math.round(distanceMeters),
    distanceKm: Number((distanceMeters / 1000).toFixed(3)),
    radiusMeters: Math.round(radiusMeters),
    nearRadiusMeters: Math.round(
      radiusMeters + Math.max(100, radiusMeters * 0.5),
    ),
    checkedAt: now.toISOString(),
  });
});

module.exports = {
  checkGeofence,
  getNearbyPlaces,
  getNearbyServices,
  getPlaceAiContent,
  getPlaceById,
  getPlaces,
  scanQr,
};
