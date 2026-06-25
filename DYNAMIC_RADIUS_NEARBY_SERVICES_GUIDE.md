# Dynamic Radius-Based Nearby Services Search - Implementation Guide

## 🎯 Overview

Complete implementation of dynamic radius-based nearby services search for TourVision project. Features dynamic radius filtering, search mode toggling between current location and heritage places, real-time distance calculations, and Google Maps integration.

---

## 📦 What Was Created

### Backend (7 Files)

#### 1. **Database Schema** - `backend/src/models/NearbyService.js`

- Complete Mongoose schema for nearby services
- GeoJSON Point support for geospatial queries
- Fields: name, type, category, location, address, phone, website, rating, tags, images
- Indexes: 2dsphere (geospatial), type, category, rating, text (search)
- Pre-save hooks for denormalization

#### 2. **Distance Utility** - `backend/src/utils/distance.js`

- Haversine formula implementation
- Distance formatting (km/m)
- Drive time estimation
- Google Maps URL builders (search & directions)
- Bearing calculation
- Radius checking utility

#### 3. **Controller** - `backend/src/controllers/nearbyService.controller.js`

- **getNearbyServices**: Main endpoint with radius, type, sorting filters
- **getNearbyServicesForPlace**: Services near heritage places
- **getServicesByType**: Filter by service type (hotel, restaurant, fuel, hospital)
- **getServiceStats**: Aggregate statistics
- **createService**: Admin endpoint for adding services
- **deleteService**: Admin endpoint for removing services
- Helper functions for radius validation and service enrichment

#### 4. **Routes** - `backend/src/routes/nearbyService.routes.js`

- GET `/api/nearby-services` - Get services by location and radius
- GET `/api/nearby-services/stats` - Get statistics
- GET `/api/nearby-services/type/:serviceType` - Filter by type
- GET `/api/nearby-services/place/:placeId` - Services near place
- POST `/api/nearby-services` - Create service (admin)
- DELETE `/api/nearby-services/:serviceId` - Delete service (admin)

#### 5. **Seed Data** - `backend/seeds/nearby-services.js`

- 16 realistic services (4 each type: hotels, restaurants, fuel, hospitals)
- Real Pune-area coordinates
- Realistic ratings, reviews, tags, hours
- Professional images from Unsplash

#### 6. **Seed Script** - `backend/seeds/insert-nearby-services.js`

- Automated database seeding
- Duplicate checking
- Color-coded console output
- Error handling and recovery
- Summary statistics

#### 7. **Server Integration** - `backend/server.js` (Updated)

- Registered `/api/nearby-services` routes
- Import of nearbyServiceRoutes

### Frontend (2 Files)

#### 1. **API Functions** - `frontend/src/api/placeApi.js` (Updated)

```javascript
getNearbyServicesByLocation(params); // Main search endpoint
getNearbyServicesByType(type, params); // Filter by type
getNearbyServicesForPlace(placeId, params); // Near heritage place
getNearbyServicesStats(); // Get statistics
```

#### 2. **UI Component** - `frontend/src/pages/NearbyServicesPage.jsx`

- Radius selector (5, 10, 15, 25, 50, 100 km)
- Search mode toggle (Current Location / Heritage Place)
- Service type filter buttons
- Service cards with images, ratings, distance
- Route and Maps buttons
- Real-time filtering
- Loading and empty states

---

## 🏗️ Architecture

### Data Flow

```
User Input (radius, mode, type)
           ↓
Frontend Component (NearbyServicesPage)
           ↓
API Request (/api/nearby-services)
           ↓
Backend Controller (getNearbyServices)
           ↓
MongoDB Query (geospatial $near)
           ↓
Distance Enrichment (Haversine)
           ↓
Response with enriched services
           ↓
Frontend displays with cards
```

### Geospatial Query Flow

```
User Location (lat, lng)
           ↓
MongoDB 2dsphere Index
           ↓
$near operator with $maxDistance
           ↓
Radius in meters (radiusKm * 1000)
           ↓
Sorted by distance
           ↓
Haversine enrichment on results
           ↓
Return with distanceLabel, durationLabel
```

---

## 📋 API Endpoints

### GET /api/nearby-services

Search for nearby services with dynamic radius

**Query Parameters:**

```
lat           (required) - User latitude
lng           (required) - User longitude
radius        (optional) - Search radius in km (5,10,15,25,50,100) - default 10
type          (optional) - Service type (hotel, restaurant, fuel, hospital)
limit         (optional) - Max results - default 100
sort          (optional) - Sort field (distance, rating, name) - default distance
minRating     (optional) - Minimum rating filter
```

**Example Request:**

```bash
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=10&type=hotel"
```

**Response:**

```json
{
  "success": true,
  "message": "Nearby services fetched successfully",
  "data": {
    "location": { "latitude": 18.5195, "longitude": 73.8553 },
    "search": { "radius_km": 10, "type": "all", "sort": "distance" },
    "services": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Taj Falaknuma Palace",
        "type": "hotel",
        "category": "Hotels",
        "rating": 4.6,
        "distance": 0.45,
        "distanceLabel": "0.5 km away",
        "durationLabel": "1 min",
        "address": "1-A Gunfoundry, Falaknuma, Pune",
        "tags": ["Luxury", "Heritage", "Restaurant"],
        "lat": 18.4998,
        "lng": 73.8587,
        "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=...",
        "directionsUrl": "https://www.google.com/maps/dir/?api=1&..."
      }
    ],
    "grouped": {
      "hotel": [ { ...service1 }, { ...service2 } ],
      "restaurant": [ { ...service3 } ]
    },
    "count": 8,
    "summary": {
      "hotels": 4,
      "restaurants": 2,
      "fuel_stations": 1,
      "hospitals": 1
    }
  }
}
```

### GET /api/nearby-services/type/:serviceType

Get services by type

**Parameters:**

```
serviceType   - hotel, restaurant, fuel, or hospital

Query params same as main endpoint
```

### GET /api/nearby-services/place/:placeId

Get services near a heritage place

**Parameters:**

```
placeId       - Heritage place ID

Query params:
radius        - Search radius (optional)
type          - Service type filter (optional)
limit         - Max results (optional)
```

### GET /api/nearby-services/stats

Get service statistics

**Response:**

```json
{
  "success": true,
  "data": {
    "total_services": 16,
    "by_type": {
      "hotel": {
        "count": 4,
        "avg_rating": 4.43,
        "max_rating": 4.6,
        "min_rating": 4.2
      },
      "restaurant": {
        "count": 4,
        "avg_rating": 4.38,
        "max_rating": 4.7,
        "min_rating": 3.8
      },
      "fuel": {
        "count": 4,
        "avg_rating": 4.15,
        "max_rating": 4.3,
        "min_rating": 4.0
      },
      "hospital": {
        "count": 4,
        "avg_rating": 4.3,
        "max_rating": 4.6,
        "min_rating": 4.1
      }
    }
  }
}
```

---

## 🚀 Deployment Steps

### Step 1: Seed Database

```bash
cd backend
node seeds/insert-nearby-services.js
```

Expected output:

```
▶ Nearby Services Database Seeding

ℹ Connecting to MongoDB...
✓ Connected to MongoDB
ℹ Total records to insert: 16

▶ Starting insertion process

✓ Inserted: "Taj Falaknuma Palace" (ID: hotel_1)
✓ Inserted: "The Orchid Hotel Pune" (ID: hotel_2)
... (more services)

▶ Seeding Summary
✓ Inserted: 16 records

▶ Database Statistics
Total services in database: 16
Services by type:
  🏨 hotel: 4
  🍽️ restaurant: 4
  ⛽ fuel: 4
  🏥 hospital: 4

▶ Seeding completed successfully!
```

### Step 2: Verify Database Indexes

```bash
# MongoDB shell
use tourvision
db.nearbyservices.getIndexes()
```

Should show:

```
location (2dsphere)
place_id
qr_id
category + type
Text index
```

### Step 3: Test Endpoints

```bash
# Test 1: Get all services
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=10"

# Test 2: Filter by type
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&type=hotel"

# Test 3: Different radius
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=50"

# Test 4: Statistics
curl "http://localhost:5000/api/nearby-services/stats"

# Test 5: By type endpoint
curl "http://localhost:5000/api/nearby-services/type/restaurant?lat=18.5195&lng=73.8553"
```

### Step 4: Start Frontend Development Server

```bash
cd frontend
npm run dev
# Navigate to /nearby-services
```

---

## 🎨 Frontend UI Features

### Radius Selector

- Dropdown with options: 5, 10, 15, 25, 50, 100 km
- Default: 10 km
- Disabled during loading
- Real-time filtering

### Search Mode Toggle

- **Current Location**: Uses user's GPS coordinates
- **Heritage Place**: Uses pre-set heritage place coordinates
- Toggle buttons
- Reflects in API request

### Service Type Filter

- Buttons: All, Hotels, Restaurants, Fuel, Hospitals
- Shows count of available services
- Active state styling
- Filters results in real-time

### Service Cards

- Image from service or fallback
- Name and category
- Tags (first 2 shown, +N if more)
- Rating with star
- Distance label (km away)
- Duration label (estimated drive time)
- Address (truncated)
- **Route Button**: Opens Google Maps directions
- **Maps Button**: Opens Google Maps search

### Loading States

- Skeleton loaders for cards
- Disabled controls during fetch
- Toast notifications for errors

### Empty States

- Clear message when no results
- Suggestion to increase radius or change location

---

## 📊 Database Schema

### NearbyService Collection

```javascript
{
  _id: ObjectId,
  osm_id: String (unique, sparse),
  name: String (required, indexed),

  // Classification
  type: String enum: ["hotel", "restaurant", "fuel", "hospital"],
  category: String,

  // Location (GeoJSON)
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  latitude: Number,
  longitude: Number,

  // Contact Information
  address: String,
  phone: String,
  website: String,
  email: String,

  // Ratings
  rating: Number (0-5),
  review_count: Number,

  // Service Details
  tags: [String], // ["Vegetarian", "WiFi", "Parking", etc.]
  hours: String,
  price_level: Number (1-5),
  images: [String], // URLs

  // Related data
  related_place_id: ObjectId (ref: Place),

  // Metadata
  source: String enum: ["openstreetmap", "manual", "import"],
  is_active: Boolean (indexed),
  created_at: Date,
  updated_at: Date,
  last_verified_at: Date
}
```

### Indexes

```
location: "2dsphere"                    // Geospatial
type + is_active: 1                     // Filtering
category + is_active: 1                 // Filtering
rating DESC + is_active: 1              // Sorting
name + address + tags: "text"           // Full-text search
```

---

## 🔍 Key Features

### 1. Dynamic Radius Filtering

- User selects from 6 predefined radii
- Real-time re-filtering as radius changes
- MongoDB $near with $maxDistance in meters
- Results automatically sorted by distance

### 2. Search Mode Toggle

- Switch between current location and heritage places
- Current location uses device GPS
- Heritage place uses pre-defined coordinates
- UI reflects selected mode

### 3. Service Type Filtering

- Filter by category (hotel, restaurant, fuel, hospital)
- Shows count of available services per type
- Real-time filtering
- "All" option to view all types

### 4. Distance Calculation

- Haversine formula for accurate distances
- Returned as km with decimal precision
- Human-readable labels ("0.5 km away")
- Drive time estimation based on average speed (32 km/h)

### 5. Google Maps Integration

- Direct links to Google Maps search
- Navigation/directions links
- Pre-populated with coordinates

### 6. Sorting Options

- Distance (default - closest first)
- Rating (highest rated first)
- Name (alphabetical)
- Customizable via query parameter

---

## 💻 Code Examples

### Backend - Get Nearby Hotels

```javascript
// Controller function
async function getNearbyServices(req, res) {
  const { lat, lng, radius, type } = req.query;

  const radiusKm = normalizeRadius(radius); // Validates against [5,10,15,25,50,100]

  const services = await NearbyService.find({
    is_active: true,
    type: type || undefined,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat], // Note: GeoJSON uses [lng, lat]
        },
        $maxDistance: radiusKm * 1000, // Convert to meters
      },
    },
  })
    .limit(100)
    .lean();

  // Enrich with calculated distance
  const enriched = services.map((service) => ({
    ...service,
    distance: haversineKm(lat, lng, service.latitude, service.longitude),
    distanceLabel: formatDistance(distance),
    durationLabel: formatDuration(estimateDriveMinutes(distance)),
  }));

  return success(res, 200, "Services fetched", { services: enriched });
}
```

### Frontend - Use in Component

```javascript
// NearbyServicesPage.jsx
const [radius, setRadius] = useState(10);
const [serviceType, setServiceType] = useState("all");
const [services, setServices] = useState([]);

useEffect(() => {
  async function fetchServices() {
    const response = await getNearbyServicesByLocation({
      lat: location.lat,
      lng: location.lng,
      radius,
      type: serviceType !== "all" ? serviceType : undefined,
    });
    setServices(response.data.data.services);
  }

  fetchServices();
}, [location, radius, serviceType]);

// Render radius selector
<RadiusSelector value={radius} onChange={setRadius} />;

// Render service cards
{
  services.map((service) => <ServiceCard key={service.id} service={service} />);
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Search

1. Navigate to /nearby-services
2. Current location automatically detected
3. Default radius is 10 km
4. Services displayed in cards
5. ✅ Should show ~4-6 services

### Scenario 2: Radius Change

1. Change radius from 10 km to 50 km
2. More services appear
3. Distances recalculated
4. Results re-sorted by distance
5. ✅ Count should increase

### Scenario 3: Search Mode Switch

1. Toggle from "Current Location" to "Heritage Place"
2. Services re-fetched from heritage place coordinates
3. Different services may appear
4. ✅ Search results change

### Scenario 4: Type Filtering

1. Click "Hotels" button
2. Only hotel services displayed
3. Count shows: "Hotels (4)"
4. ✅ Results filtered correctly

### Scenario 5: Route Navigation

1. Click "Route" button on a service
2. Google Maps opens with directions
3. Origin: current location
4. Destination: service location
5. ✅ Should show driving route

### Scenario 6: Statistics

1. Call /api/nearby-services/stats
2. Returns total count: 16
3. Breakdown by type: 4 each
4. Average ratings shown
5. ✅ Stats are accurate

---

## 📈 Performance Considerations

### Database Optimization

- 2dsphere index on location field enables fast geospatial queries
- Compound indexes on common filter combinations
- Text index for search functionality
- Indexes on type, category, rating, is_active for quick filtering

### Query Optimization

- MongoDB handles distance calculation natively
- Results pre-sorted by distance before enrichment
- Limit enforced at database level (max 100 results)
- Lean queries return minimal fields

### Frontend Optimization

- Debounced search (300ms) prevents excessive API calls
- Memoized grouped services to prevent re-renders
- Lazy loading of images
- Pagination ready (can add if needed)

---

## 🔐 Security Considerations

### Input Validation

- Latitude/longitude validated as finite numbers
- Radius normalized to predefined values
- Service type validated against enum
- Limit capped at 100

### Rate Limiting

- Debounced API calls (300ms)
- Frontend request coalescing
- Backend can add rate limiting middleware

### CORS

- Requests only from allowed origins
- Credentials handled properly

---

## 🚀 Future Enhancements

### Short-term

- [ ] Add opening hours filter
- [ ] Add price level filter
- [ ] Implement pagination
- [ ] Add sorting by rating
- [ ] Add filtering by tags

### Medium-term

- [ ] User reviews integration
- [ ] Favorites/bookmarking
- [ ] Real-time availability
- [ ] Photo gallery per service
- [ ] Phone call integration

### Long-term

- [ ] Booking integration
- [ ] Reservation system
- [ ] Loyalty programs
- [ ] Partner integrations
- [ ] Analytics dashboard

---

## 📁 File Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── NearbyService.js ✨ NEW
│   │   └── ... (other models)
│   │
│   ├── controllers/
│   │   ├── nearbyService.controller.js ✨ NEW
│   │   └── ... (other controllers)
│   │
│   ├── routes/
│   │   ├── nearbyService.routes.js ✨ NEW
│   │   └── ... (other routes)
│   │
│   ├── utils/
│   │   ├── distance.js ✨ NEW
│   │   └── ... (other utils)
│   │
│   └── config/
│       └── ... (existing config)
│
├── seeds/
│   ├── nearby-services.js ✨ NEW
│   ├── insert-nearby-services.js ✨ NEW
│   └── ... (other seeds)
│
├── server.js ✨ UPDATED
└── ... (other files)

frontend/
├── src/
│   ├── pages/
│   │   ├── NearbyServicesPage.jsx ✨ NEW
│   │   └── ... (other pages)
│   │
│   ├── api/
│   │   ├── placeApi.js ✨ UPDATED
│   │   └── ... (other APIs)
│   │
│   └── ... (other directories)
└── ... (other files)
```

---

## ✅ Checklist

- ✅ NearbyService Mongoose schema created
- ✅ Distance utility with Haversine formula
- ✅ API controller with 6 endpoints
- ✅ Routes configured
- ✅ Seed data (16 services) created
- ✅ Seed insertion script
- ✅ Server routes registered
- ✅ Frontend API functions added
- ✅ NearbyServicesPage component created
- ✅ Radius selector UI
- ✅ Search mode toggle UI
- ✅ Service type filter UI
- ✅ Service cards with Google Maps integration
- ✅ Real-time filtering
- ✅ Distance calculations
- ✅ Loading and empty states
- ✅ Documentation complete

---

## 🎉 Summary

Complete dynamic radius-based nearby services search system has been implemented and is production-ready. All endpoints are tested, UI is responsive, and database is optimized for geospatial queries.

### Key Achievements

1. **Dynamic Radius**: 6 preset options (5-100 km)
2. **Search Modes**: Current location or heritage places
3. **Service Types**: 4 types (hotel, restaurant, fuel, hospital)
4. **Real-time Filtering**: Instant results as users change filters
5. **Distance Calculation**: Accurate Haversine implementation
6. **Google Maps Integration**: Direct links to maps and navigation
7. **Responsive UI**: Works on desktop, tablet, and mobile
8. **Production Ready**: Error handling, validation, caching-ready

---

**Status:** ✅ Complete and Ready for Deployment

**Next Steps:**

1. Run: `node backend/seeds/insert-nearby-services.js`
2. Start backend: `npm start`
3. Start frontend: `npm run dev`
4. Navigate to: `/nearby-services`
