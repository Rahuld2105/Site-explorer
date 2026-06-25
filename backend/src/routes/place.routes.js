const express = require("express");

const { optionalAuth } = require("../middleware/auth.middleware");
const {
  checkGeofence,
  getNearbyPlaces,
  getNearbyServices,
  getPlaceAiContent,
  getPlaceById,
  getPlaces,
  scanQr
} = require("../controllers/place.controller");

const router = express.Router();

router.get("/places", optionalAuth, getPlaces);
router.get("/places/nearby", optionalAuth, getNearbyPlaces);
router.get("/places/nearby/services", optionalAuth, getNearbyServices);
router.post("/qr/scan", optionalAuth, scanQr);
router.get("/places/:id/ai", optionalAuth, getPlaceAiContent);
router.get("/places/:id/ai-content", optionalAuth, getPlaceAiContent);
router.get("/places/:id/geofence", optionalAuth, checkGeofence);
router.post("/places/:id/geofence", optionalAuth, checkGeofence);
router.get("/places/:id", optionalAuth, getPlaceById);

module.exports = router;
