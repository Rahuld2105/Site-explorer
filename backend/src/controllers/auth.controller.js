const jwt = require("jsonwebtoken");

const Expense = require("../models/Expense");
const Trip = require("../models/Trip");
const User = require("../models/User");
const { failure, success } = require("../utils/response");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return failure(res, 400, "Name, email, and password are required.");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    return failure(res, 409, "An account with this email already exists.");
  }

  const user = await User.create({
    name,
    email,
    password
  });

  return success(
    res,
    {
      token: signToken(user),
      user: user.toJSON()
    },
    201
  );
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return failure(res, 400, "Email and password are required.");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return failure(res, 401, "Invalid email or password.");
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    return failure(res, 401, "Invalid email or password.");
  }

  if (!user.active) {
    return failure(res, 403, "This account has been deactivated.");
  }

  return success(res, {
    token: signToken(user),
    user: user.toJSON()
  });
}

async function getMe(req, res) {
  return success(res, {
    user: req.account ? req.account.toJSON() : req.user
  });
}

async function getProfileDashboard(req, res) {
  const userId = req.user?._id;
  const [trips, expenses] = await Promise.all([
    Trip.find({ user: userId }).sort({ createdAt: -1 }),
    Expense.find({ user: userId }).sort({ createdAt: -1 })
  ]);

  const completedTrips = trips.filter((trip) => trip.status === "completed");
  const uploadedMedia = trips.flatMap((trip) =>
    (trip.stories || []).map((story) => ({
      ...(story.toObject?.() || story),
      trip_id: trip._id.toString(),
      trip_name: trip.destinations?.map((item) => item.name).join(" -> ") || "Trip"
    }))
  );

  return success(res, {
    dashboard: {
      places_visited: completedTrips.flatMap((trip) => trip.destinations || []).map((item) => item.name),
      trips_completed: completedTrips.length,
      expenses_total: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      uploaded_memories: uploadedMedia.length,
      saved_trips: req.account?.saved_trips || [],
      trip_history: trips.map((trip) => ({
        id: trip._id,
        name: trip.destinations?.map((item) => item.name).join(" -> ") || "Trip",
        status: trip.status,
        completed_at: trip.status === "completed" ? trip.updatedAt : null
      })),
      uploaded_media: uploadedMedia
    }
  });
}

async function logout(req, res) {
  return success(res, {
    message: "Logged out successfully."
  });
}

module.exports = {
  getMe,
  getProfileDashboard,
  login,
  logout,
  signup
};
