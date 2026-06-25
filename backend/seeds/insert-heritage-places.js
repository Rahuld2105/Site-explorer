#!/usr/bin/env node

/**
 * Heritage Places - Seed Data Insertion Script
 * 
 * This script inserts heritage place data into the MongoDB database.
 * 
 * Usage:
 * node backend/seeds/insert-heritage-places.js
 * 
 * Environment Variables:
 * - MONGODB_URI: MongoDB connection string
 * - NODE_ENV: Development/Production environment
 */

require("dotenv").config();
const mongoose = require("mongoose");
const heritagePlacesSeedData = require("./heritage-places");
const HeritagePlace = require("../src/models/HeritagePlace");

// Color output for console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}▶ ${msg}${colors.reset}\n`)
};

async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    log.info("Connecting to MongoDB...");
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    log.success("Connected to MongoDB");
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
}

async function insertHeritagePlace(placeData) {
  try {
    // Check if place already exists
    const existingPlace = await HeritagePlace.findOne({ place_id: placeData.place_id });
    
    if (existingPlace) {
      log.warning(`Skipping "${placeData.name}" - Already exists (place_id: ${placeData.place_id})`);
      return { status: "skipped", name: placeData.name };
    }

    const newPlace = new HeritagePlace(placeData);
    await newPlace.save();
    
    log.success(`Inserted: "${placeData.name}" (ID: ${placeData.place_id})`);
    return { status: "inserted", name: placeData.name };
  } catch (error) {
    log.error(`Failed to insert "${placeData.name}": ${error.message}`);
    return { status: "error", name: placeData.name, error: error.message };
  }
}

async function seedHeritageDatabase() {
  log.section("Heritage Places Database Seeding");

  // Connect to database
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    // Summary
    log.info(`Total records to insert: ${heritagePlacesSeedData.length}`);
    log.section("Starting insertion process");

    const results = {
      inserted: [],
      skipped: [],
      errors: []
    };

    // Insert each heritage place
    for (const placeData of heritagePlacesSeedData) {
      const result = await insertHeritagePlace(placeData);
      
      if (result.status === "inserted") {
        results.inserted.push(result.name);
      } else if (result.status === "skipped") {
        results.skipped.push(result.name);
      } else if (result.status === "error") {
        results.errors.push({ name: result.name, error: result.error });
      }
    }

    // Print summary
    log.section("Seeding Summary");
    
    if (results.inserted.length > 0) {
      log.success(`Inserted: ${results.inserted.length} records`);
      results.inserted.forEach(name => console.log(`  • ${name}`));
    }

    if (results.skipped.length > 0) {
      log.warning(`Skipped: ${results.skipped.length} records (already exist)`);
      results.skipped.forEach(name => console.log(`  • ${name}`));
    }

    if (results.errors.length > 0) {
      log.error(`Errors: ${results.errors.length} records`);
      results.errors.forEach(err => console.log(`  • ${err.name}: ${err.error}`));
    }

    log.section("Verifying inserted records");
    
    const totalRecords = await HeritagePlace.countDocuments();
    log.info(`Total heritage places in database: ${totalRecords}`);

    const recordsByCategory = await HeritagePlace.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    log.info("Records by category:");
    recordsByCategory.forEach(cat => {
      console.log(`  • ${cat._id}: ${cat.count}`);
    });

    log.section("Seeding completed successfully!");
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info("Database connection closed");
  }
}

// Run the seeding
seedHeritageDatabase();
