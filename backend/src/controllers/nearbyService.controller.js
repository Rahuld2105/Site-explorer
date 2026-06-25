const axios = require("axios");
const NearbyService = require("../models/NearbyService");
const HeritagePlace = require("../models/HeritagePlace");
const Place = require("../models/Place");
const asyncHandler = require("../utils/asyncHandler");
const { success, failure } = require("../utils/response");
const {
  haversineKm,
  formatDistance,
  estimateDriveMinutes,
  formatDuration,
  buildGoogleMapsUrl,
  buildGoogleMapsDirectionUrl,
  isWithinRadius,
} = require("../utils/distance");

const AVG_DRIVE_SPEED_KMH = 32;
const VALID_RADII_KM = [5, 10, 15, 25, 50, 100];
const DEFAULT_RADIUS_KM = 10;
const MAX_RESULTS = 100;
const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK_URL =
  process.env.OVERPASS_FALLBACK_URL || "https://overpass.kumi.systems/api/interpreter";
const OVERPASS_TIMEOUT_MS = Number(process.env.OVERPASS_TIMEOUT_MS || 20000);
const OVERPASS_RETRY_COUNT = Number(process.env.OVERPASS_RETRY_COUNT || 2);
const OVERPASS_ENDPOINTS = [...new Set([OVERPASS_URL, OVERPASS_FALLBACK_URL].filter(Boolean))];
const SERVICE_CACHE_TTL_MS = Number(process.env.NEARBY_SERVICE_CACHE_TTL_MS || 5 * 60 * 1000);
const serviceCache = new Map();
const pendingServiceRequests = new Map();

function logOverpassError(label, error) {
  console.error(`[NearbyServices] ${label}`);
  console.error("[NearbyServices] error.message:", error.message);
  console.error("[NearbyServices] error.response?.status:", error.response?.status);
  console.error("[NearbyServices] error.response?.data:", error.response?.data);
  console.error("[NearbyServices] stack:", error.stack);
}

function getServiceCacheKey({ userLat, userLng, radiusKm, type, limit, sortField, minRatingFilter }) {
  return [
    userLat.toFixed(3),
    userLng.toFixed(3),
    radiusKm,
    type || "all",
    limit,
    sortField,
    minRatingFilter ?? "none"
  ].join(":");
}

async function requestOverpass(query) {
  const params = new URLSearchParams();
  params.append("data", query);
  let lastError = null;

  for (const url of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt <= OVERPASS_RETRY_COUNT; attempt += 1) {
      try {
        console.log("[NearbyServices] before calling axios", {
          url,
          attempt: attempt + 1,
        });

        const response = await axios.post(url, params.toString(), {
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

        return { response, sourceUrl: url };
      } catch (error) {
        lastError = error;
        console.error("[NearbyServices] Overpass request failed", {
          url,
          attempt: attempt + 1,
          status: error.response?.status || null,
          message: error.message,
        });

        if (attempt < OVERPASS_RETRY_COUNT) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }
  }

  throw lastError || new Error("All Overpass endpoints failed");
}

function normalizePlaceCoordinates(place) {
  const coordinates = place?.location?.coordinates || place?.coordinates;
  const lat = Number(place?.latitude ?? place?.lat ?? coordinates?.lat ?? coordinates?.[1]);
  const lng = Number(place?.longitude ?? place?.lng ?? coordinates?.lng ?? coordinates?.[0]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findPlaceCoordinates(placeId) {
  const exactName = new RegExp(`^${escapeRegExp(placeId)}$`, "i");
  const place =
    (await HeritagePlace.findOne({
      $or: [{ place_id: placeId }, { slug: placeId }, { name: exactName }],
    })) ||
    (await Place.findOne({
      $or: [{ place_id: placeId }, { slug: placeId }, { name: exactName }],
    }));

  return place ? { place, coordinates: normalizePlaceCoordinates(place) } : null;
}


/**
 * Validate and normalize radius
 * @param {number|string} radius - Requested radius
 * @returns {number} Valid radius in km
 */
function normalizeRadius(radius) {
  const parsed = Number(radius) || DEFAULT_RADIUS_KM;
  // Return the closest valid radius from the list
  return VALID_RADII_KM.reduce((prev, curr) => {
    return Math.abs(curr - parsed) < Math.abs(prev - parsed) ? curr : prev;
  });
}

/**
 * Normalize and validate search mode
 * @param {string} mode - Search mode (current|place)
 * @returns {string} Validated mode
 */
function normalizeMode(mode) {
  const validModes = ["current", "place"];
  return validModes.includes(mode) ? mode : "current";
}

/**
 * Enrich service with calculated distance and metadata
 * @param {object} service - Service document
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @returns {object} Enriched service
 */
function enrichService(service, userLat, userLng) {
  const distance = haversineKm(
    userLat,
    userLng,
    service.latitude,
    service.longitude,
  );

  const durationMin = estimateDriveMinutes(distance, AVG_DRIVE_SPEED_KMH);

  return {
    id: service._id.toString(),
    osm_id: service.osm_id,
    name: service.name,
    type: service.type,
    category: service.category,
    tags: service.tags,
    rating: service.rating,
    review_count: service.review_count,
    address: service.address,
    phone: service.phone,
    website: service.website,
    hours: service.hours,
    price_level: service.price_level,
    images: service.images,
    lat: service.latitude,
    lng: service.longitude,
    distance: distance,
    distanceLabel: formatDistance(distance),
    durationLabel: formatDuration(durationMin),
    googleMapsUrl: buildGoogleMapsUrl(
      service.latitude,
      service.longitude,
      service.name,
    ),
    directionsUrl: buildGoogleMapsDirectionUrl(
      { lat: userLat, lng: userLng },
      { lat: service.latitude, lng: service.longitude },
    ),
  };
}

/**
 * GET /api/nearby-services
 * Search for nearby services within specified radius
 *
 * Query Params:
 * - lat (required): User latitude
 * - lng (required): User longitude
 * - radius (optional): Search radius in km (5,10,15,25,50,100) - default 10
 * - type (optional): Service type (hotel,restaurant,fuel,hospital)
 * - limit (optional): Max results - default 100
 * - sort (optional): Sort field (distance, rating, name) - default distance
 * - minRating (optional): Minimum rating
 * 
 */


const getNearbyServices = asyncHandler(async (req, res) => {
  console.log("[NearbyServices] controller entered", {
    query: req.query,
  });

  const { lat, lng, radius, type, limit, sort, minRating } = req.query;

  // Validate required params
  if (!lat || !lng) {
    return failure(res, 400, "latitude (lat) and longitude (lng) are required");
  }

  const userLat = Number(lat);
  const userLng = Number(lng);

  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return failure(res, 400, "Invalid latitude or longitude");
  }

  console.log("[NearbyServices] after validating lat/lng", {
    userLat,
    userLng,
  });

  // Normalize optional params
  const radiusKm = normalizeRadius(radius);
  const resultsLimit = Math.min(Number(limit) || MAX_RESULTS, MAX_RESULTS);
  const sortField = ["distance", "rating", "name"].includes(sort)
    ? sort
    : "distance";
  const minRatingFilter = minRating ? Number(minRating) : null;
  const cacheKey = getServiceCacheKey({
    userLat,
    userLng,
    radiusKm,
    type,
    limit: resultsLimit,
    sortField,
    minRatingFilter,
  });
  const cached = serviceCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < SERVICE_CACHE_TTL_MS) {
    return success(res, {
      ...cached.payload,
      cache: "hit",
    });
  }

  if (pendingServiceRequests.has(cacheKey)) {
    const payload = await pendingServiceRequests.get(cacheKey);
    return success(res, {
      ...payload,
      cache: "joined",
    });
  }

  // Build query
  const query = {
    is_active: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [userLng, userLat],
        },
        $maxDistance: radiusKm * 1000, // Convert to meters
      },
    },
  };

  // Add type filter if specified
  if (type && ["hotel", "restaurant", "fuel", "hospital"].includes(type)) {
    query.type = type;
  }

  // Add rating filter if specified
  if (minRatingFilter !== null) {
    query.rating = { $gte: minRatingFilter };
  }

  // Execute query with limit
  //
  const radiusMeters = radiusKm * 1000;

  console.log("[NearbyServices] before building Overpass query", {
    radiusKm,
    radiusMeters,
    userLat,
    userLng,
  });

  const overpassQuery = `
[out:json][timeout:25];
(
  nwr(around:${radiusMeters},${userLat},${userLng})["amenity"="restaurant"];
  nwr(around:${radiusMeters},${userLat},${userLng})["amenity"="fuel"];
  nwr(around:${radiusMeters},${userLat},${userLng})["amenity"="hospital"];
  nwr(around:${radiusMeters},${userLat},${userLng})["tourism"="hotel"];
);
out center tags;
`;
  console.log("[NearbyServices] Overpass query built", overpassQuery);

  const pendingRequest = (async () => {
    let osmResponse;
    let sourceUrl = null;

    try {
      const result = await requestOverpass(overpassQuery);
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
        message: "Nearby services are temporarily unavailable. Please try again in a moment.",
        location: {
          latitude: userLat,
          longitude: userLng,
        },
        search: {
          radius_km: radiusKm,
          type: type || "all",
          sort: sortField,
        },
        services: [],
        grouped: {},
        count: 0,
        source: "openstreetmap-overpass",
        sourceUrl: null,
        warning: "OpenStreetMap is taking too long to respond right now.",
      };
    }

  if (!osmResponse.data) {
    console.error("[NearbyServices] Overpass response data is missing");
    return {
      message: "Nearby services fetched successfully",
      location: {
        latitude: userLat,
        longitude: userLng,
      },
      search: {
        radius_km: radiusKm,
        type: type || "all",
        sort: sortField,
      },
      services: [],
      grouped: {},
      count: 0,
      source: "openstreetmap-overpass",
      sourceUrl,
      warning: "Overpass response did not include data.",
    };
  }

  if (!osmResponse.data.elements) {
    console.error("[NearbyServices] Overpass response data.elements is missing", {
      data: osmResponse.data,
    });
    return {
      message: "Nearby services fetched successfully",
      location: {
        latitude: userLat,
        longitude: userLng,
      },
      search: {
        radius_km: radiusKm,
        type: type || "all",
        sort: sortField,
      },
      services: [],
      grouped: {},
      count: 0,
      source: "openstreetmap-overpass",
      sourceUrl,
      warning: "Overpass response did not include elements.",
    };
  }

  if (!Array.isArray(osmResponse.data.elements)) {
    console.error("[NearbyServices] Overpass response data.elements is not an array", {
      elementsType: typeof osmResponse.data.elements,
    });
    return {
      message: "Nearby services fetched successfully",
      location: {
        latitude: userLat,
        longitude: userLng,
      },
      search: {
        radius_km: radiusKm,
        type: type || "all",
        sort: sortField,
      },
      services: [],
      grouped: {},
      count: 0,
      source: "openstreetmap-overpass",
      sourceUrl,
      warning: "OpenStreetMap returned an unexpected response.",
    };
  }

  let services;

  try {
    console.log("[NearbyServices] before mapping osmResponse.data.elements", {
      elementCount: osmResponse.data.elements.length,
    });

    services = osmResponse.data.elements
      .map((item) => {
        const itemLat = Number(item.lat ?? item.center?.lat);
        const itemLng = Number(item.lon ?? item.center?.lon);

        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLng)) {
          return null;
        }

        return {
          _id: item.id,
          osm_id: item.id,
          name: item.tags?.name || "Unnamed Place",

          latitude: itemLat,
          longitude: itemLng,

          type:
            item.tags?.amenity === "fuel"
              ? "fuel"
              : item.tags?.amenity === "hospital"
              ? "hospital"
              : item.tags?.amenity === "restaurant"
              ? "restaurant"
              : "hotel",

          category:
            item.tags?.amenity ||
            item.tags?.tourism ||
            "service",

          tags: [],
          rating: null,
          review_count: 0,
          address: "",
          phone: "",
          website: "",
          hours: "",
          price_level: null,
          images: [],
        };
      })
      .filter(Boolean)
      .slice(0, resultsLimit);
  } catch (error) {
    logOverpassError("Overpass mapping failed", error);
    throw error;
  }

  // Enrich all services with distance, duration, and URLs
  services = services.map((service) =>
    enrichService(service, userLat, userLng),
  );

  // Apply secondary sort if not distance-based
  if (sortField === "rating" && services.length) {
    services.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortField === "name" && services.length) {
    services.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Group by type for better UI presentation
  const grouped = services.reduce((acc, service) => {
    if (!acc[service.type]) {
      acc[service.type] = [];
    }
    acc[service.type].push(service);
    return acc;
  }, {});

  console.log("[NearbyServices] before returning final response", {
    count: services.length,
    radiusKm,
    userLat,
    userLng,
  });

  return {
    message: "Nearby services fetched successfully",
    location: {
      latitude: userLat,
      longitude: userLng,
    },
    search: {
      radius_km: radiusKm,
      type: type || "all",
      sort: sortField,
    },
    services: services,
    grouped: grouped,
    count: services.length,
    source: "openstreetmap-overpass",
    sourceUrl,
    summary: {
      hotels: grouped.hotel?.length || 0,
      restaurants: grouped.restaurant?.length || 0,
      fuel_stations: grouped.fuel?.length || 0,
      hospitals: grouped.hospital?.length || 0,
    },
  };
  })();

  pendingServiceRequests.set(cacheKey, pendingRequest);

  try {
    const payload = await pendingRequest;
    serviceCache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });

    return success(res, payload);
  } finally {
    pendingServiceRequests.delete(cacheKey);
  }
});

/**
 * GET /api/nearby-services/place/:placeId
 * Get services near a specific heritage place
 *
 * Query Params:
 * - radius: Search radius in km
 * - type: Service type filter
 * - limit: Max results
 */
const getNearbyServicesForPlace = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  const { radius, type, limit } = req.query;

  const foundPlace = await findPlaceCoordinates(placeId);

  if (!foundPlace?.coordinates) {
    return failure(res, 404, "Place coordinates were not found for nearby services.");
  }

  const placeCoordinates = foundPlace.coordinates;

  const radiusKm = normalizeRadius(radius);
  const resultsLimit = Math.min(Number(limit) || MAX_RESULTS, MAX_RESULTS);

  const query = {
    is_active: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [placeCoordinates.lng, placeCoordinates.lat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  };

  if (type && ["hotel", "restaurant", "fuel", "hospital"].includes(type)) {
    query.type = type;
  }

  let services = await NearbyService.find(query).limit(resultsLimit).lean();

  services = services.map((service) =>
    enrichService(service, placeCoordinates.lat, placeCoordinates.lng),
  );

  const grouped = services.reduce((acc, service) => {
    if (!acc[service.type]) {
      acc[service.type] = [];
    }
    acc[service.type].push(service);
    return acc;
  }, {});

  return success(
    res,
    {
      message: "Services near heritage place fetched successfully",
      place: {
        id: placeId,
        name: foundPlace.place.name,
        latitude: placeCoordinates.lat,
        longitude: placeCoordinates.lng,
      },
      search: {
        radius_km: radiusKm,
        type: type || "all",
      },
      services: services,
      grouped: grouped,
      count: services.length,
      summary: {
        hotels: grouped.hotel?.length || 0,
        restaurants: grouped.restaurant?.length || 0,
        fuel_stations: grouped.fuel?.length || 0,
        hospitals: grouped.hospital?.length || 0,
      },
    },
    200,
  );
});

/**
 * GET /api/nearby-services/type/:serviceType
 * Get services by type within distance from user
 *
 * Query Params:
 * - lat: User latitude (required)
 * - lng: User longitude (required)
 * - radius: Search radius (optional)
 * - limit: Max results (optional)
 */
const getServicesByType = asyncHandler(async (req, res) => {
  const { serviceType } = req.params;
  const { lat, lng, radius, limit } = req.query;

  if (!lat || !lng) {
    return failure(res, 400, "latitude (lat) and longitude (lng) are required");
  }

  const validTypes = ["hotel", "restaurant", "fuel", "hospital"];
  if (!validTypes.includes(serviceType)) {
    return failure(
      res,
      400,
      `Invalid service type. Must be one of: ${validTypes.join(", ")}`,
    );
  }

  const userLat = Number(lat);
  const userLng = Number(lng);

  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return failure(res, 400, "Invalid latitude or longitude");
  }

  const radiusKm = normalizeRadius(radius);
  const resultsLimit = Math.min(Number(limit) || MAX_RESULTS, MAX_RESULTS);

  const services = await NearbyService.find({
    type: serviceType,
    is_active: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [userLng, userLat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(resultsLimit)
    .lean();

  const enrichedServices = services.map((service) =>
    enrichService(service, userLat, userLng),
  );

  return success(res, {
    message: `${serviceType} services fetched successfully`,
    type: serviceType,
    location: { latitude: userLat, longitude: userLng },
    radius_km: radiusKm,
    services: enrichedServices,
    count: enrichedServices.length,
  });
});

/**
 * GET /api/nearby-services/stats
 * Get statistics about nearby services
 */
const getServiceStats = asyncHandler(async (req, res) => {
  const stats = await NearbyService.aggregate([
    {
      $match: { is_active: true },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        avg_rating: { $avg: "$rating" },
        max_rating: { $max: "$rating" },
        min_rating: { $min: "$rating" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  return success(res, {
    message: "Service statistics fetched successfully",
    total_services: total,
    by_type: stats.reduce((acc, stat) => {
      acc[stat._id || "unknown"] = {
        count: stat.count,
        avg_rating: stat.avg_rating
          ? Math.round(stat.avg_rating * 10) / 10
          : null,
        max_rating: stat.max_rating,
        min_rating: stat.min_rating,
      };
      return acc;
    }, {}),
  });
});

/**
 * POST /api/nearby-services
 * Create a new nearby service (admin only)
 */
const createService = asyncHandler(async (req, res) => {
  const { name, type, category, latitude, longitude, address, rating, tags } =
    req.body;

  // Validate required fields
  if (!name || !type || !latitude || !longitude) {
    return failure(
      res,
      400,
      "name, type, latitude, and longitude are required",
    );
  }

  const validTypes = ["hotel", "restaurant", "fuel", "hospital"];
  if (!validTypes.includes(type)) {
    return failure(
      res,
      400,
      `Invalid type. Must be one of: ${validTypes.join(", ")}`,
    );
  }

  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    return failure(res, 400, "Invalid latitude or longitude");
  }

  const service = new NearbyService({
    name,
    type,
    category: category || type,
    location: {
      type: "Point",
      coordinates: [Number(longitude), Number(latitude)],
    },
    latitude: Number(latitude),
    longitude: Number(longitude),
    address: address || "",
    rating: rating ? Number(rating) : null,
    tags: Array.isArray(tags) ? tags : [],
    source: "manual",
  });

  await service.save();

  return success(res, {
    message: "Service created successfully",
    service: enrichService(service, latitude, longitude),
  }, 201);
});

/**
 * DELETE /api/nearby-services/:serviceId
 * Delete a nearby service (admin only)
 */
const deleteService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const service = await NearbyService.findByIdAndDelete(serviceId);

  if (!service) {
    return failure(res, 404, "Service not found");
  }

  return success(res, { message: "Service deleted successfully" });
});

module.exports = {
  getNearbyServices,
  getNearbyServicesForPlace,
  getServicesByType,
  getServiceStats,
  createService,
  deleteService,
  normalizeRadius,
  normalizeMode,
  VALID_RADII_KM,
  DEFAULT_RADIUS_KM,
};
