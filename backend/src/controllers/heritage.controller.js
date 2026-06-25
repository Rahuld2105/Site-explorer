/**
 * Heritage Places Controller
 * 
 * Handles API endpoints for heritage places including:
 * - Fetching all heritage places with filtering and pagination
 * - Fetching single heritage place details
 * - Location-based searches
 * - Rating and review management
 */

const HeritagePlace = require("../models/HeritagePlace");
const Place = require("../models/Place");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/response");

function normalizeQueryNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRadiusInMeters(radiusValue, fallbackKm) {
  const radiusKm = Number(radiusValue || fallbackKm);
  return Number.isFinite(radiusKm) ? radiusKm * 1000 : fallbackKm * 1000;
}

function normalizePlaceCoordinates(place) {
  const coordinates = place?.location?.coordinates;
  const lat = Number(place?.latitude ?? place?.lat ?? coordinates?.[1]);
  const lng = Number(place?.longitude ?? place?.lng ?? coordinates?.[0]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function getStablePlaceKey(place) {
  return String(place?.place_id || place?.slug || place?.id || place?._id || place?.name || "")
    .trim()
    .toLowerCase();
}

function normalizeNearbyPlace(place, source, origin) {
  const json = typeof place.toJSON === "function" ? place.toJSON() : place;
  const coordinates = normalizePlaceCoordinates(json);

  if (!coordinates) {
    return null;
  }

  const distance = Number(calculateDistance(origin.lat, origin.lng, coordinates.lat, coordinates.lng));

  if (!Number.isFinite(distance)) {
    return null;
  }

  return {
    ...json,
    id: json.id || json._id?.toString() || json.place_id,
    lat: coordinates.lat,
    lng: coordinates.lng,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    data_source: source,
    distance,
    distanceLabel: `${distance.toFixed(1)} km away`
  };
}

/**
 * Get all heritage places with filtering, sorting, and pagination
 * 
 * Query Parameters:
 * - category: Filter by category (e.g., "Historical Palace/Fortification", "Hill Fort")
 * - district: Filter by district
 * - state: Filter by state (default: Maharashtra)
 * - sortBy: Sort field (name, rating, review_count, created_at)
 * - sortOrder: asc or desc (default: asc)
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 10)
 * - featured: Filter featured places only (true/false)
 * 
 * GET /api/heritage-places
 */
exports.getAllHeritagePlaces = asyncHandler(async (req, res) => {
  const {
    category,
    district,
    state = "Maharashtra",
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    limit = 10,
    featured
  } = req.query;

  // Build filter object
  const filter = { state };

  if (category) {
    filter.category = category;
  }

  if (district) {
    filter.district = district;
  }

  if (featured !== undefined) {
    filter.featured = featured === "true";
  }

  // Build sort object
  const sortObj = {};
  const validSortFields = ["name", "rating", "review_count", "created_at"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "name";
  sortObj[sortField] = sortOrder === "desc" ? -1 : 1;

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Max 50 records per page
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const places = await HeritagePlace.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await HeritagePlace.countDocuments(filter);

  // Response
  return sendResponse(res, 200, "Heritage places fetched successfully", {
    places,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    },
    filters: {
      category,
      district,
      state,
      featured
    }
  });
});

/**
 * Get single heritage place by ID or place_id
 * 
 * GET /api/heritage-places/:placeId
 */
exports.getHeritagePlaceById = asyncHandler(async (req, res) => {
  const { placeId } = req.params;

  // Search by place_id first, then by MongoDB _id
  let place = await HeritagePlace.findOne({ place_id: placeId });

  if (!place) {
    place = await HeritagePlace.findById(placeId);
  }

  if (!place) {
    return sendResponse(res, 404, "Heritage place not found");
  }

  // Increment QR scan if it's a QR scan request
  if (req.query.scan === "true" && place.qr_id) {
    place.qr_stats.total_scans += 1;
    place.qr_stats.last_scan_at = new Date();
    await place.save();
  }

  return sendResponse(res, 200, "Heritage place details fetched successfully", {
    place
  });
});

/**
 * Get heritage places by category
 * 
 * GET /api/heritage-places/category/:categoryName
 */
exports.getPlacesByCategory = asyncHandler(async (req, res) => {
  const { categoryName } = req.params;
  const { limit = 10 } = req.query;

  const places = await HeritagePlace.find({ category: categoryName })
    .sort({ rating: -1 })
    .limit(parseInt(limit, 10));

  return sendResponse(res, 200, "Heritage places by category fetched successfully", {
    category: categoryName,
    places,
    count: places.length
  });
});

/**
 * Get nearby heritage places based on coordinates
 * 
 * Query Parameters:
 * - lat: Latitude (required)
 * - lng: Longitude (required)
 * - radius: Search radius in kilometers (default: 50)
 * - limit: Max results (default: 10)
 * 
 * GET /api/heritage-places/nearby
 */
exports.getNearbyHeritages = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50, limit = 10 } = req.query;

  const latitude = normalizeQueryNumber(lat);
  const longitude = normalizeQueryNumber(lng);

  if (latitude === null || longitude === null) {
    return sendResponse(res, 400, "Latitude and longitude are required");
  }

  const radiusInMeters = normalizeRadiusInMeters(radius, 50);
  const radiusKm = radiusInMeters / 1000;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

  const [heritagePlaces, places] = await Promise.all([
    HeritagePlace.find({}),
    Place.find({})
  ]);

  const seen = new Set();
  const items = [
    ...heritagePlaces.map((place) => normalizeNearbyPlace(place, "heritage", { lat: latitude, lng: longitude })),
    ...places.map((place) => normalizeNearbyPlace(place, "places", { lat: latitude, lng: longitude }))
  ]
    .filter((place) => place && place.distance <= radiusKm)
    .filter((place) => {
      const key = getStablePlaceKey(place);

      if (!key) {
        return true;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((first, second) => Number(first.distance || 0) - Number(second.distance || 0))
    .slice(0, limitNum);

  return sendResponse(res, 200, "Nearby heritage places fetched successfully", {
    userLocation: { latitude, longitude },
    searchRadius: `${radiusKm} km`,
    places: items,
    items,
    count: items.length,
    total: items.length
  });
});

/**
 * Search heritage places by name or description
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - limit: Max results (default: 10)
 * 
 * GET /api/heritage-places/search
 */
exports.searchHeritages = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length === 0) {
    return sendResponse(res, 400, "Search query is required");
  }

  const searchQuery = q.trim();
  
  // Create regex for case-insensitive search
  const regex = new RegExp(searchQuery, "i");

  const places = await HeritagePlace.find({
    $or: [
      { name: regex },
      { description: regex },
      { history: regex },
      { district: regex }
    ]
  })
    .limit(parseInt(limit, 10));

  return sendResponse(res, 200, "Heritage places search results", {
    query: searchQuery,
    places,
    count: places.length
  });
});

/**
 * Get featured heritage places
 * 
 * GET /api/heritage-places/featured
 */
exports.getFeaturedHeritages = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const places = await HeritagePlace.find({ featured: true })
    .sort({ rating: -1 })
    .limit(parseInt(limit, 10));

  return sendResponse(res, 200, "Featured heritage places fetched successfully", {
    places,
    count: places.length
  });
});

/**
 * Get heritage places by district
 * 
 * GET /api/heritage-places/district/:districtName
 */
exports.getPlacesByDistrict = asyncHandler(async (req, res) => {
  const { districtName } = req.params;
  const { limit = 20 } = req.query;

  const places = await HeritagePlace.find({ district: districtName })
    .sort({ rating: -1 })
    .limit(parseInt(limit, 10));

  return sendResponse(res, 200, "Heritage places by district fetched successfully", {
    district: districtName,
    places,
    count: places.length
  });
});

/**
 * Get all unique districts with heritage places
 * 
 * GET /api/heritage-places/districts
 */
exports.getAllDistricts = asyncHandler(async (req, res) => {
  const districts = await HeritagePlace.aggregate([
    { $group: { _id: "$district", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return sendResponse(res, 200, "Districts with heritage places fetched successfully", {
    districts: districts.map(d => ({
      name: d._id,
      count: d.count
    })),
    total: districts.length
  });
});

/**
 * Get all unique categories
 * 
 * GET /api/heritage-places/categories
 */
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await HeritagePlace.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return sendResponse(res, 200, "Heritage place categories fetched successfully", {
    categories: categories.map(c => ({
      name: c._id,
      count: c.count
    })),
    total: categories.length
  });
});

/**
 * Get heritage places statistics
 * 
 * GET /api/heritage-places/stats
 */
exports.getHeritageStats = asyncHandler(async (req, res) => {
  const totalPlaces = await HeritagePlace.countDocuments();
  const avgRating = await HeritagePlace.aggregate([
    { $group: { _id: null, average: { $avg: "$rating" } } }
  ]);

  const totalQrScans = await HeritagePlace.aggregate([
    { $group: { _id: null, total: { $sum: "$qr_stats.total_scans" } } }
  ]);

  const topRated = await HeritagePlace.find()
    .sort({ rating: -1 })
    .limit(5);

  const mostScanned = await HeritagePlace.find()
    .sort({ "qr_stats.total_scans": -1 })
    .limit(5);

  const categories = await HeritagePlace.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);

  const districts = await HeritagePlace.aggregate([
    { $group: { _id: "$district", count: { $sum: 1 } } }
  ]);

  return sendResponse(res, 200, "Heritage places statistics fetched successfully", {
    stats: {
      totalPlaces,
      averageRating: avgRating[0]?.average || 0,
      totalQrScans: totalQrScans[0]?.total || 0,
      totalCategories: categories.length,
      totalDistricts: districts.length,
      topRated,
      mostScanned
    }
  });
});

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}
