/**
 * Seed data for Nearby Services
 * This file contains realistic nearby services data from various locations
 * Data includes hotels, restaurants, fuel stations, and hospitals
 */

const nearbyServicesData = [
  // HOTELS - Pune area
  {
    osm_id: "hotel_1",
    name: "Taj Falaknuma Palace",
    type: "hotel",
    category: "Hotels",
    location: {
      type: "Point",
      coordinates: [73.8587, 18.4998]
    },
    latitude: 18.4998,
    longitude: 73.8587,
    address: "1-A Gunfoundry, Falaknuma, Pune",
    phone: "+91-20-6611-5000",
    website: "https://www.tajhotels.com",
    rating: 4.6,
    review_count: 1847,
    tags: ["Luxury", "Heritage", "Restaurant", "Spa", "WiFi", "Parking"],
    hours: "24 Hours",
    price_level: 5,
    images: [
      "https://images.unsplash.com/photo-1542314503-52097f6fb66f?w=500&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hotel_2",
    name: "The Orchid Hotel Pune",
    type: "hotel",
    category: "Hotels",
    location: {
      type: "Point",
      coordinates: [73.8743, 18.5133]
    },
    latitude: 18.5133,
    longitude: 73.8743,
    address: "1090 Koregaon Park, Pune",
    phone: "+91-20-4050-8050",
    website: "https://www.orchidhotel.com",
    rating: 4.5,
    review_count: 1563,
    tags: ["Business", "Restaurant", "Gym", "WiFi", "Parking"],
    hours: "24 Hours",
    price_level: 4,
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hotel_3",
    name: "Hotel Shaligraam",
    type: "hotel",
    category: "Hotels",
    location: {
      type: "Point",
      coordinates: [73.8505, 18.5204]
    },
    latitude: 18.5204,
    longitude: 73.8505,
    address: "Shaniwar Wada, Pune",
    phone: "+91-20-2465-1234",
    website: "https://www.shaligraam.com",
    rating: 4.2,
    review_count: 892,
    tags: ["Budget", "Restaurant", "WiFi"],
    hours: "6:00 AM - 11:00 PM",
    price_level: 2,
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hotel_4",
    name: "Radisson Blu Pune Kharadi",
    type: "hotel",
    category: "Hotels",
    location: {
      type: "Point",
      coordinates: [73.9432, 18.5317]
    },
    latitude: 18.5317,
    longitude: 73.9432,
    address: "Kharadi, Pune",
    phone: "+91-20-2129-0000",
    website: "https://www.radissonblu.com",
    rating: 4.4,
    review_count: 1734,
    tags: ["Premium", "Restaurant", "Conference", "WiFi", "Parking"],
    hours: "24 Hours",
    price_level: 4,
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },

  // RESTAURANTS - Pune area
  {
    osm_id: "rest_1",
    name: "Osho Garden Restaurant",
    type: "restaurant",
    category: "Restaurants",
    location: {
      type: "Point",
      coordinates: [73.8612, 18.4856]
    },
    latitude: 18.4856,
    longitude: 73.8612,
    address: "Fort Street, Pune",
    phone: "+91-20-2312-3456",
    website: "https://www.oshogarden.com",
    rating: 4.7,
    review_count: 2156,
    tags: ["Vegetarian", "Multi-Cuisine", "Outdoor Seating", "WiFi"],
    hours: "11:00 AM - 11:00 PM",
    price_level: 3,
    images: [
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "rest_2",
    name: "Cafe Coffee Day",
    type: "restaurant",
    category: "Restaurants",
    location: {
      type: "Point",
      coordinates: [73.8545, 18.5198]
    },
    latitude: 18.5198,
    longitude: 73.8545,
    address: "Shaniwar Wada, Pune",
    phone: "+91-20-2461-5555",
    website: "https://www.cafecoffeeday.com",
    rating: 3.8,
    review_count: 945,
    tags: ["Coffee", "Snacks", "WiFi", "Free Parking"],
    hours: "7:00 AM - 10:00 PM",
    price_level: 2,
    images: [
      "https://images.unsplash.com/photo-1559521293-5c69f2a101d5?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "rest_3",
    name: "Vada Pav Junction",
    type: "restaurant",
    category: "Restaurants",
    location: {
      type: "Point",
      coordinates: [73.8756, 18.5145]
    },
    latitude: 18.5145,
    longitude: 73.8756,
    address: "East Street, Pune",
    phone: "+91-20-2601-7890",
    website: "https://www.vadapavjunction.com",
    rating: 4.3,
    review_count: 1567,
    tags: ["Fast Food", "Vegetarian", "Budget Friendly"],
    hours: "6:00 AM - 9:00 PM",
    price_level: 1,
    images: [
      "https://images.unsplash.com/photo-1585521922882-ab143a1ffa61?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "rest_4",
    name: "Maharaja Bhog",
    type: "restaurant",
    category: "Restaurants",
    location: {
      type: "Point",
      coordinates: [73.8432, 18.5289]
    },
    latitude: 18.5289,
    longitude: 73.8432,
    address: "Camp, Pune",
    phone: "+91-20-2432-1234",
    website: "https://www.maharajabhog.com",
    rating: 4.5,
    review_count: 2034,
    tags: ["Indian", "Vegetarian", "Non-Vegetarian", "Family Dining"],
    hours: "11:00 AM - 10:30 PM",
    price_level: 3,
    images: [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },

  // FUEL STATIONS - Pune area
  {
    osm_id: "fuel_1",
    name: "Indian Oil Petrol Pump",
    type: "fuel",
    category: "Fuel Stations",
    location: {
      type: "Point",
      coordinates: [73.8823, 18.5234]
    },
    latitude: 18.5234,
    longitude: 73.8823,
    address: "Main Road, Near Hospital, Pune",
    phone: "+91-20-2658-4455",
    website: "https://www.iocl.com",
    rating: 4.2,
    review_count: 567,
    tags: ["Petrol", "Diesel", "ATM", "Bathroom", "Convenience Store"],
    hours: "24 Hours",
    price_level: 1,
    images: [
      "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "fuel_2",
    name: "Hindustan Petroleum CNG Station",
    type: "fuel",
    category: "Fuel Stations",
    location: {
      type: "Point",
      coordinates: [73.8654, 18.4956]
    },
    latitude: 18.4956,
    longitude: 73.8654,
    address: "Fort Road, Pune",
    phone: "+91-20-2341-2341",
    website: "https://www.hindustanpetroleum.com",
    rating: 4.1,
    review_count: 432,
    tags: ["CNG", "Petrol", "Diesel", "Car Wash"],
    hours: "6:00 AM - 10:00 PM",
    price_level: 1,
    images: [
      "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "fuel_3",
    name: "Bharat Petroleum Pump",
    type: "fuel",
    category: "Fuel Stations",
    location: {
      type: "Point",
      coordinates: [73.9087, 18.5401]
    },
    latitude: 18.5401,
    longitude: 73.9087,
    address: "Bypass Road, Pune",
    phone: "+91-20-2789-5555",
    website: "https://www.bharatpetroleum.com",
    rating: 4.0,
    review_count: 298,
    tags: ["Petrol", "Diesel", "EV Charging Point", "Bathroom"],
    hours: "24 Hours",
    price_level: 1,
    images: [
      "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "fuel_4",
    name: "Shell Fuel Station",
    type: "fuel",
    category: "Fuel Stations",
    location: {
      type: "Point",
      coordinates: [73.8234, 18.5156]
    },
    latitude: 18.5156,
    longitude: 73.8234,
    address: "Deccan Gymkhana, Pune",
    phone: "+91-20-2565-1234",
    website: "https://www.shell.com",
    rating: 4.3,
    review_count: 356,
    tags: ["Premium Petrol", "Diesel", "Premium Amenities"],
    hours: "24 Hours",
    price_level: 2,
    images: [
      "https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },

  // HOSPITALS - Pune area
  {
    osm_id: "hosp_1",
    name: "Sassoon General Hospital",
    type: "hospital",
    category: "Hospitals",
    location: {
      type: "Point",
      coordinates: [73.8456, 18.5287]
    },
    latitude: 18.5287,
    longitude: 73.8456,
    address: "Camp, Pune",
    phone: "+91-20-2612-2612",
    website: "https://www.sassoonhospital.org",
    rating: 4.1,
    review_count: 892,
    tags: ["Emergency", "24 Hours", "Ambulance", "Pharmacy", "ICU"],
    hours: "24 Hours",
    price_level: 1,
    images: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b2e?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hosp_2",
    name: "Ruby Hall Clinic",
    type: "hospital",
    category: "Hospitals",
    location: {
      type: "Point",
      coordinates: [73.8765, 18.5098]
    },
    latitude: 18.5098,
    longitude: 73.8765,
    address: "Koregaon Park, Pune",
    phone: "+91-20-4001-4001",
    website: "https://www.rubyhallclinic.com",
    rating: 4.6,
    review_count: 1234,
    tags: ["Premium", "Emergency", "24 Hours", "Specialist Doctors", "Modern Facilities"],
    hours: "24 Hours",
    price_level: 4,
    images: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b2e?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hosp_3",
    name: "City Care Hospital",
    type: "hospital",
    category: "Hospitals",
    location: {
      type: "Point",
      coordinates: [73.8342, 18.4934]
    },
    latitude: 18.4934,
    longitude: 73.8342,
    address: "Fort, Pune",
    phone: "+91-20-2312-5000",
    website: "https://www.citycarehosp.com",
    rating: 4.3,
    review_count: 756,
    tags: ["Emergency", "24 Hours", "Ambulance", "Pharmacy"],
    hours: "24 Hours",
    price_level: 2,
    images: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b2e?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  },
  {
    osm_id: "hosp_4",
    name: "Wanless Hospital",
    type: "hospital",
    category: "Hospitals",
    location: {
      type: "Point",
      coordinates: [73.9012, 18.5254]
    },
    latitude: 18.5254,
    longitude: 73.9012,
    address: "Shivajinagar, Pune",
    phone: "+91-20-2560-2560",
    website: "https://www.wanlesshospital.org",
    rating: 4.2,
    review_count: 645,
    tags: ["Emergency", "24 Hours", "Nursing Care", "Diagnostic Center"],
    hours: "24 Hours",
    price_level: 3,
    images: [
      "https://images.unsplash.com/photo-1516627145497-ae6968895b2e?w=500&auto=format&fit=crop&q=60"
    ],
    source: "manual",
    is_active: true
  }
];

module.exports = nearbyServicesData;
