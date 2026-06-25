const mongoose = require("mongoose");

const { buildSchemaOptions } = require("../utils/mongoose");

const heritageAIContextSchema = new mongoose.Schema(
  {
    place_id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    short_summary: {
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
    cultural_significance: {
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
    photography_tips: {
      type: [String],
      default: []
    },
    best_time_to_visit: {
      type: String,
      default: ""
    },
    trek_difficulty: {
      type: String,
      default: ""
    },
    family_friendly: {
      type: String,
      default: ""
    },
    budget_trip: {
      type: String,
      default: ""
    },
    one_day_itinerary: {
      type: String,
      default: ""
    },
    faqs: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  buildSchemaOptions()
);

heritageAIContextSchema.index({ place_id: 1 });

module.exports = mongoose.model("HeritageAIContext", heritageAIContextSchema, "HeritageAIContext");
