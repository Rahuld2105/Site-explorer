const turf = require("@turf/turf");

const DEFAULT_GEOFENCE_RADIUS_METERS = Number(process.env.DEFAULT_GEOFENCE_RADIUS_METERS || 200);
const NEAR_GEOFENCE_BUFFER_METERS = Number(process.env.NEAR_GEOFENCE_BUFFER_METERS || 100);

function normalizePoint(lat, lng) {
  return turf.point([Number(lng), Number(lat)]);
}

function isPointInsideGeofence(polygon, lat, lng) {
  if (!polygon?.coordinates?.length && !Array.isArray(polygon)) {
    return false;
  }

  const geometry = polygon.type ? polygon : { type: "Polygon", coordinates: polygon };
  const turfPolygon = turf.polygon(geometry.coordinates);
  const point = normalizePoint(lat, lng);

  return turf.booleanPointInPolygon(point, turfPolygon, { ignoreBoundary: false });
}

function distanceBetweenCoordinates(origin, destination) {
  if (!origin || !destination) {
    return null;
  }

  return turf.distance(
    turf.point([origin.lng, origin.lat]),
    turf.point([destination.lng, destination.lat]),
    { units: "kilometers" }
  );
}

function haversineDistanceMeters(origin, destination) {
  const distanceKm = distanceBetweenCoordinates(origin, destination);
  return distanceKm === null ? null : distanceKm * 1000;
}

function normalizeGeofenceRadiusMeters(place) {
  const radius = Number(
    place?.geofence_radius_meters ??
      place?.geofenceRadiusMeters ??
      place?.geofence_radius ??
      place?.geofenceRadius ??
      DEFAULT_GEOFENCE_RADIUS_METERS
  );

  return Number.isFinite(radius) && radius > 0 ? radius : DEFAULT_GEOFENCE_RADIUS_METERS;
}

function getGeofenceStatus(distanceMeters, radiusMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "outside";
  }

  if (distanceMeters <= radiusMeters) {
    return "inside";
  }

  const nearThreshold = radiusMeters + Math.max(NEAR_GEOFENCE_BUFFER_METERS, radiusMeters * 0.5);
  return distanceMeters <= nearThreshold ? "near" : "outside";
}

function getZoneByFenceMatch(isInsideOrStatus) {
  if (typeof isInsideOrStatus === "string") {
    return isInsideOrStatus;
  }

  return isInsideOrStatus ? "inside" : "outside";
}

module.exports = {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  distanceBetweenCoordinates,
  getZoneByFenceMatch,
  getGeofenceStatus,
  haversineDistanceMeters,
  normalizeGeofenceRadiusMeters,
  isPointInsideGeofence
};
