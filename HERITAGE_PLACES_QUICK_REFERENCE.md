# Heritage Places - Quick Reference

## 🚀 Quick Start

### 1. Seed the Database

```bash
cd backend
node seeds/insert-heritage-places.js
```

### 2. Test API

```bash
curl http://localhost:5000/api/heritage-places
```

---

## 📍 API Endpoints Summary

| Method | Endpoint                              | Description                 |
| ------ | ------------------------------------- | --------------------------- |
| GET    | `/api/heritage-places`                | Get all places with filters |
| GET    | `/api/heritage-places/:placeId`       | Get single place details    |
| GET    | `/api/heritage-places/category/:name` | Get places by category      |
| GET    | `/api/heritage-places/district/:name` | Get places by district      |
| GET    | `/api/heritage-places/nearby`         | Get nearby places           |
| GET    | `/api/heritage-places/search`         | Search places               |
| GET    | `/api/heritage-places/featured`       | Get featured places         |
| GET    | `/api/heritage-places/categories`     | Get all categories          |
| GET    | `/api/heritage-places/districts`      | Get all districts           |
| GET    | `/api/heritage-places/stats`          | Get statistics              |

---

## 📂 Files Created

```
backend/
├── src/models/HeritagePlace.js
├── src/controllers/heritage.controller.js
├── src/routes/heritage.routes.js
├── seeds/
│   ├── heritage-places.js
│   ├── heritage-places.json
│   └── insert-heritage-places.js
└── server.js (updated)
```

---

## 🎯 Initial Data

### Shaniwar Wada (SW001)

- **Type:** Historical Palace/Fortification
- **Location:** Pune, Maharashtra
- **Rating:** 4.5/5 (2,847 reviews)
- **Features:** AI content, QR code, geofencing, images

### Rajgad Fort (RJ001)

- **Type:** Hill Fort
- **Location:** Pune District, Maharashtra
- **Rating:** 4.8/5 (3,156 reviews)
- **Features:** AI content, QR code, geofencing, images

---

## 🔑 Key Features

✅ Geospatial queries (nearby places)
✅ Full-text search
✅ Category filtering
✅ District-based filtering
✅ QR scan tracking
✅ AI content with 5 sections
✅ Image galleries
✅ Visit information (fees, hours, duration)
✅ Historical details
✅ Architectural information
✅ Travel tips and hidden facts

---

## 📊 Data Structure

### Required Fields

- `place_id`: Unique identifier (e.g., "SW001")
- `name`: Place name
- `category`: Type of heritage site
- `latitude`, `longitude`: Coordinates
- `district`: District name
- `description`: Short description

### Optional Fields

- `qr_id`: For QR code scanning
- `ai_content`: AI-generated content sections
- `images`: Array of image URLs
- `rating`, `review_count`: Ratings
- `history`, `architecture`: Detailed information
- `best_time_to_visit`, `estimated_visit_duration`: Visit info
- `entry_fee`, `hours`, `contact`, `website`: Practical info

---

## 🧪 Test Queries

```bash
# Exact place
curl http://localhost:5000/api/heritage-places/SW001

# All by rating
curl "http://localhost:5000/api/heritage-places?sortBy=rating&sortOrder=desc"

# Hill forts
curl "http://localhost:5000/api/heritage-places/category/Hill%20Fort"

# Pune district
curl "http://localhost:5000/api/heritage-places/district/Pune"

# Nearby (10 km from coordinates)
curl "http://localhost:5000/api/heritage-places/nearby?lat=18.5195&lng=73.8553&radius=10"

# Search
curl "http://localhost:5000/api/heritage-places/search?q=Shaniwar"

# Statistics
curl http://localhost:5000/api/heritage-places/stats
```

---

## 💡 Usage Examples

### Frontend Integration

```javascript
// Get all heritage places
const response = await fetch("/api/heritage-places");
const { data } = await response.json();

// Get specific place with AI content
const place = await fetch("/api/heritage-places/SW001").then((r) => r.json());
console.log(place.data.place.ai_content); // AI content available

// Find nearby places
const nearby = await fetch(
  `/api/heritage-places/nearby?lat=${userLat}&lng=${userLng}&radius=50`,
).then((r) => r.json());

// Search places
const results = await fetch(`/api/heritage-places/search?q=Shaniwar`).then(
  (r) => r.json(),
);
```

---

## 🎨 Supported Features by Place

### Shaniwar Wada

- ✅ AI Guide (5 sections + 8 hidden facts + 10 travel tips)
- ✅ QR Code (ID: SW001)
- ✅ Maps (18.5195°N, 73.8553°E)
- ✅ Trip Planner (2-3 hours, Oct-Feb, ₹200)
- ✅ Gallery (3 images)

### Rajgad Fort

- ✅ AI Guide (5 sections + 10 hidden facts + 10 travel tips)
- ✅ QR Code (ID: RJ001)
- ✅ Maps (18.2466°N, 73.6828°E)
- ✅ Trip Planner (5-8 hours, Jun-Feb, ₹100)
- ✅ Gallery (4 images)

---

## 🔄 Data Format

### AI Content Example

```json
{
  "ai_content": {
    "overview": "Detailed overview...",
    "history": "Historical background...",
    "architecture": "Architectural details...",
    "hidden_facts": ["Fact 1", "Fact 2", ...],
    "travel_tips": ["Tip 1", "Tip 2", ...]
  }
}
```

### Location Example

```json
{
  "latitude": 18.5195,
  "longitude": 73.8553,
  "location": {
    "type": "Point",
    "coordinates": [73.8553, 18.5195]
  }
}
```

### QR Example

```json
{
  "qr_id": "SW001",
  "qr_stats": {
    "total_scans": 0,
    "last_scan_at": null
  }
}
```

---

## 🚀 Next Steps

1. **Run insert script:** `node seeds/insert-heritage-places.js`
2. **Test endpoints:** Use curl or Postman
3. **Integrate frontend:** Use provided API endpoints
4. **Add more places:** Follow same structure
5. **Enhance AI content:** Use AI service integration
6. **Implement geofencing:** Use geofence_polygon field
7. **Add QR scanning:** Use qr_id for QR code generation

---

## 📝 Notes

- All coordinates in decimal format (WGS84)
- Images from Unsplash (free license)
- Entry fees in Indian Rupees (₹)
- Contact format: +91-XXXX-XXXXXX
- All content is realistic and production-ready
- Database supports geospatial queries via 2dsphere index

---

## 🆘 Troubleshooting

### No places returned

1. Check database connection
2. Verify seed data inserted: `db.heritageplaces.countDocuments()`
3. Check filters (category, district, state)

### Geospatial queries not working

1. Verify 2dsphere index created: `db.heritageplaces.getIndexes()`
2. Check coordinate format: [longitude, latitude]
3. Use proper query parameters

### Images not loading

1. Check image URL format (should be full URL)
2. Verify CORS settings
3. Test image URL in browser

---

**Status:** ✅ Ready for Production  
**Version:** 1.0  
**Last Updated:** 2024
