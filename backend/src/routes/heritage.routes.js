/**
 * Heritage Places Routes
 * 
 * Base URL: /api/heritage-places
 * 
 * Endpoints:
 * - GET / - Get all heritage places
 * - GET /:placeId - Get heritage place by ID
 * - GET /category/:categoryName - Get places by category
 * - GET /nearby - Get nearby heritage places
 * - GET /search - Search heritage places
 * - GET /featured - Get featured heritage places
 * - GET /district/:districtName - Get places by district
 * - GET /districts - Get all districts
 * - GET /categories - Get all categories
 * - GET /stats - Get statistics
 */

const express = require("express");
const router = express.Router();
const heritageController = require("../controllers/heritage.controller");

// Statistics and aggregations (must be before /:placeId to avoid route conflicts)
router.get("/stats", heritageController.getHeritageStats);
router.get("/categories", heritageController.getAllCategories);
router.get("/districts", heritageController.getAllDistricts);
router.get("/featured", heritageController.getFeaturedHeritages);
router.get("/search", heritageController.searchHeritages);
router.get("/nearby", heritageController.getNearbyHeritages);

// Category routes
router.get("/category/:categoryName", heritageController.getPlacesByCategory);

// District routes
router.get("/district/:districtName", heritageController.getPlacesByDistrict);

// Main routes
router.get("/", heritageController.getAllHeritagePlaces);
router.get("/:placeId", heritageController.getHeritagePlaceById);

module.exports = router;
