#!/usr/bin/env node

/**
 * Seed nearby services into MongoDB
 * Usage: node backend/seeds/insert-nearby-services.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const NearbyService = require("../src/models/NearbyService");
const nearbyServicesData = require("./nearby-services");

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}▶ ${title}${colors.reset}`);
}

function logSuccess(message) {
  log("green", "✓", message);
}

function logError(message) {
  log("red", "✗", message);
}

function logInfo(message) {
  log("blue", "ℹ", message);
}

function logWarning(message) {
  log("yellow", "⚠", message);
}

async function main() {
  try {
    logSection("Nearby Services Database Seeding");

    // Connect to MongoDB
    logInfo("Connecting to MongoDB...");
    const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/tourvision";
    await mongoose.connect(mongoUrl);
    logSuccess("Connected to MongoDB");

    // Clear existing services (optional - comment out to preserve data)
    logInfo("Clearing existing nearby services...");
    await NearbyService.deleteMany({});
    logSuccess("Cleared existing data");

    // Insert new services
    logInfo(`Total records to insert: ${nearbyServicesData.length}`);
    logSection("Starting insertion process");

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const serviceData of nearbyServicesData) {
      try {
        // Check if service already exists
        const existing = await NearbyService.findOne({ osm_id: serviceData.osm_id });

        if (existing) {
          logWarning(`Skipped: "${serviceData.name}" (already exists)`);
          skipped++;
          continue;
        }

        // Insert the service
        const service = new NearbyService(serviceData);
        await service.save();
        logSuccess(`Inserted: "${serviceData.name}" (ID: ${serviceData.osm_id})`);
        inserted++;
      } catch (error) {
        logError(`Failed to insert "${serviceData.name}": ${error.message}`);
        errors++;
      }
    }

    // Get database statistics
    logSection("Seeding Summary");
    const totalInDb = await NearbyService.countDocuments();
    const byType = await NearbyService.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    logSuccess(`Inserted: ${inserted} records`);
    if (skipped > 0) {
      logWarning(`Skipped: ${skipped} records (duplicates)`);
    }
    if (errors > 0) {
      logError(`Errors: ${errors} records`);
    }

    logSection("Database Statistics");
    logInfo(`Total services in database: ${totalInDb}`);

    if (byType.length > 0) {
      logInfo("Services by type:");
      byType.forEach((item) => {
        const typeEmoji = {
          hotel: "🏨",
          restaurant: "🍽️",
          fuel: "⛽",
          hospital: "🏥"
        };
        console.log(
          `  ${typeEmoji[item._id] || "📍"} ${item._id}: ${colors.bright}${item.count}${colors.reset}`
        );
      });
    }

    // Verify sample records
    logSection("Sample Records");
    const sample = await NearbyService.find().limit(3).lean();
    sample.forEach((service, index) => {
      logInfo(`${index + 1}. ${service.name} (${service.type}) - Rating: ${service.rating}`);
    });

    logSection("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logError(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
