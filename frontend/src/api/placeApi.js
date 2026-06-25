import axiosInstance from './axiosInstance';

// Place endpoints used by home, nearby, and immersive place pages.
export const getPlaces = (params) => axiosInstance.get('/places', { params });

export const getPlaceById = (id) => axiosInstance.get(`/places/${id}`);

export const getAiContent = (id) => axiosInstance.get(`/places/${id}/ai-content`);

export const generateAiGuide = (payload) => axiosInstance.post('/ai-guide', payload);

export const getNearbyPlaces = (params) => axiosInstance.get('/places/nearby', { params });

export const getNearbyHeritagePlaces = (params) => axiosInstance.get('/heritage-places/nearby', { params });

// Fetch real nearby services (Hotels, Restaurants, Fuel Stations, Hospitals)
// using OpenStreetMap Overpass API via backend
export const getNearbyServices = (params) => axiosInstance.get('/places/nearby/services', { params });

// Fetch nearby services from the dedicated nearby-services API
export const getNearbyServicesByLocation = (params) => axiosInstance.get('/nearby-services', { params });

// Fetch nearby services by type
export const getNearbyServicesByType = (type, params) => axiosInstance.get(`/nearby-services/type/${type}`, { params });

// Fetch services near a heritage place
export const getNearbyServicesForPlace = (placeId, params) => axiosInstance.get(`/nearby-services/place/${placeId}`, { params });

// Get nearby services statistics
export const getNearbyServicesStats = () => axiosInstance.get('/nearby-services/stats');

export const scanQr = (payload) => axiosInstance.post('/qr/scan', payload);

export const checkGeofence = (id, payload) =>
  axiosInstance.post(`/places/${id}/geofence`, payload);
