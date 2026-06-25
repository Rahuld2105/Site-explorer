/**
 * Distance Calculation Utility
 * Implements Haversine formula for calculating distance between two points
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers (rounded to 2 decimals)
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimals
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Estimate drive time in minutes
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed (default 32 km/h)
 * @returns {number} Estimated time in minutes
 */
function estimateDriveMinutes(distanceKm, avgSpeedKmh = 32) {
  return (distanceKm / avgSpeedKmh) * 60;
}

/**
 * Format drive duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
function formatDuration(minutes) {
  const rounded = Math.max(1, Math.round(minutes || 1));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (!hours) {
    return `${mins} min`;
  }

  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Build Google Maps search URL
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} query - Optional search query
 * @returns {string} Google Maps URL
 */
function buildGoogleMapsUrl(lat, lng, query = "") {
  const params = new URLSearchParams({
    api: "1",
    query: query || `${lat},${lng}`
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Build Google Maps direction URL
 * @param {object} origin - {lat, lng}
 * @param {object} destination - {lat, lng}
 * @returns {string} Google Maps direction URL
 */
function buildGoogleMapsDirectionUrl(origin, destination) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    dir_action: "navigate",
    travelmode: "driving"
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Calculate bearing between two points (0-360 degrees)
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees (0 = North, 90 = East, etc.)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Get direction name from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function getDirectionFromBearing(bearing) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Check if point is within radius
 * @param {number} lat1 - Reference latitude
 * @param {number} lon1 - Reference longitude
 * @param {number} lat2 - Point latitude
 * @param {number} lon2 - Point longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  const distance = haversineKm(lat1, lon1, lat2, lon2);
  return distance <= radiusKm;
}

module.exports = {
  toRadians,
  haversineKm,
  formatDistance,
  estimateDriveMinutes,
  formatDuration,
  buildGoogleMapsUrl,
  buildGoogleMapsDirectionUrl,
  calculateBearing,
  getDirectionFromBearing,
  isWithinRadius,
  EARTH_RADIUS_KM
};
