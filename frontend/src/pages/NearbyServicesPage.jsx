/**
 * Enhanced NearbyPage Component
 * Displays nearby services with dynamic radius filtering and search mode
 * Features:
 * - Radius dropdown (5, 10, 15, 25, 50, 100 km)
 * - Search mode toggle (Current Location / Heritage Place)
 * - Service type filtering
 * - Real-time distance calculation
 * - Google Maps integration
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocationContext } from '../context/LocationContext';
import { getNearbyServicesByLocation, getNearbyServicesForPlace, getNearbyServicesStats } from '../api/placeApi';
import toast from 'react-hot-toast';

// Constants
const VALID_RADII = [5, 10, 15, 25, 50, 100];
const DEFAULT_RADIUS = 10;
const SERVICE_TYPES = [
  { id: 'all', label: 'All Services', icon: '📍' },
  { id: 'hotel', label: 'Hotels', icon: '🏨' },
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { id: 'fuel', label: 'Fuel Stations', icon: '⛽' },
  { id: 'hospital', label: 'Hospitals', icon: '🏥' }
];

const SEARCH_MODES = [
  { id: 'current', label: 'Current Location', icon: '📍' },
  { id: 'place', label: 'Heritage Place', icon: '🏛️' }
];

// Radius selector component
function RadiusSelector({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-slate-700">Radius:</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {VALID_RADII.map((radius) => (
          <option key={radius} value={radius}>
            {radius} km
          </option>
        ))}
      </select>
    </div>
  );
}

// Search mode toggle component
function SearchModeToggle({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {SEARCH_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          disabled={disabled}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === mode.id
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className="mr-1">{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  );
}

// Service type filter component
function ServiceTypeFilter({ value, onChange, disabled, stats }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICE_TYPES.map((type) => {
        const count = stats?.[type.id] || 0;
        const isActive = value === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            disabled={disabled}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              isActive
                ? 'bg-teal-600 text-white shadow-md'
                : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {type.icon} {type.label}
            {count > 0 && <span className="ml-1 text-xs">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}

// Service card component
function ServiceCard({ service, onSelect, onRoute, isLoading }) {
  const {
    id,
    name,
    type,
    category,
    rating,
    distance,
    distanceLabel,
    durationLabel,
    address,
    tags,
    images,
    googleMapsUrl
  } = service;

  const hasImage = images && images.length > 0;
  const imageUrl = hasImage ? images[0] : 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&fit=crop&q=60';

  return (
    <article
      onClick={() => onSelect?.(service)}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-300 hover:shadow-md"
    >
      {/* Image */}
      <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-slate-100">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {rating && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1">
            <span className="text-xs font-bold text-yellow-500">⭐</span>
            <span className="text-xs font-bold text-slate-900">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Header */}
        <div>
          <h3 className="truncate text-sm font-bold text-slate-900">{name}</h3>
          <p className="text-xs text-slate-600">{category}</p>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Info badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {distanceLabel}
          </span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
            {durationLabel}
          </span>
        </div>

        {/* Address */}
        {address && (
          <p className="mt-2 truncate text-xs text-slate-600">{address}</p>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRoute?.();
            }}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? '...' : 'Route'}
          </button>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Maps
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// Main component
export default function NearbyServicesPage() {
  const [searchParams] = useSearchParams();
  const { location } = useLocationContext();
  const selectedPlaceId = searchParams.get('placeId') || '';
  const selectedPlaceName = searchParams.get('placeName') || 'selected heritage place';
  const [searchMode, setSearchMode] = useState(selectedPlaceId ? 'place' : 'current');
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [serviceType, setServiceType] = useState('all');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [routingId, setRoutingId] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const searchLocation = searchMode === 'current' ? location : null;

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await getNearbyServicesStats();
        if (response.data?.data?.by_type) {
          const counts = {};
          Object.entries(response.data.data.by_type).forEach(([type, data]) => {
            counts[type] = data.count;
          });
          counts.all = Object.values(counts).reduce((sum, count) => sum + count, 0);
          setStats(counts);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }
    fetchStats();
  }, []);

  // Fetch services when location, radius, or type changes
  useEffect(() => {
    if (searchMode === 'place' && !selectedPlaceId) {
      setServices([]);
      return;
    }

    if (searchMode === 'current' && (!searchLocation?.lat || !searchLocation?.lng)) {
      return;
    }

    async function fetchServices() {
      try {
        setLoading(true);

        const params = {
          radius,
          ...(serviceType !== 'all' && { type: serviceType }),
          limit: 100
        };

        const response =
          searchMode === 'place'
            ? await getNearbyServicesForPlace(selectedPlaceId, params)
            : await getNearbyServicesByLocation({
                ...params,
                lat: searchLocation.lat,
                lng: searchLocation.lng
              });

        if (response.data?.data?.services) {
          setServices(response.data.data.services);
        } else {
          setServices([]);
          toast.error('No services found in this radius');
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
        toast.error('Failed to load nearby services');
        setServices([]);
      } finally {
        setLoading(false);
      }
    }

    const debounceTimer = setTimeout(fetchServices, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchLocation?.lat, searchLocation?.lng, radius, selectedPlaceId, serviceType, searchMode]);

  // Handle route button
  const handleRoute = useCallback((service) => {
    setRoutingId(service.id);
    // In a real app, this would open Google Maps or show route on map
    if (service.googleMapsUrl) {
      window.open(service.googleMapsUrl, '_blank');
    }
    setTimeout(() => setRoutingId(null), 2000);
  }, []);

  // Group services by type
  const groupedServices = useMemo(() => {
    const grouped = {};
    services.forEach((service) => {
      if (!grouped[service.type]) {
        grouped[service.type] = [];
      }
      grouped[service.type].push(service);
    });
    return grouped;
  }, [services]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <h1 className="text-2xl font-bold text-slate-900">Nearby Services</h1>
          <p className="mt-1 text-sm text-slate-600">
            Find hotels, restaurants, fuel stations, and hospitals near you
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="space-y-4">
            {/* Row 1: Search mode and radius */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SearchModeToggle
                value={searchMode}
                onChange={setSearchMode}
                disabled={loading}
              />
              <RadiusSelector
                value={radius}
                onChange={setRadius}
                disabled={loading}
              />
            </div>

            {/* Row 2: Service type filter */}
            <ServiceTypeFilter
              value={serviceType}
              onChange={setServiceType}
              disabled={loading}
              stats={stats}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && services.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">No services found</p>
            <p className="mt-2 text-sm text-slate-600">
              Try increasing the search radius or changing your location
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && services.length > 0 && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-teal-900">
                  Found {services.length} service{services.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-teal-700">
                  within {radius} km
                  {searchMode === 'place' && ` of ${selectedPlaceName}`}
                </p>
              </div>
            </div>

            {/* Services grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={setSelectedService}
                  onRoute={() => handleRoute(service)}
                  isLoading={routingId === service.id}
                />
              ))}
            </div>

            {/* Grouped view (optional alternative) */}
            {false && (
              <div className="space-y-8">
                {Object.entries(groupedServices).map(([type, items]) => (
                  <div key={type}>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">
                      {type === 'hotel' && '🏨 Hotels'}
                      {type === 'restaurant' && '🍽️ Restaurants'}
                      {type === 'fuel' && '⛽ Fuel Stations'}
                      {type === 'hospital' && '🏥 Hospitals'}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          onSelect={setSelectedService}
                          onRoute={() => handleRoute(service)}
                          isLoading={routingId === service.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service detail modal would go here */}
    </div>
  );
}
