# Real Nearby Places - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER                                    │
│                  (Mobile/Desktop Browser)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    Location Enable
                         │
            ┌────────────▼────────────┐
            │  Frontend (React)       │
            ├────────────────────────┤
            │ NearbyPage.jsx          │
            │ PlaceNearbyTab.jsx      │
            │ PlacePage.jsx           │
            └────────┬────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │    API Calls           │
        │            │            │
   ┌────▼────┐  ┌────▼────────┐  │
   │ Fetch   │  │ Fetch Real  │  │
   │Places   │  │ Services    │  │
   │(DB)     │  │(OpenStreetMap)
   └────┬────┘  └────┬────────┘  │
        │            │            │
        └────────────┼────────────┘
                     │
            ┌────────▼────────────┐
            │   Backend (Node.js) │
            ├────────────────────┤
            │ place.controller.js │
            │ /places/nearby      │
            │ /places/nearby/svcs │
            └────────┬────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │    Data Sources        │
        │            │            │
   ┌────▼────┐  ┌────▼────────┐
   │MongoDB  │  │OpenStreetMap│
   │Places   │  │ Overpass API│
   │Database │  │  (Real Data)│
   └─────────┘  └─────────────┘
```

---

## Data Flow Diagram

### Nearby Page Flow

```
User Enables Location
        │
        ▼
useEffect Hook Triggered
        │
        ▼
┌──────────────────────────────────────┐
│ Promise.allSettled([                  │
│   1. Fetch Attractions from DB       │
│   2. Fetch Real Services from OSM    │
│ ])                                    │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
Success      Failed
    │             │
    │             ▼
    │      Use Fallback
    │             │
    └─────┬───────┘
          │
          ▼
    Combine Results
          │
          ▼
    Set Places State
          │
          ▼
    Render Places + Services
          │
          ▼
    User Sees Real Data
```

### Place Details Nearby Tab Flow

```
User Opens Place Details
        │
        ▼
PlacePage Renders
        │
        ▼
Pass placeLocation to PlaceNearbyTab
        │
        ▼
useEffect Hook in PlaceNearbyTab
        │
        ▼
Call fetchRealServiceRecommendations()
        │
        ▼
┌────────────────────────────────┐
│getNearbyServices API Call      │
│  lat: place.location[1]        │
│  lng: place.location[0]        │
│  radius: 5km                   │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│Backend /places/nearby/services │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│Query OpenStreetMap Overpass    │
│Search for:                     │
│  - Hotels (tourism=*)          │
│  - Restaurants (amenity=*)     │
│  - Fuel Stations (amenity=*)   │
│  - Hospitals (healthcare=*)    │
│                                │
│Within 5km radius               │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│Return Real Data to Frontend    │
│  [                             │
│    {id, name, distance, ...},  │
│    {id, name, distance, ...}   │
│  ]                             │
└────────┬───────────────────────┘
         │
         ▼
Transform & Set State
         │
         ▼
Render Real Service Cards
         │
         ▼
User Sees Real Hotels,
Restaurants, Fuel Stations,
Hospitals
```

---

## API Request/Response Flow

### Request: Get Real Nearby Services

```
Frontend Request
──────────────────────────────────
GET /places/nearby/services
Query Parameters:
  - lat: 20.5937
  - lng: 78.9629
  - radius: 5 (km)

Headers:
  - Authorization: Bearer {token}
  - Content-Type: application/json
```

### Backend Processing

```
Backend Receives Request
        │
        ▼
Check Cache
  │
  ├─ Hit? ──────► Return Cached Data
  │
  └─ Miss?
        │
        ▼
Build Overpass Query
  │
  └─ Query: (
       nwr(around:5000,20.5937,78.9629)[tourism~"^(hotel|...)$"];
       nwr(around:5000,20.5937,78.9629)[amenity~"^(restaurant|...)$"];
       ...
     );
        │
        ▼
Send to OpenStreetMap API
        │
        ▼
Normalize Response
  │
  ├─ Extract coordinates
  ├─ Calculate distance
  ├─ Resolve category
  ├─ Parse tags
  └─ Build address
        │
        ▼
Deduplicate Results
        │
        ▼
Sort by Distance
        │
        ▼
Cache for 5 Minutes
        │
        ▼
Return to Frontend
```

### Response: Real Nearby Services

```json
{
  "places": [
    {
      "id": "osm-node-12345678",
      "osm_id": 12345678,
      "osm_type": "node",
      "name": "Hotel Rajgad Residency",
      "category": "Hotels",
      "type": "service",
      "tags": ["Rooms"],
      "address": "123 Main Street, Aurangabad, India",
      "location_name": "123 Main Street, Aurangabad, India",
      "lat": 19.8756,
      "lng": 75.3431,
      "distance": 2.1,
      "distanceLabel": "2.1 km away",
      "durationMin": 4.0,
      "durationLabel": "4 min drive",
      "rating": 4.5,
      "emergency": false,
      "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Hotel%20Rajgad%20Residency%2019.8756%2C75.3431"
    },
    {
      "id": "osm-node-87654321",
      "name": "Green Thali House",
      "category": "Restaurants",
      "type": "service",
      "tags": ["Vegetarian"],
      "address": "456 Food Street, Aurangabad",
      "lat": 19.8847,
      "lng": 75.3547,
      "distance": 0.8,
      "distanceLabel": "0.8 km away",
      "durationMin": 1.5,
      "durationLabel": "2 min drive",
      "rating": 4.6,
      "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Green%20Thali%20House%2019.8847%2C75.3547"
    },
    {
      "id": "osm-way-11111111",
      "name": "HP Fuel Point",
      "category": "Fuel Stations",
      "type": "service",
      "tags": ["Petrol", "Diesel"],
      "address": "Near Railway Station",
      "lat": 19.8934,
      "lng": 75.3201,
      "distance": 3.2,
      "distanceLabel": "3.2 km away",
      "rating": 4.3,
      "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=HP%20Fuel%20Point%2019.8934%2C75.3201"
    },
    {
      "id": "osm-node-22222222",
      "name": "City Care Hospital",
      "category": "Hospitals",
      "type": "service",
      "tags": ["Emergency"],
      "address": "789 Medical Lane",
      "lat": 19.8678,
      "lng": 75.3789,
      "distance": 2.8,
      "distanceLabel": "2.8 km away",
      "rating": 4.1,
      "emergency": true,
      "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=City%20Care%20Hospital%2019.8678%2C75.3789"
    }
  ],
  "items": [...],
  "total": 4,
  "radiusKm": 5,
  "source": "openstreetmap-overpass"
}
```

---

## Component State Management

### NearbyPage Component State

```javascript
State Variables:
├─ liveLocation: {lat, lng, accuracy}
│  └─ From browser geolocation API
├─ debouncedLocation: {lat, lng, accuracy}
│  └─ Triggers effect only after 450ms pause
├─ places: [{...attractions...}, {...services...}]
│  └─ Combined attractions + real services
├─ loading: boolean
│  └─ API fetch in progress
├─ activeChip: 'All' | 'Hotels' | 'Restaurants' | ...
│  └─ Active filter
├─ selectedPlaceId: string
│  └─ Currently selected place
├─ routeInfo: {distanceKm, durationMin, ...}
│  └─ Route information for selected place
└─ usedFallback: boolean
   └─ Whether fallback data was used

Effects:
├─ Live location tracking (geolocation API)
├─ Debounce location changes (450ms wait)
└─ Load nearby places (attractions + services)
    └─ Triggered when debouncedLocation changes
```

### PlaceNearbyTab Component State

```javascript
State Variables:
├─ services: [{...real services...}]
│  └─ Loaded from API or fallback
└─ loadingServices: boolean
   └─ API fetch in progress

Props:
├─ nearbyPlaces: [{...nearby places...}]
│  └─ Attractions near the place
└─ placeLocation: {lat, lng}
   └─ Used to find services

Effects:
└─ Load real services (on mount + location change)
   └─ Triggered by placeLocation?.lat and placeLocation?.lng
```

---

## Caching Strategy

### Cache Key Structure

```
Format: "{lat}:{lng}:{radius_in_meters}"
Example: "20.594:78.963:5000"

Cache Entry:
{
  createdAt: timestamp,
  items: [{...real services...}]
}
```

### Cache Lifecycle

```
Request comes in
      │
      ▼
Generate cache key
      │
      ▼
┌─────────────────┐
│ Check cache     │
└────┬────────────┘
     │
  ┌──┴──┐
  │     │
Hit   Miss
  │     │
  │     ▼
  │  API Call to
  │  OpenStreetMap
  │     │
  │     ▼
  │  Transform Data
  │     │
  │     ▼
  │  Store in Cache
  │  (5 min TTL)
  │     │
  └─────┘
     │
     ▼
Return to Frontend
```

### TTL Configuration

```javascript
NEARBY_SERVICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default
```

---

## Error Handling Flow

```
API Request
    │
    ▼
┌─────────────────────────┐
│ Try / Catch Block       │
└────┬────────────────────┘
     │
  ┌──┴──────────────┐
  │                 │
Success          Error
  │                 │
  ▼                 ▼
Return          Log Error
Data            "Real nearby services API failed..."
  │                 │
  │                 ▼
  │            Use Fallback
  │            Data
  │                 │
  └─────┬───────────┘
        │
        ▼
Show Toast
(only on silent error)
        │
        ▼
Display Results
(Real or Fallback)
```

---

## Distance Calculation

### Haversine Formula Implementation

```javascript
function haversineKm(lat1, lon1, lat2, lon2) {
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
```

### Distance Display

```
Raw Distance: 2.1234567 km
Formatted: "2.1 km away"

Drive Time Estimate:
durationMin = (distance / 32 km/h) * 60
Example: (2.1 / 32) * 60 = 3.9 min ≈ "4 min drive"
```

---

## OpenStreetMap Query Structure

### Overpass API Query

```
Query Format:
[out:json][timeout:25];
(
  nwr(around:${radius},${lat},${lng})[tourism~"^(hotel|...)$"];
  nwr(around:${radius},${lat},${lng})[amenity~"^(restaurant|...)$"];
  nwr(around:${radius},${lat},${lng})[amenity~"^(fuel|charging_station)$"];
  nwr(around:${radius},${lat},${lng})[amenity="hospital"];
  nwr(around:${radius},${lat},${lng})[healthcare="hospital"];
);
out center tags;

Where:
- nwr = node, way, or relation (any OSM object)
- around = search within radius (in meters)
- [tourism~"..."] = tag matching (regex)
- out center tags = return center coords + tags
```

### Supported Categories

| Category        | OSM Tag Patterns                                         | Examples                     |
| --------------- | -------------------------------------------------------- | ---------------------------- |
| **Hotels**      | tourism~"(hotel\|guest_house\|hostel\|motel\|apartment)" | Hotel, Hostel, Guest House   |
| **Restaurants** | amenity~"(restaurant\|fast_food\|cafe\|food_court)"      | Restaurant, Cafe, Food Court |
| **Fuel**        | amenity~"(fuel\|charging_station)"                       | Gas Station, EV Charger      |
| **Hospitals**   | amenity="hospital" OR healthcare="hospital"              | Hospital, Clinic             |

---

## Performance Metrics

### Response Time Targets

```
Attribute                    Target
────────────────────────────────────────
Location permission request  < 1s
Fetch attractions            < 2s
Fetch real services          < 3s
Combine + render             < 0.5s
────────────────────────────────────────
Total time to show data      < 6s
```

### API Call Optimization

```
Scenario 1: First request at location (20.59, 78.96)
├─ API call to OSM: ~2-3s
├─ Cache stored
└─ Result shown

Scenario 2: User moves 100m but stays in same cache region
├─ After 450ms debounce
├─ New location: (20.591, 78.961)
├─ Cache key differs: CACHE MISS
└─ New API call (but user is expecting to wait)

Scenario 3: User requests same location again within 5 min
├─ Cache key: "20.594:78.963:5000"
├─ CACHE HIT
├─ Instant return (no API call)
└─ Results shown immediately
```

---

## Browser & Backend Integration

### HTTP Request Headers

```
Frontend → Backend
────────────────────────
GET /places/nearby/services?lat=20.59&lng=78.96&radius=5
Host: localhost:5000
Authorization: Bearer {jwt_token}
Accept: application/json
Content-Type: application/json
```

### Response Headers

```
Backend → Frontend
────────────────────────
Content-Type: application/json
Cache-Control: no-cache, must-revalidate
X-Total-Results: 12
X-Cache: HIT (5m remaining)
```

---

## Deduplication Logic

### Why Deduplication?

OpenStreetMap may have the same place stored multiple times (node + way, or duplicates).

### Dedup Algorithm

```javascript
const seen = new Set();

items.filter((item) => {
  const key = `${item.category}:${item.name.toLowerCase()}:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`;

  if (seen.has(key)) {
    return false; // Already seen, skip
  }

  seen.add(key); // Mark as seen
  return true; // Include in results
});
```

### Example

```
Before dedup: 12 items
  - "Hotel Rajgad" (lat: 19.876, lng: 75.343) - node
  - "Hotel Rajgad" (lat: 19.876, lng: 75.343) - way

After dedup: 11 items
  - "Hotel Rajgad" (lat: 19.876, lng: 75.343) - kept first only
```

---

## Summary

✅ **Real Data Source**: OpenStreetMap (Global, Free)
✅ **API Type**: REST with JSON responses
✅ **Caching**: 5-minute TTL to reduce API load
✅ **Fallback**: Dummy data if API fails
✅ **Performance**: < 6 seconds to show results
✅ **Error Handling**: Graceful degradation
✅ **Responsiveness**: Works on mobile & desktop
✅ **Accuracy**: Uses Haversine formula for distance
✅ **Integration**: Seamless with existing architecture
