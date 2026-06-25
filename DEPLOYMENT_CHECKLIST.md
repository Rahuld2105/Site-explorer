# Nearby Services - Deployment Checklist

## 🚀 Pre-Deployment Verification

### Database Setup

- [ ] MongoDB is running and accessible
- [ ] Connection string verified in `backend/.env`
- [ ] Default database `tourvision` exists
- [ ] No permission issues on database

### Backend Files

- [ ] `backend/src/models/NearbyService.js` exists
- [ ] `backend/src/controllers/nearbyService.controller.js` exists
- [ ] `backend/src/routes/nearbyService.routes.js` exists
- [ ] `backend/src/utils/distance.js` exists
- [ ] `backend/seeds/nearby-services.js` exists
- [ ] `backend/seeds/insert-nearby-services.js` exists
- [ ] `backend/server.js` has route registration
- [ ] All files have correct syntax (no typos)

### Frontend Files

- [ ] `frontend/src/pages/NearbyServicesPage.jsx` exists
- [ ] `frontend/src/api/placeApi.js` updated with 4 new functions
- [ ] `frontend/src/App.jsx` (or router) has `/nearby-services` route
- [ ] All imports resolve correctly

### Dependencies

- [ ] Backend: mongoose, express (already installed)
- [ ] Frontend: react, tailwind, react-hot-toast (already installed)
- [ ] No new dependencies required ✅

---

## 📋 Step-by-Step Deployment

### Phase 1: Database Seeding (5 minutes)

**Step 1.1: Execute Seed Script**

```bash
cd backend
node seeds/insert-nearby-services.js
```

**Expected Output:**

```
▶ Nearby Services Database Seeding

ℹ Connecting to MongoDB...
✓ Connected to MongoDB
ℹ Total records to insert: 16

▶ Starting insertion process

✓ Inserted: "Taj Falaknuma Palace"
✓ Inserted: "The Orchid Hotel Pune"
... (14 more)

✓ Successfully inserted 16 records!
```

**What to Check:**

- [ ] Script connects to MongoDB
- [ ] All 16 services are inserted
- [ ] No duplicate errors
- [ ] Script completes successfully

**Troubleshooting:**

- If connection fails: Check MongoDB service is running
- If duplicates: Run again (script skips duplicates)
- If partial insert: Check disk space, try again

**Step 1.2: Verify Database**

```bash
# MongoDB shell
use tourvision
db.nearbyservices.countDocuments()  # Should show 16
db.nearbyservices.findOne()         # Check one record
```

**What to Check:**

- [ ] Count is exactly 16
- [ ] Document has all required fields
- [ ] Location field has GeoJSON format

---

### Phase 2: Backend Testing (10 minutes)

**Step 2.1: Start Backend Server**

```bash
cd backend
npm start
```

**What to Check:**

- [ ] Server starts on port 5000
- [ ] No errors in console
- [ ] Database connection succeeds
- [ ] Routes are registered

**Step 2.2: Test Main Endpoint**

```bash
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=10"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Nearby services fetched successfully",
  "data": {
    "services": [
      { "name": "...", "distance": X.X, "distanceLabel": "X.X km away" }
    ],
    "count": 8
  }
}
```

**What to Check:**

- [ ] Response has success: true
- [ ] Services array is not empty
- [ ] Each service has distance field
- [ ] Distance values are reasonable (0-10 km)
- [ ] Response time < 500ms

**Step 2.3: Test Statistics Endpoint**

```bash
curl "http://localhost:5000/api/nearby-services/stats"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "total_services": 16,
    "by_type": {
      "hotel": { "count": 4, "avg_rating": 4.43 },
      "restaurant": { "count": 4, "avg_rating": 4.38 },
      "fuel": { "count": 4, "avg_rating": 4.15 },
      "hospital": { "count": 4, "avg_rating": 4.3 }
    }
  }
}
```

**What to Check:**

- [ ] Total services is 16
- [ ] Each type has count of 4
- [ ] Ratings are in 4.0-4.7 range

**Step 2.4: Test Type Filtering**

```bash
curl "http://localhost:5000/api/nearby-services/type/hotel?lat=18.5195&lng=73.8553"
```

**Expected Response:**

- [ ] Only hotel services in results
- [ ] Count is 4
- [ ] Each has type: "hotel"

**Step 2.5: Test Different Radius**

```bash
curl "http://localhost:5000/api/nearby-services?lat=18.5195&lng=73.8553&radius=50"
```

**Expected Response:**

- [ ] All 16 services returned (50 km covers all)
- [ ] More services than 10 km radius test

---

### Phase 3: Frontend Integration (5 minutes)

**Step 3.1: Update Router**
In your main App.jsx or router file:

```javascript
import NearbyServicesPage from "../pages/NearbyServicesPage";

// Add to your routes:
<Route path="/nearby-services" element={<NearbyServicesPage />} />;
```

**What to Check:**

- [ ] Import statement added
- [ ] Route configured at `/nearby-services`
- [ ] No import errors

**Step 3.2: Start Frontend Server**

```bash
cd frontend
npm run dev
```

**Expected:**

- [ ] Server starts on port 3000 (or configured port)
- [ ] No build errors
- [ ] Hot reload working

**Step 3.3: Navigate to Component**

```
http://localhost:3000/nearby-services
```

**What to Check:**

- [ ] Page loads without errors
- [ ] Header shows "Nearby Services"
- [ ] Controls visible (radius dropdown, mode toggle)
- [ ] Service cards start loading

---

### Phase 4: Frontend UI Testing (15 minutes)

#### Test 4.1: Page Load

- [ ] Page loads in under 3 seconds
- [ ] Skeleton loaders appear during fetch
- [ ] Services display after fetch completes
- [ ] No console errors

#### Test 4.2: Radius Selector

- [ ] Dropdown shows all 6 options (5, 10, 15, 25, 50, 100)
- [ ] Selected value is highlighted
- [ ] Changing radius triggers new search
- [ ] Results update correctly
- [ ] Larger radius shows more services

**Test Steps:**

1. Default is 10 km (~8 services)
2. Change to 5 km (fewer services)
3. Change to 50 km (all 16 services)
4. Change to 100 km (still 16 services)

#### Test 4.3: Search Mode Toggle

- [ ] Current Location button works
- [ ] Heritage Place button works
- [ ] Active button has white background
- [ ] Inactive button is gray
- [ ] Mode change triggers new search
- [ ] Different results for each mode (or same if same location)

**Test Steps:**

1. Start in Current Location mode
2. Click Heritage Place button
3. Results should update
4. Toggle back to Current Location

#### Test 4.4: Service Type Filter

- [ ] All buttons visible (All, Hotels, Restaurants, Fuel, Hospitals)
- [ ] Each button shows count (e.g., "Hotels (4)")
- [ ] Clicking a button filters results
- [ ] All button shows all services
- [ ] Active button highlighted in teal

**Test Steps:**

1. Click "Hotels" - should show 4 hotels
2. Click "Restaurants" - should show 4 restaurants
3. Click "All" - should show all 16
4. Verify counts match statistics

#### Test 4.5: Service Cards

- [ ] Each card shows: image, name, rating, distance, tags
- [ ] Card displays correctly on mobile/tablet/desktop
- [ ] Images load properly (or fallback)
- [ ] Rating badge visible in top-right
- [ ] Distance shows as "X.X km away"
- [ ] Duration shows as "X min"

**Test Steps:**

1. View on desktop (3 columns)
2. View on tablet (2 columns)
3. View on mobile (1 column)

#### Test 4.6: Action Buttons

- [ ] "Route" button opens Google Maps with directions
- [ ] "Maps" button opens Google Maps search
- [ ] Links open in new tab
- [ ] Coordinates are correct in URLs

**Test Steps:**

1. Click "Route" on first service
2. Verify Google Maps opens with directions
3. Check origin is your location
4. Check destination is service location
5. Click "Maps" on another service
6. Verify Google Maps search opens

#### Test 4.7: Loading States

- [ ] Skeleton loaders appear during fetch
- [ ] Controls are disabled during load
- [ ] Loading completes when data arrives
- [ ] No loading state remains after data loads

#### Test 4.8: Empty States

- [ ] Search in remote area (very small radius)
- [ ] Should show "No services found" message
- [ ] Suggestion to increase radius appears
- [ ] UI doesn't crash

#### Test 4.9: Error Handling

- [ ] Turn off backend server
- [ ] Try to search
- [ ] Error toast appears
- [ ] No crashes, page recovers

#### Test 4.10: Real-time Filtering

- [ ] Rapid radius changes work smoothly
- [ ] Type filtering doesn't lag
- [ ] Debouncing works (300ms)
- [ ] No duplicate API calls

---

## 🔍 Verification Tests

### API Endpoint Verification

| Endpoint       | Test URL                                                  | Expected Status | Expected Fields            |
| -------------- | --------------------------------------------------------- | --------------- | -------------------------- |
| Main Search    | `/api/nearby-services?lat=18.5195&lng=73.8553`            | 200             | services, count, grouped   |
| Stats          | `/api/nearby-services/stats`                              | 200             | total_services, by_type    |
| Type Filter    | `/api/nearby-services/type/hotel?lat=18.5195&lng=73.8553` | 200             | services with type: hotel  |
| Place Search   | `/api/nearby-services/place/123?lat=18.5195&lng=73.8553`  | 200             | services array             |
| Invalid Radius | `/api/nearby-services?lat=18&lng=73&radius=99`            | 200             | normalized to valid radius |
| Missing Lat    | `/api/nearby-services?lng=73.8553`                        | 400             | error message              |

---

## 🚨 Common Issues & Solutions

### Issue 1: "No services found"

**Diagnosis:**

```bash
# Check database has data
db.nearbyservices.countDocuments()  # Should be 16
```

**Solution:**

- Run seed script again: `node seeds/insert-nearby-services.js`
- Verify MongoDB connection in .env

### Issue 2: "Distance calculations seem wrong"

**Diagnosis:**

- Check if using correct coordinates (GeoJSON: [lng, lat])
- Verify Haversine formula constants

**Solution:**

- Confirm coordinates are [longitude, latitude] in MongoDB
- Test manually: Shaniwar Wada is (18.5195, 73.8553)

### Issue 3: "API returns empty even with 100 km radius"

**Diagnosis:**

```bash
# Check indexes
db.nearbyservices.getIndexes()
# Look for location: "2dsphere"
```

**Solution:**

- Recreate index: `db.nearbyservices.dropIndex("location_2dsphere")`
- Run seed script which recreates indexes

### Issue 4: "Frontend component doesn't load"

**Diagnosis:**

- Check browser console for errors
- Verify route added to router

**Solution:**

- Import component correctly
- Add route with exact path `/nearby-services`
- Check for typos in import path

### Issue 5: "Google Maps buttons don't work"

**Diagnosis:**

- Check if coordinates are valid numbers
- Test URLs manually in browser

**Solution:**

- Verify latitude and longitude are numeric
- Check URL building in distance.js
- Test URL manually: `https://www.google.com/maps/search/?api=1&query=18.5195,73.8553`

---

## ✅ Final Verification Checklist

### Critical Items

- [ ] All 16 services in database
- [ ] Main API endpoint returns services
- [ ] Frontend page loads without errors
- [ ] Radius selector works
- [ ] Service cards display correctly
- [ ] Google Maps links open

### Important Items

- [ ] All 4 service types have 4 services each
- [ ] Distance calculations look reasonable
- [ ] Type filtering works
- [ ] Search mode toggle functions
- [ ] Loading states display
- [ ] Error handling works

### Polish Items

- [ ] Page layout responsive
- [ ] Images load properly
- [ ] Ratings display correctly
- [ ] UI feels responsive
- [ ] No console errors or warnings
- [ ] Performance acceptable

---

## 📊 Expected Metrics

After successful deployment:

| Metric            | Target  | Status |
| ----------------- | ------- | ------ |
| Total Services    | 16      | ✅     |
| Load Time         | < 1 sec | ✅     |
| API Response      | < 500ms | ✅     |
| UI Responsiveness | Smooth  | ✅     |
| Mobile Friendly   | Yes     | ✅     |
| Browser Support   | Modern  | ✅     |

---

## 🎯 Sign-Off

When all checks pass, you can confirm:

```
✅ DATABASE: Seeded with 16 services
✅ BACKEND: All endpoints functional
✅ FRONTEND: Component displays correctly
✅ INTEGRATION: Full end-to-end working
✅ TESTING: All scenarios verified
✅ PERFORMANCE: Acceptable response times
✅ MOBILE: Responsive design working
✅ DOCUMENTATION: Complete

STATUS: READY FOR PRODUCTION ✅
```

---

## 📞 Support

If you encounter issues:

1. Check **DYNAMIC_RADIUS_NEARBY_SERVICES_GUIDE.md** for detailed documentation
2. See **NEARBY_SERVICES_QUICK_REFERENCE.md** for common commands
3. Review this checklist for troubleshooting steps
4. Check browser console for error messages
5. Check backend logs in terminal

---

## 🎉 Deployment Complete!

Once all steps are verified and all checkboxes are checked, your dynamic nearby services feature is live and ready for users!

**Next Steps:**

1. Share the feature with team
2. Gather user feedback
3. Plan enhancements (see GUIDE for future features)
4. Monitor performance and usage

---

**Deployment Checklist Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready to Use ✅
