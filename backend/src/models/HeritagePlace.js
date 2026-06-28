const mongoose = require("mongoose");

const { buildSchemaOptions } = require("../utils/mongoose");

const aiContentSchema = new mongoose.Schema(
  {
    overview: {
      type: String,
      default: ""
    },
    history: {
      type: String,
      default: ""
    },
    architecture: {
      type: String,
      default: ""
    },
    hidden_facts: {
      type: [String],
      default: []
    },
    travel_tips: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "approved"
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    review_note: {
      type: String,
      default: ""
    },
    approved_at: {
      type: Date,
      default: null
    },
    updated_at: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const heritagePlaceSchema = new mongoose.Schema(
  {
    place_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    qr_id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      default: ""
    },
    slug: {
      type: String,
      trim: true
    },
    description_en: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    description_mr: {
      type: String,
      default: ""
    },
    audio_en: {
      type: String,
      default: ""
    },
    audio_mr: {
      type: String,
      default: ""
    },
    historical_importance_en: {
      type: String,
      default: ""
    },
    historical_importance_mr: {
      type: String,
      default: ""
    },
    built_year: {
      type: String,
      default: ""
    },
    builder: {
      type: String,
      default: ""
    },
    dynasty: {
      type: String,
      default: ""
    },
    timings: {
      type: String,
      default: ""
    },
    facts_en: {
      type: [String],
      default: []
    },
    facts_mr: {
      type: [String],
      default: []
    },
    category: {
      type: String,
      enum: ["Historical Palace/Fortification", "Hill Fort", "Temple", "Monument", "Archaeological Site", "Museum", "Garden"],
      default: "Historical Palace/Fortification"
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    state: {
      type: String,
      default: "Maharashtra"
    },
    images: {
      type: [String],
      default: []
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5
    },
    review_count: {
      type: Number,
      default: 0
    },
    history: {
      type: String,
      default: ""
    },
    architecture: {
      type: String,
      default: ""
    },
    best_time_to_visit: {
      type: String,
      default: ""
    },
    estimated_visit_duration: {
      type: String,
      default: ""
    },
    entry_fee: {
      type: Number,
      default: 0
    },
    hours: {
      type: String,
      default: ""
    },
    contact: {
      type: String,
      default: ""
    },
    website: {
      type: String,
      default: ""
    },
    has_ai_content: {
      type: Boolean,
      default: false
    },
    ai_content: {
      type: aiContentSchema,
      default: () => ({})
    },
    qr_stats: {
      total_scans: {
        type: Number,
        default: 0
      },
      last_scan_at: {
        type: Date,
        default: null
      }
    },
    geofence_polygon: {
      type: {
        type: String,
        enum: ["Polygon"],
        default: "Polygon"
      },
      coordinates: {
        type: [[[Number]]],
        default: []
      }
    },
    geofence_radius_meters: {
      type: Number,
      default: 200,
      min: 25
    },
    geofence_visits: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
          },
          session_id: {
            type: String,
            default: ""
          },
          status: {
            type: String,
            enum: ["outside", "near", "inside"],
            default: "outside"
          },
          event: {
            type: String,
            enum: ["enter", "near", "exit", "check_in"],
            default: "near"
          },
          distance_meters: {
            type: Number,
            default: null
          },
          radius_meters: {
            type: Number,
            default: 200
          },
          accuracy_meters: {
            type: Number,
            default: null
          },
          coordinates: {
            lat: Number,
            lng: Number
          },
          checked_at: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },
    visit_stats: {
      total_checkins: {
        type: Number,
        default: 0
      },
      total_entries: {
        type: Number,
        default: 0
      },
      total_exits: {
        type: Number,
        default: 0
      },
      last_checkin_at: {
        type: Date,
        default: null
      }
    },
    is_popular: {
      type: Boolean,
      default: true
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  // The existing TourVision heritage data is stored in `heritageplace`.
  // Set the collection explicitly because Mongoose would otherwise pluralize
  // the model name to `heritageplaces`, which is a different collection.
  buildSchemaOptions({ collection: "heritageplace" })
);

// Index for location-based queries
heritagePlaceSchema.index({ location: "2dsphere" });
heritagePlaceSchema.index({ district: 1, state: 1 });
heritagePlaceSchema.index({ place_id: 1 });
heritagePlaceSchema.index({ qr_id: 1 });
heritagePlaceSchema.index({ category: 1 });

module.exports = mongoose.model("HeritagePlace", heritagePlaceSchema);
