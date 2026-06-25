import PropTypes from 'prop-types';
import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import PlaceMarker from './PlaceMarker';

const heritageIcon = L.divIcon({
  className: 'tourvision-heritage-marker',
  html: `
    <div class="tourvision-heritage-pin" aria-hidden="true">
      <span class="tourvision-heritage-pin__roof"></span>
      <span class="tourvision-heritage-pin__body"></span>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 30],
  popupAnchor: [0, -26]
});

const userIcon = L.divIcon({
  className: 'tourvision-user-marker',
  html: `
    <div style="
      position: relative;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), #7dd3fc 45%, #2563eb 100%);
      border: 1px solid rgba(255,255,255,0.72);
      box-shadow: 0 14px 28px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.32);
    ">
      <span style="
        position: absolute;
        inset: -7px;
        border-radius: 999px;
        border: 1px solid rgba(125,211,252,0.28);
        background: rgba(125,211,252,0.08);
      "></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

/**
 * Keeps the map view centered whenever coordinates change.
 */
function RecenterMap({ center, enabled, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    map.setView([center.lat, center.lng], zoom, {
      animate: true
    });
  }, [center.lat, center.lng, enabled, map, zoom]);

  return null;
}

RecenterMap.propTypes = {
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }).isRequired,
  enabled: PropTypes.bool,
  zoom: PropTypes.number.isRequired
};

RecenterMap.defaultProps = {
  enabled: false
};

function FitRouteBounds({ enabled, routeCoordinates, routePanelVisible }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !routeCoordinates?.length) {
      return;
    }

    const bounds = L.latLngBounds(routeCoordinates);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;

    map.fitBounds(bounds, {
      animate: true,
      paddingTopLeft: isDesktop && routePanelVisible ? [72, 96] : [28, 72],
      paddingBottomRight: isDesktop && routePanelVisible ? [380, 120] : [28, 250]
    });
  }, [enabled, map, routeCoordinates, routePanelVisible]);

  return null;
}

FitRouteBounds.propTypes = {
  enabled: PropTypes.bool,
  routePanelVisible: PropTypes.bool,
  routeCoordinates: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  )
};

FitRouteBounds.defaultProps = {
  enabled: false,
  routePanelVisible: false,
  routeCoordinates: []
};

/**
 * Shared Leaflet map wrapper for place markers, routes, and user position.
 */
export default function MapView({
  autoFitRoute,
  center,
  recenterOnCenterChange,
  onMarkerClick,
  places,
  geofence,
  routeCoordinates,
  routePanelVisible,
  selectedPlaceId,
  userLocation,
  zoom
}) {
  return (
    <MapContainer
      center={[Number(center.lat), Number(center.lng)]}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap center={center} enabled={recenterOnCenterChange} zoom={zoom} />
      <FitRouteBounds enabled={autoFitRoute} routeCoordinates={routeCoordinates} routePanelVisible={routePanelVisible} />

      {geofence?.center && geofence?.radiusMeters ? (
        <>
          <Circle
            center={[Number(geofence.center.lat), Number(geofence.center.lng)]}
            radius={Number(geofence.radiusMeters)}
            pathOptions={{
              color: geofence.status === 'inside' ? '#059669' : geofence.status === 'near' ? '#d97706' : '#0f766e',
              fillColor: geofence.status === 'inside' ? '#10b981' : geofence.status === 'near' ? '#f59e0b' : '#14b8a6',
              fillOpacity: 0.14,
              opacity: 0.88,
              weight: 2
            }}
          />
          <Marker icon={heritageIcon} position={[Number(geofence.center.lat), Number(geofence.center.lng)]}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{geofence.placeName || 'Heritage location'}</p>
                <p>Geofence radius: {Math.round(geofence.radiusMeters)} m</p>
              </div>
            </Popup>
          </Marker>
        </>
      ) : null}

      {userLocation ? (
        <Marker icon={userIcon} position={[Number(userLocation.lat), Number(userLocation.lng)]}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">Your live location</p>
              {userLocation.accuracy ? <p>Accuracy: {Math.round(userLocation.accuracy)} m</p> : null}
            </div>
          </Popup>
        </Marker>
      ) : null}
      {places.map((place) => (
        <PlaceMarker
          key={place.id || `${place.lat}-${place.lng}`}
          place={place}
          selected={String(place.id) === String(selectedPlaceId)}
          onClick={onMarkerClick}
        />
      ))}
      {routeCoordinates?.length ? (
        <>
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#0f172a',
              weight: 8,
              opacity: 0.18
            }}
          />
          <Polyline
            className="tourvision-route-line"
            positions={routeCoordinates}
            pathOptions={{
              color: '#1a73e8',
              dashArray: '14 14',
              lineCap: 'round',
              lineJoin: 'round',
              weight: 6,
              opacity: 0.96
            }}
          />
        </>
      ) : null}
    </MapContainer>
  );
}

MapView.propTypes = {
  autoFitRoute: PropTypes.bool,
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }).isRequired,
  onMarkerClick: PropTypes.func,
  recenterOnCenterChange: PropTypes.bool,
  geofence: PropTypes.shape({
    center: PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired
    }),
    placeName: PropTypes.string,
    radiusMeters: PropTypes.number,
    status: PropTypes.string
  }),
  places: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  routeCoordinates: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  ),
  routePanelVisible: PropTypes.bool,
  selectedPlaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  userLocation: PropTypes.shape({
    accuracy: PropTypes.number,
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  zoom: PropTypes.number
};

MapView.defaultProps = {
  autoFitRoute: false,
  geofence: null,
  onMarkerClick: undefined,
  places: [],
  recenterOnCenterChange: false,
  routeCoordinates: [],
  routePanelVisible: false,
  selectedPlaceId: null,
  userLocation: null,
  zoom: 13
};
