const path = require("path");

const Expense = require("../models/Expense");
const Place = require("../models/Place");
const Trip = require("../models/Trip");
const asyncHandler = require("../utils/asyncHandler");
const dijkstra = require("../utils/dijkstra");
const { haversineDistanceKm } = require("../utils/scoring");
const { estimateTripCost } = require("../services/aiContent.service");
const { failure, success } = require("../utils/response");

const CITY_COORDINATES = {
  delhi: { lat: 28.6139, lng: 77.209 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  goa: { lat: 15.2993, lng: 74.124 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  udaipur: { lat: 24.5854, lng: 73.7125 }
};

function toDestinationObject(input, matchedPlace) {
  if (typeof input === "object" && input !== null && input.name) {
    return {
      place: matchedPlace?._id || input.place || null,
      name: input.name,
      coordinates:
        matchedPlace?.location?.coordinates?.length === 2
          ? {
              lat: matchedPlace.location.coordinates[1],
              lng: matchedPlace.location.coordinates[0]
            }
          : input.coordinates || CITY_COORDINATES[input.name.toLowerCase()] || null
    };
  }

  const name = String(input);
  const fallbackCoordinates = CITY_COORDINATES[name.toLowerCase()] || null;

  return {
    place: matchedPlace?._id || null,
    name,
    coordinates:
      matchedPlace?.location?.coordinates?.length === 2
        ? {
            lat: matchedPlace.location.coordinates[1],
            lng: matchedPlace.location.coordinates[0]
          }
        : fallbackCoordinates
  };
}

function buildGraph(destinations) {
  const graph = {};

  for (const origin of destinations) {
    graph[origin.name] = [];

    for (const destination of destinations) {
      if (origin.name === destination.name) {
        continue;
      }

      const weight = haversineDistanceKm(origin.coordinates, destination.coordinates) || 1;
      graph[origin.name].push({
        node: destination.name,
        weight
      });
    }
  }

  return graph;
}

function estimateBudget({ transport, members, duration, destinations }) {
  const rates = {
    car: 1400,
    train: 1200,
    bike: 900,
    bus: 1000
  };

  const transportCost = (rates[transport] || 1100) * Math.max(duration, 1);
  const experiences = destinations.length * 600 * Math.max(members, 1);
  const food = 450 * Math.max(members, 1) * Math.max(duration, 1);
  const total = transportCost + experiences + food;

  return {
    transport: transportCost,
    experiences,
    food,
    total
  };
}

function parseMembers(input) {
  if (typeof input === "number") {
    return input;
  }

  if (typeof input === "object" && input !== null) {
    return Object.values(input).reduce((sum, value) => sum + Number(value || 0), 0);
  }

  return Number(input || 1);
}

function buildAlerts({ transport, duration, destinations }) {
  const alerts = [];

  if (transport === "train") {
    alerts.push("Verify train timings before departure.");
  }

  if (duration < destinations.length) {
    alerts.push("You may want to extend the trip for a more relaxed pace.");
  }

  if (destinations.length > 3) {
    alerts.push("This itinerary has several stops; start early to avoid fatigue.");
  }

  return alerts;
}

const planTrip = asyncHandler(async (req, res) => {
  const destinationsInput = req.body.destinations || [];
  const duration = Number(req.body.duration || destinationsInput.length || 1);
  const transport = req.body.transport || req.body.transportMode || "car";
  const members = parseMembers(req.body.members || req.body.groupMembers || 1);
  const datePreference = req.body.datePreference || req.body.date_preference || "";

  if (!Array.isArray(destinationsInput) || destinationsInput.length === 0) {
    return failure(res, 400, "At least one destination is required.");
  }

  const names = destinationsInput.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean);
  const matchedPlaces = await Place.find({ name: { $in: names } });
  const matchMap = new Map(matchedPlaces.map((place) => [place.name, place]));
  const destinations = destinationsInput.map((item) => {
    const name = typeof item === "string" ? item : item.name;
    return toDestinationObject(item, matchMap.get(name));
  });

  const graph = buildGraph(destinations);
  const shortest =
    destinations.length > 1
      ? dijkstra(graph, destinations[0].name, destinations[destinations.length - 1].name)
      : { path: [destinations[0].name], distance: 0 };

  const orderedStops =
    shortest.path.length === destinations.length
      ? shortest.path.map((name) => destinations.find((item) => item.name === name))
      : destinations;

  const coordinates = orderedStops
    .map((stop) => stop.coordinates)
    .filter(Boolean)
    .map((coordinate) => [coordinate.lat, coordinate.lng]);

  const totalDistanceKm = orderedStops.reduce((sum, stop, index) => {
    if (index === 0) {
      return sum;
    }

    return sum + (haversineDistanceKm(orderedStops[index - 1].coordinates, stop.coordinates) || 0);
  }, 0);

  const budget = estimateBudget({
    transport,
    members,
    duration,
    destinations: orderedStops
  });
  const mlCostEstimate = await estimateTripCost({
    destinations: orderedStops.map((item) => item.name),
    duration,
    transport,
    members
  });
  const alerts = buildAlerts({ transport, duration, destinations: orderedStops });

  const trip = await Trip.create({
    user: req.user?._id || null,
    destinations,
    duration,
    transport,
    members,
    date_preference: datePreference,
    route: {
      stops: orderedStops,
      coordinates,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalDurationHours: Number((totalDistanceKm / 42).toFixed(1))
    },
    budget
  });

  return success(
    res,
    {
      trip: trip.toJSON(),
      route: trip.route,
      cost_estimate: mlCostEstimate.total || budget.total,
      alerts
    },
    201
  );
});

const getTrips = asyncHandler(async (req, res) => {
  const query = req.user ? { user: req.user._id } : {};
  const trips = await Trip.find(query).sort({ createdAt: -1 });

  return success(res, {
    trips: trips.map((trip) => trip.toJSON()),
    total: trips.length
  });
});

const getTripById = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return failure(res, 404, "Trip not found.");
  }

  return success(res, {
    trip: trip.toJSON()
  });
});

const getTripExpenses = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return failure(res, 404, "Trip not found.");
  }

  const expenses = await Expense.find({ trip: trip._id }).sort({ createdAt: -1 });

  return success(res, {
    expenses: expenses.map((expense) => expense.toJSON()),
    total: expenses.length
  });
});

const uploadTravelStory = asyncHandler(async (req, res) => {
  const uploadedFiles = req.files?.story || req.files?.stories || req.files?.files || [];

  if (!uploadedFiles.length) {
    return failure(res, 400, "At least one story file is required.");
  }

  const tripId = req.body.tripId || req.body.trip_id;
  let trip = null;

  if (tripId) {
    trip = await Trip.findById(tripId);
  }

  const stories = uploadedFiles.map((file) => ({
    file_url: `${req.protocol}://${req.get("host")}/uploads/${path.basename(file.path)}`,
    original_name: file.originalname,
    mime_type: file.mimetype
  }));

  if (trip) {
    trip.stories.push(...stories);
    await trip.save();
  }

  if (req.account) {
    req.account.uploaded_media.push(
      ...stories.map((story) => ({
        trip: trip?._id || null,
        trip_id: tripId || "",
        media_url: story.file_url,
        mime_type: story.mime_type,
        original_name: story.original_name
      }))
    );
    await req.account.save();
  }

  return success(
    res,
    {
      stories,
      trip: trip ? trip.toJSON() : null
    },
    201
  );
});

const addTripExpense = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return failure(res, 404, "Trip not found.");
  }

  const participants = req.body.participants || req.body.members || ["You"];
  const amount = Number(req.body.amount || 0);
  const perPerson = participants.length ? Number((amount / participants.length).toFixed(2)) : amount;

  const expense = await Expense.create({
    trip: trip._id,
    user: req.user?._id || null,
    title: req.body.title || "Expense",
    category: req.body.category || "transport",
    payer: req.body.payer || "You",
    amount,
    participants,
    split: {
      per_person: perPerson,
      breakdown: participants.map((person) => ({
        person,
        amount: perPerson
      }))
    },
    notes: req.body.notes || ""
  });

  return success(
    res,
    {
      expense: expense.toJSON()
    },
    201
  );
});

const getTripExpenseSplit = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return failure(res, 404, "Trip not found.");
  }

  const expenses = await Expense.find({ trip: trip._id }).sort({ createdAt: -1 });
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const people = new Set(expenses.flatMap((expense) => expense.participants || []));
  const perPerson = people.size ? Number((total / people.size).toFixed(2)) : total;

  return success(res, {
    expenses: expenses.map((expense) => expense.toJSON()),
    split: {
      total,
      people: Array.from(people),
      per_person: perPerson
    }
  });
});

module.exports = {
  addTripExpense,
  getTripById,
  getTripExpenses,
  getTripExpenseSplit,
  getTrips,
  planTrip,
  uploadTravelStory
};
