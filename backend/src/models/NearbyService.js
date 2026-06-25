const mongoose = require("mongoose");

const { buildSchemaOptions } = require("../utils/mongoose");

const nearbyServiceSchema = new mongoose.Schema(
  {
    // Identifiers
    osm_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      index: true
    },

    // Classification
    type: {
      type: String,
      enum: ["hotel", "restaurant", "fuel", "hospital"],
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      // Examples: "Hotels", "Restaurants", "Fuel Stations", "Hospitals"
      index: true
    },

    // Location - GeoJSON Point for geospatial queries
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: "Invalid GeoJSON coordinates [longitude, latitude]"
        }
      }
    },

    // Convenience fields (denormalized from location)
    latitude: Number,
    longitude: Number,

    // Address & Contact
    address: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      default: ""
    },
    website: {
      type: String,
      default: ""
    },
    email: {
      type: String,
      default: ""
    },

    // Rating & Reviews
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null
    },
    review_count: {
      type: Number,
      default: 0
    },

    // Service-specific tags
    tags: {
      type: [String],
      default: [],
      // Examples: ["Vegetarian", "Petrol", "Emergency", "WiFi", "Parking"]
      index: true
    },

    // Operating hours (simplified)
    hours: {
      type: String,
      default: "9:00 AM - 9:00 PM"
    },

    // Pricing info
    price_level: {
      type: Number,
      enum: [1, 2, 3, 4, 5], // 1 = budget, 5 = luxury
      default: null
    },

    // Images
    images: {
      type: [String],
      default: []
    },

    // Related heritage place (optional)
    related_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      default: null,
      index: true
    },

    // Source of data
    source: {
      type: String,
      enum: ["openstreetmap", "manual", "import"],
      default: "openstreetmap",
      index: true
    },

    // Active status
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },

    // Metadata
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    last_verified_at: {
      type: Date,
      default: null
    }
  },
  buildSchemaOptions()
);

// Create 2dsphere index for geospatial queries
nearbyServiceSchema.index({ location: "2dsphere" });

// Compound indexes for common queries
nearbyServiceSchema.index({ type: 1, is_active: 1 });
nearbyServiceSchema.index({ category: 1, is_active: 1 });
nearbyServiceSchema.index({ rating: -1, is_active: 1 });

// Text index for search
nearbyServiceSchema.index({
  name: "text",
  address: "text",
  tags: "text"
});

// Pre-save hook: update denormalized fields
nearbyServiceSchema.pre("save", function (next) {
  if (this.location && this.location.coordinates) {
    [this.longitude, this.latitude] = this.location.coordinates;
  }
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model("NearbyService", nearbyServiceSchema);
