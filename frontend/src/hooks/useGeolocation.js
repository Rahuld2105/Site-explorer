import { useEffect, useState } from 'react';

/**
 * Watches the user's position and normalizes success and error states for the app.
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(true);

  const applyPosition = (position) => {
    setLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    });
    setError('');
    setIsLocating(false);
  };

  const applyError = (geoError) => {
    setError(geoError.message || 'Unable to access your location.');
    setIsLocating(false);
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      applyError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  };

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      setIsLocating(false);
      return undefined;
    }

    const watcherId = navigator.geolocation.watchPosition(
      applyPosition,
      applyError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    return () => navigator.geolocation.clearWatch(watcherId);
  }, []);

  return {
    location,
    error,
    loading: isLocating,
    isLocating,
    requestLocation,
    supported: 'geolocation' in navigator
  };
}
