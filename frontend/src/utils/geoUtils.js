/**
 * Calculates the distance between two coordinates in kilometers.
 */
export function haversine(lat1, lon1, lat2, lon2) {
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

export function getCoordinatesFromPlace(place) {
  const coordinates = place?.location?.coordinates || place?.coordinates;
  const lat = Number(place?.latitude ?? place?.lat ?? coordinates?.lat ?? coordinates?.[1]);
  const lng = Number(place?.longitude ?? place?.lng ?? coordinates?.lng ?? coordinates?.[0]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export function getGeofenceRadiusMeters(place) {
  const radius = Number(
    place?.geofence_radius_meters ??
      place?.geofenceRadiusMeters ??
      place?.geofence_radius ??
      place?.geofenceRadius ??
      200
  );

  return Number.isFinite(radius) && radius > 0 ? radius : 200;
}

export function getGeofenceStatus(distanceMeters, radiusMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return 'outside';
  }

  if (distanceMeters <= radiusMeters) {
    return 'inside';
  }

  const nearThreshold = radiusMeters + Math.max(100, radiusMeters * 0.5);
  return distanceMeters <= nearThreshold ? 'near' : 'outside';
}

export function formatDistanceMeters(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return 'Waiting for GPS';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function getGeofenceStatusForPlace(place, coords) {
  const placeCoordinates = getCoordinatesFromPlace(place);
  const hasUserLocation = Number.isFinite(Number(coords?.lat)) && Number.isFinite(Number(coords?.lng));
  const radiusMeters = getGeofenceRadiusMeters(place);

  if (!placeCoordinates || !hasUserLocation) {
    return {
      distanceMeters: null,
      inside: false,
      nearRadiusMeters: radiusMeters + Math.max(100, radiusMeters * 0.5),
      placeCoordinates,
      radiusMeters,
      status: 'outside'
    };
  }

  const distanceMeters = haversine(
    Number(coords.lat),
    Number(coords.lng),
    placeCoordinates.lat,
    placeCoordinates.lng
  ) * 1000;
  const status = getGeofenceStatus(distanceMeters, radiusMeters);

  return {
    distanceMeters,
    inside: status === 'inside',
    nearRadiusMeters: radiusMeters + Math.max(100, radiusMeters * 0.5),
    placeCoordinates,
    radiusMeters,
    status
  };
}

/**
 * Determines whether a [lat, lng] point is inside a polygon using ray casting.
 */
export function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
