# Dynamic Nearby Services - Quick Reference

## 🚀 Quick Start

### 1. Seed Database

```bash
cd backend
node seeds/insert-nearby-services.js
```

### 2. Test Endpoints

```bash
# Get all services within 10 km
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=10"

# Get only hotels
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&type=hotel"

# Get statistics
curl "http://localhost:5000/api/nearby-services/stats"
```

### 3. Navigate to UI

```
http://localhost:3000/nearby-services
```

---

## 📋 API Quick Lookup

### GET /api/nearby-services

Main endpoint for radius-based search

**Params:** `lat`, `lng`, `radius`, `type`, `limit`, `sort`, `minRating`

```bash
curl "http://localhost:5000/api/nearby-services?\
  lat=18.5195&\
  lng=73.8553&\
  radius=10&\
  type=restaurant&\
  sort=rating"
```

### GET /api/nearby-services/stats

Service statistics

```bash
curl "http://localhost:5000/api/nearby-services/stats"
```

### GET /api/nearby-services/type/:serviceType

Filter by type (hotel, restaurant, fuel, hospital)

```bash
curl "http://localhost:5000/api/nearby-services/type/hotel?\
  lat=18.5195&\
  lng=73.8553&\
  radius=25"
```

---

## 🎯 Frontend Integration

### Import API Functions

```javascript
import {
  getNearbyServicesByLocation,
  getNearbyServicesByType,
  getNearbyServicesStats,
} from "../api/placeApi";
```

### Fetch Services

```javascript
const response = await getNearbyServicesByLocation({
  lat: 18.5195,
  lng: 73.8553,
  radius: 10,
  type: "hotel",
});

const services = response.data.data.services;
```

### Component Usage

```javascript
import NearbyServicesPage from "../pages/NearbyServicesPage";

// In router
<Route path="/nearby-services" element={<NearbyServicesPage />} />;
```

---

## 📊 Seed Data Overview

### 16 Services Total

- **Hotels**: 4
  - Taj Falaknuma Palace (luxury)
  - The Orchid Hotel (business)
  - Hotel Shaligraam (budget)
  - Radisson Blu (premium)

- **Restaurants**: 4
  - Osho Garden (vegetarian)
  - Cafe Coffee Day (coffee)
  - Vada Pav Junction (fast food)
  - Maharaja Bhog (Indian)

- **Fuel Stations**: 4
  - Indian Oil
  - Hindustan Petroleum
  - Bharat Petroleum
  - Shell

- **Hospitals**: 4
  - Sassoon General (public)
  - Ruby Hall Clinic (premium)
  - City Care Hospital (mid-range)
  - Wanless Hospital (general)

---

## 🎨 UI Features

### Radius Selector

```javascript
<RadiusSelector value={radius} onChange={setRadius} disabled={loading} />
```

Options: 5, 10, 15, 25, 50, 100 km

### Search Mode Toggle

```javascript
<SearchModeToggle
  value={searchMode}
  onChange={setSearchMode}
  disabled={loading}
/>
```

Modes: Current Location, Heritage Place

### Service Type Filter

```javascript
<ServiceTypeFilter
  value={serviceType}
  onChange={setServiceType}
  disabled={loading}
  stats={stats}
/>
```

Options: All, Hotels, Restaurants, Fuel, Hospitals

---

## 🗄️ Database Queries

### Find Hotels Within 10 km

```javascript
db.nearbyservices
  .find({
    type: "hotel",
    is_active: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [73.8553, 18.5195],
        },
        $maxDistance: 10000,
      },
    },
  })
  .limit(10);
```

### Get Top-Rated Services

```javascript
db.nearbyservices
  .find({
    is_active: true,
    rating: { $gte: 4.5 },
  })
  .sort({ rating: -1 })
  .limit(20);
```

### Count by Type

```javascript
db.nearbyservices.aggregate([
  { $match: { is_active: true } },
  { $group: { _id: "$type", count: { $sum: 1 } } },
]);
```

---

## 🔄 Data Flow Diagram

```
User Input (lat, lng, radius, type)
  ↓
NearbyServicesPage Component
  ↓
getNearbyServicesByLocation(params)
  ↓
POST /api/nearby-services
  ↓
nearbyService.controller.js
  ↓
MongoDB Query (2dsphere index)
  ↓
enrichService() - Add distances
  ↓
Response JSON
  ↓
Service Cards Display
  ↓
User clicks Route → Google Maps
```

---

## 🧪 Test Scenarios

### Test 1: Basic 10 km Search

```bash
curl "http://localhost:5000/api/nearby-services?\
  lat=18.5195&\
  lng=73.8553&\
  radius=10"
# Expected: ~4-6 services
```

### Test 2: 50 km Search

```bash
curl "http://localhost:5000/api/nearby-services?\
  lat=18.5195&\
  lng=73.8553&\
  radius=50"
# Expected: All 16 services
```

### Test 3: Only Hospitals

```bash
curl "http://localhost:5000/api/nearby-services?\
  lat=18.5195&\
  lng=73.8553&\
  type=hospital"
# Expected: 4 hospitals
```

### Test 4: Top-Rated

```bash
curl "http://localhost:5000/api/nearby-services?\
  lat=18.5195&\
  lng=73.8553&\
  minRating=4.5"
# Expected: ~8 services
```

---

## 📁 Key Files

| File                                                  | Purpose                    |
| ----------------------------------------------------- | -------------------------- |
| `backend/src/models/NearbyService.js`                 | Schema with 2dsphere index |
| `backend/src/controllers/nearbyService.controller.js` | API logic                  |
| `backend/src/routes/nearbyService.routes.js`          | Route definitions          |
| `backend/src/utils/distance.js`                       | Haversine calculations     |
| `backend/seeds/nearby-services.js`                    | 16 service records         |
| `backend/seeds/insert-nearby-services.js`             | Seed script                |
| `frontend/src/pages/NearbyServicesPage.jsx`           | Main UI component          |
| `frontend/src/api/placeApi.js`                        | API functions              |

---

## ⚙️ Configuration

### Valid Radii

```javascript
const VALID_RADII = [5, 10, 15, 25, 50, 100]; // km
const DEFAULT_RADIUS = 10; // km
```

### Service Types

```javascript
const SERVICE_TYPES = ["hotel", "restaurant", "fuel", "hospital"];
```

### Search Modes

```javascript
const SEARCH_MODES = ["current", "place"];
```

### Average Drive Speed

```javascript
const AVG_DRIVE_SPEED_KMH = 32;
```

---

## 🐛 Troubleshooting

### No Services Returned

- Check coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- Verify radius is in valid list (5, 10, 15, 25, 50, 100)
- Confirm services are in database: `db.nearbyservices.count()`

### Wrong Distances

- Verify Haversine formula in distance.js
- Check GeoJSON order: [longitude, latitude]
- Confirm 2dsphere index exists

### Slow Queries

- Check 2dsphere index: `db.nearbyservices.getIndexes()`
- Monitor query performance: `db.nearbyservices.explain().find(...)`
- Limit results to 100

### API Errors

- Check MongoDB connection
- Verify routes registered in server.js
- Check error logs in terminal

---

## 📈 Performance Tips

1. **Limit Results**: Always use reasonable limits (default 100)
2. **Index Properly**: Ensure 2dsphere index on location field
3. **Cache Results**: Debounce searches (300ms)
4. **Lazy Load**: Load images as needed
5. **Batch Requests**: Group multiple queries when possible

---

## 🔐 Security Notes

- Always validate lat/lng input
- Validate radius against whitelist
- Limit max results returned
- Use CORS restrictions
- Add rate limiting if needed

---

## 📞 Support

**Documentation Files:**

- Full Guide: `DYNAMIC_RADIUS_NEARBY_SERVICES_GUIDE.md`
- Quick Reference: This file

**Code Comments:**

- Well-commented in all controller functions
- JSDoc comments in distance utility
- Component comments in React files

---

## ✅ Status

- ✅ Database schema complete
- ✅ API endpoints ready
- ✅ Frontend UI complete
- ✅ Seed data prepared (16 services)
- ✅ Distance calculations implemented
- ✅ Google Maps integration done
- ✅ Real-time filtering working
- ✅ Production ready

---

**Ready to deploy!** 🚀
