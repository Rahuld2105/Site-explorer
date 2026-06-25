const express = require("express");
const router = express.Router();

const {
  getNearbyServices,
  getNearbyServicesForPlace,
  getServicesByType,
  getServiceStats,
  createService,
  deleteService
} = require("../controllers/nearbyService.controller");

/**
 * GET /api/nearby-services
 * Search for nearby services within specified radius
 * Query params: lat, lng, radius, type, limit, sort, minRating
 */
router.get("/", getNearbyServices);

/**
 * GET /api/nearby-services/stats
 * Get statistics about nearby services
 */
router.get("/stats", getServiceStats);

/**
 * GET /api/nearby-services/type/:serviceType
 * Get services by type
 * Params: serviceType (hotel, restaurant, fuel, hospital)
 * Query params: lat, lng, radius, limit
 */
router.get("/type/:serviceType", getServicesByType);

/**
 * GET /api/nearby-services/place/:placeId
 * Get services near a specific heritage place
 * Query params: radius, type, limit
 */
router.get("/place/:placeId", getNearbyServicesForPlace);

/**
 * POST /api/nearby-services
 * Create a new nearby service (admin only)
 */
router.post("/", createService);

/**
 * DELETE /api/nearby-services/:serviceId
 * Delete a nearby service (admin only)
 */
router.delete("/:serviceId", deleteService);

module.exports = router;
