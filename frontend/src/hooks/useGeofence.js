import { useMemo } from 'react';
import { isPointInPolygon } from '../utils/geoUtils';

function normalizePolygonPoints(polygon) {
  if (Array.isArray(polygon) && polygon.every((point) => Array.isArray(point))) {
    return polygon[0]?.every((point) => Array.isArray(point)) ? polygon[0].map(([lng, lat]) => [lat, lng]) : polygon;
  }

  if (Array.isArray(polygon)) {
    return polygon.map((point) => [point.lat, point.lng]);
  }

  if (Array.isArray(polygon?.coordinates?.[0])) {
    return polygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
  }

  return [];
}

/**
 * Computes geofence membership locally so the UI can react instantly.
 */
export function useGeofence(polygon, coords) {
  return useMemo(() => {
    const points = normalizePolygonPoints(polygon);

    if (
      !points.length ||
      coords?.lat === undefined ||
      coords?.lat === null ||
      coords?.lng === undefined ||
      coords?.lng === null
    ) {
      return false;
    }

    return isPointInPolygon(
      [coords.lat, coords.lng],
      points
    );
  }, [coords?.lat, coords?.lng, polygon]);
}
