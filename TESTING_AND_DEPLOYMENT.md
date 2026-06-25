# Testing & Deployment Guide - Real Nearby Places

## Pre-Deployment Checklist

### Code Quality

- [ ] No console errors or warnings
- [ ] No hardcoded dummy data in frontend
- [ ] All API calls use real endpoints
- [ ] Error handling in place for all API calls
- [ ] Fallback data only used when API fails
- [ ] No breaking changes to existing features

### Functionality

- [ ] Nearby Page loads real services
- [ ] Place Details page shows real services
- [ ] Filters work correctly
- [ ] Search functionality works
- [ ] Map markers show and are clickable
- [ ] Google Maps links work
- [ ] Loading states appear
- [ ] Empty states appear when appropriate

### Performance

- [ ] API calls complete in < 3 seconds
- [ ] No memory leaks
- [ ] Cache is working (verify in DevTools)
- [ ] Lazy loading works
- [ ] Debouncing works (location updates after 450ms pause)

### Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Local Testing Setup

### Prerequisites

```bash
# Node.js 16+
node --version

# npm 8+
npm --version

# MongoDB running
mongod --version

# OpenStreetMap Overpass API (public, no setup needed)
```

### Installation

```bash
# 1. Backend setup
cd backend
npm install

# 2. Frontend setup
cd ../frontend
npm install

# 3. Copy environment variables
# Backend: Create .env
OVERPASS_URL=https://overpass-api.de/api/interpreter
NEARBY_SERVICE_CACHE_TTL_MS=300000
MONGODB_URI=mongodb://localhost:27017/tourvision
JWT_SECRET=your-secret-key
PORT=5000

# Frontend: Create .env.local (if needed)
VITE_API_URL=http://localhost:5000
```

### Start Services

```bash
# Terminal 1 - Backend
cd backend
npm start
# Expected: Server running on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Expected: Frontend on http://localhost:5173
```

---

## Manual Testing Steps

### Test 1: Nearby Page - Real Services Loading

**Steps:**

1. Open http://localhost:5173/nearby
2. Browser asks for location - Click "Allow"
3. Wait for services to load (3-5 seconds)
4. Check Network tab in DevTools

**Expected Results:**

```
✓ Services appear (Hotels, Restaurants, Fuel, Hospitals)
✓ Each service shows:
  - Real name (not "Heritage Stay" or dummy data)
  - Real distance (calculated from your location)
  - Category label (Hotels/Restaurants/etc)
  - Rating if available
  - Address if available
  - Google Maps link
✓ No dummy data showing
✓ Network tab shows: /places/nearby/services call
```

**Verification in DevTools:**

- Open Network tab
- Filter by XHR/Fetch
- Look for `/places/nearby/services` call
- Response should show real OSM data with proper structure

### Test 2: Nearby Page - Filtering

**Steps:**

1. On Nearby Page, click "Hotels" filter chip
2. Check results show only Hotels
3. Click "Restaurants" chip
4. Try "Fuel Stations" and "Hospitals"

**Expected Results:**

```
✓ Each filter shows only matching services
✓ Count updates correctly
✓ No mixing of categories
✓ Map updates to show filtered items
```

### Test 3: Nearby Page - Map Interaction

**Steps:**

1. On Nearby Page, check map displays
2. Click a marker on the map
3. Click "Show Route" button

**Expected Results:**

```
✓ Markers appear for each service
✓ Different icons for different categories
✓ Clicking marker selects it (highlights)
✓ Route panel shows with distance/time
✓ "Open in Google Maps" link works
```

### Test 4: Place Details - Nearby Tab

**Steps:**

1. Go to any place (e.g., Fort)
2. Click "Nearby" tab
3. Wait for services to load

**Expected Results:**

```
✓ Services appear (up to 4 - one per category)
✓ Each shows name, distance, rating
✓ Address visible
✓ Tags shown (e.g., "Vegetarian")
✓ "Maps" button works
✓ Real names, not dummy data
```

### Test 5: Error Handling - API Failure Simulation

**Steps:**

1. Stop backend server
2. Refresh Nearby Page
3. Check console and UI

**Expected Results:**

```
✓ Error is caught silently
✓ Fallback dummy data shows
✓ UI still works
✓ "Fallback results" indicator visible
✓ Toast notification: "Unable to load nearby places"
```

### Test 6: Location Change

**Steps:**

1. Go to Nearby Page
2. In DevTools, spoof location to different city (e.g., Delhi)
3. Wait 450ms+
4. Check if services update

**Expected Results:**

```
✓ Services update when location changes
✓ Distances recalculate
✓ New results show for new location
✓ Cache invalidates (different location)
✓ New API call made
```

### Test 7: Cache Verification

**Steps:**

1. Nearby Page - Load services (note time)
2. Refresh page - Services load again
3. Check console/Network tab for cache info

**Expected Results:**

```
✓ First load: API call (2-3 seconds)
✓ Second load (same location, < 5 min): Cached (instant)
✓ Network tab shows cache status
```

### Test 8: Search Functionality

**Steps:**

1. On Nearby Page, type in search box
2. Search for a category (e.g., "Hotel")
3. Search for a specific place name

**Expected Results:**

```
✓ Results filter based on search
✓ Works for service names
✓ Works for categories
✓ Case-insensitive
✓ Partial matching works
```

### Test 9: Google Maps Links

**Steps:**

1. Click any "Open in Google Maps" button
2. Check if Google Maps opens in new tab
3. Verify location is correct

**Expected Results:**

```
✓ Google Maps opens
✓ Place name shows in search
✓ Coordinates are accurate
✓ Can navigate from there
```

### Test 10: Empty State

**Steps:**

1. Go to a very remote location (small village)
2. Or mock location to coordinates with no data
3. Check if "No nearby places found" message shows

**Expected Results:**

```
✓ Empty state message appears
✓ Message is helpful: "No nearby places found within 5 km"
✓ UI doesn't break
✓ User can still interact
```

---

## Automated Testing Examples

### Test: Real Services API Call

```javascript
describe("fetchRealNearbyServices", () => {
  it("should fetch real services from OpenStreetMap", async () => {
    const location = { lat: 20.5937, lng: 78.9629 };
    const services = await fetchRealNearbyServices(location, 5);

    expect(services).toBeDefined();
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);

    // Verify structure
    services.forEach((service) => {
      expect(service.id).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.category).toMatch(
        /Hotels|Restaurants|Fuel Stations|Hospitals/,
      );
      expect(service.lat).toBeGreaterThan(-90);
      expect(service.lat).toBeLessThan(90);
      expect(service.lng).toBeGreaterThan(-180);
      expect(service.lng).toBeLessThan(180);
      expect(service.distance).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle API failure gracefully", async () => {
    // Mock API to fail
    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("API Error"));

    const location = { lat: 20.5937, lng: 78.9629 };
    const services = await fetchRealNearbyServices(location, 5);

    expect(services).toBeNull();
  });
});
```

### Test: PlaceNearbyTab Component

```javascript
describe("PlaceNearbyTab", () => {
  it("should load real services on mount", async () => {
    const mockLocation = { lat: 20.5937, lng: 78.9629 };

    const { getByText, getByTestId } = render(
      <PlaceNearbyTab nearbyPlaces={[]} placeLocation={mockLocation} />,
    );

    // Loading state
    expect(getByTestId("loading-skeleton")).toBeInTheDocument();

    // Wait for services to load
    await waitFor(() => {
      expect(queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    // Verify services appear
    expect(getByText(/km away/i)).toBeInTheDocument();
    expect(getByText(/Hotels|Restaurants|Fuel|Hospitals/i)).toBeInTheDocument();
  });

  it("should show empty state when no services found", async () => {
    // Mock API to return empty
    getNearbyServices.mockResolvedValueOnce({
      places: [],
      items: [],
      total: 0,
    });

    const mockLocation = { lat: 99.0, lng: 99.0 }; // Remote location

    const { getByText } = render(
      <PlaceNearbyTab nearbyPlaces={[]} placeLocation={mockLocation} />,
    );

    await waitFor(() => {
      expect(getByText(/No nearby services found/i)).toBeInTheDocument();
    });
  });
});
```

### Test: NearbyPage Integration

```javascript
describe("NearbyPage Integration", () => {
  it("should load attractions and services in parallel", async () => {
    // Mock both APIs
    getPlaces.mockResolvedValueOnce({
      places: [{ id: "place-1", name: "Fort" }],
      items: [{ id: "place-1", name: "Fort" }],
    });

    getNearbyServices.mockResolvedValueOnce({
      places: [{ id: "service-1", name: "Hotel", category: "Hotels" }],
      items: [{ id: "service-1", name: "Hotel", category: "Hotels" }],
    });

    const { getByText } = render(<NearbyPage />);

    // Mock location
    const mockGeolocation = { getCurrentPosition: jest.fn() };
    mockGeolocation.getCurrentPosition.mockImplementation((cb) => {
      cb({ coords: { latitude: 20.59, longitude: 78.96 } });
    });
    Object.defineProperty(window.navigator, "geolocation", {
      value: mockGeolocation,
    });

    await waitFor(() => {
      expect(getByText(/Fort|Hotel/i)).toBeInTheDocument();
    });
  });
});
```

---

## Staging Deployment

### Build Process

```bash
# Frontend build
cd frontend
npm run build
# Creates: dist/ folder with optimized bundle

# Backend build
cd backend
npm run build
# If using TypeScript, compiles to JS
```

### Environment Configuration

**Backend (.env.production)**

```
NODE_ENV=production
OVERPASS_URL=https://overpass-api.de/api/interpreter
NEARBY_SERVICE_CACHE_TTL_MS=300000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tourvision
JWT_SECRET=production-secret-key
PORT=5000
CORS_ORIGIN=https://your-frontend-domain.com
```

**Frontend (.env.production)**

```
VITE_API_URL=https://your-api-domain.com
VITE_ENABLE_ANALYTICS=true
```

### Deployment Steps

```bash
# 1. Backend deployment
# Option A: Docker
docker build -t tourvision-backend .
docker run -p 5000:5000 --env-file .env.production tourvision-backend

# Option B: Node on VPS
ssh user@server
cd /app/backend
npm install --production
pm2 start npm --name "backend" -- start

# 2. Frontend deployment
# Option A: CDN (Vercel, Netlify)
npm run build
vercel --prod

# Option B: Static hosting
npm run build
scp -r dist/ user@server:/var/www/html/
```

---

## Production Monitoring

### Metrics to Monitor

```
1. API Response Time
   Target: < 3 seconds
   Alert: > 5 seconds

2. Error Rate
   Target: < 0.5%
   Alert: > 2%

3. Cache Hit Rate
   Target: > 70%
   Alert: < 50%

4. OpenStreetMap API Availability
   Target: 99.9%
   Alert: < 99%

5. User Location Errors
   Target: < 1%
   Alert: > 5%
```

### Logging Setup

```javascript
// Backend logging
const logger = require("winston");

logger.info("API Call", {
  endpoint: "/places/nearby/services",
  duration: "2.5s",
  resultCount: 12,
  cacheStatus: "MISS",
  userLocation: { lat: 20.59, lng: 78.96 },
});

logger.error("OpenStreetMap API Failed", {
  statusCode: 503,
  message: "Service Unavailable",
  retryAttempt: 1,
});
```

### Performance Monitoring

```javascript
// Frontend performance tracking
performance.mark("nearby-services-start");
// ... fetch and render code ...
performance.mark("nearby-services-end");

const measure = performance.measure(
  "nearby-services",
  "nearby-services-start",
  "nearby-services-end",
);

console.log(`Nearby services took ${measure.duration}ms`);

// Send to analytics
analytics.trackPerformance({
  metric: "nearby-services-load",
  value: measure.duration,
});
```

---

## Rollback Plan

### If Real Services Cause Issues

**Option 1: Disable Real Services**

```javascript
// Set environment variable
ENABLE_REAL_SERVICES = false;

// Or comment out in code
// const services = await fetchRealNearbyServices(...);
const services = createFallbackServices(debouncedLocation);
```

**Option 2: Reduce to Fallback Only**

```javascript
// Temporarily use only dummy data
const services = createFallbackServices(debouncedLocation);
```

**Option 3: Full Rollback to Previous Version**

```bash
git revert <commit-hash>
npm run build
npm run deploy
```

---

## Success Criteria

### Before Deployment

- [ ] All tests passing
- [ ] No console errors
- [ ] Real data confirmed in dev
- [ ] Performance acceptable (< 3s)
- [ ] Fallback working
- [ ] Error handling verified

### After Deployment

- [ ] 0 critical errors in first 24 hours
- [ ] Real services showing in production
- [ ] Cache working (DevTools verification)
- [ ] Google Maps links working
- [ ] No user complaints about data
- [ ] Analytics showing improved engagement

### Long-term Success

- [ ] Reduced dummy data complaints
- [ ] Increased user engagement with services
- [ ] Improved place page retention
- [ ] Positive user feedback
- [ ] Cache hit rate > 70%
- [ ] API response time stable < 2s

---

## Troubleshooting Guide

### Issue: Real services not appearing

**Diagnosis:**

1. Check Network tab - is `/places/nearby/services` being called?
2. Check response - does it have data?
3. Check console - are there errors?

**Solutions:**

- Verify backend is running
- Check MongoDB connection
- Verify OVERPASS_URL in .env
- Check network connectivity
- Verify user location is provided
- Try with explicit coordinates

### Issue: Services showing wrong data

**Diagnosis:**

1. Verify coordinates are correct
2. Check if cached old data

**Solutions:**

- Hard refresh browser (Ctrl+Shift+R)
- Clear cache in backend (restart service)
- Verify OpenStreetMap has data for that location
- Test with different location

### Issue: Very slow loading

**Diagnosis:**

1. Check API response time
2. Check network bandwidth
3. Check server resources

**Solutions:**

- Increase cache TTL
- Reduce search radius
- Add CDN for API responses
- Optimize database queries
- Scale backend horizontally

### Issue: OpenStreetMap API unavailable

**Diagnosis:**

1. Check OpenStreetMap status page
2. Test with curl:
   ```bash
   curl "https://overpass-api.de/api/interpreter?data=..."
   ```

**Solutions:**

- Wait for OSM to recover (usually < 1 hour)
- Fallback to dummy data (automatic)
- Use alternative API (Google Places - requires key)
- Cache longer (increase TTL)

---

## Rollout Strategy

### Phase 1: Internal Testing (Day 1)

- [ ] Dev team tests all features
- [ ] QA runs test suite
- [ ] Performance verified
- [ ] Fallback tested

### Phase 2: Beta Users (Day 2-3)

- [ ] 10% of users get real services
- [ ] Monitor for errors
- [ ] Collect feedback
- [ ] Verify performance

### Phase 3: Gradual Rollout (Day 4-7)

- Day 4: 25% of users
- Day 5: 50% of users
- Day 6: 75% of users
- Day 7: 100% of users

### Phase 4: Full Production (Day 8+)

- 100% of users
- Continue monitoring
- Optimize based on metrics

---

## Post-Deployment Tasks

### Immediate (First 24 hours)

- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify cache working
- [ ] Confirm real data showing
- [ ] Check user feedback

### Short-term (First week)

- [ ] Analyze user engagement
- [ ] Optimize cache TTL if needed
- [ ] Fix any bugs found
- [ ] Document any issues

### Long-term (Ongoing)

- [ ] Monitor OSM API stability
- [ ] Optimize queries
- [ ] Add additional features
- [ ] Gather user feedback
- [ ] Plan enhancements

---

## Documentation for End Users

### What's New: Real Nearby Places

```markdown
## ✨ New Feature: Real Nearby Places

We've updated the nearby places feature with real data from
OpenStreetMap! Now when you visit a place or use the Nearby
page, you'll see:

✅ **Real Nearby Hotels** - Actual hotels in the area
✅ **Real Restaurants** - Local dining options
✅ **Fuel Stations** - Petrol, Diesel, CNG, & EV Charging
✅ **Hospitals** - Emergency medical services
✅ **Accurate Distances** - Calculated from your location
✅ **Google Maps Links** - One-click navigation

### How to Use

1. **On Nearby Page**
   - Open "Nearby Places"
   - Enable location
   - Real services appear automatically

2. **On Place Details**
   - Open any place (e.g., Fort)
   - Click "Nearby" tab
   - See real services for that location

### Tips

- Filter by category: Hotels, Restaurants, Fuel, Hospitals
- Click markers on map for details
- Click "Open in Google Maps" for directions
- Services update based on your current location

### Feedback

Found a place that should be nearby but isn't showing?

- It might not be in OpenStreetMap yet
- You can add it at openstreetmap.org
- Restart app to see updates

Questions? Contact support@tourvision.com
```

---

**Deployment Checklist Complete! Ready for production. ✅**
