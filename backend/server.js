require("dotenv").config();

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./src/config/db");
const { initSocket } = require("./src/config/socket");
const { notFound, errorHandler } = require("./src/middleware/error.middleware");
const { logGeminiStartupStatus } = require("./src/services/aiContent.service");
const { startRecurringJobs } = require("./src/services/jobQueue.service");

const authRoutes = require("./src/routes/auth.routes");
const placeRoutes = require("./src/routes/place.routes");
const chatRoutes = require("./src/routes/chat.routes");
const tripRoutes = require("./src/routes/trip.routes");
const adminRoutes = require("./src/routes/admin.routes");
const feedbackRoutes = require("./src/routes/feedback.routes");
const aiGuideRoutes = require("./src/routes/aiGuide.routes");
const alertRoutes = require("./src/routes/alert.routes");
const heritageRoutes = require("./src/routes/heritage.routes");
const nearbyServiceRoutes = require("./src/routes/nearbyService.routes");

const app = express();
const server = http.createServer(app);

initSocket(server);

const allowedOrigins = (process.env.FRONTEND_URL || process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  "/uploads",
  express.static(path.join(__dirname, process.env.UPLOAD_DIR || "src/uploads"))
);
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "tourvision-backend",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", placeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trip", tripRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/heritage-places", heritageRoutes);
app.use("/api/nearby-services", nearbyServiceRoutes);
app.use("/api", aiGuideRoutes);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

async function bootstrap() {
  logGeminiStartupStatus();
  await connectDB();
  startRecurringJobs();

  server.listen(port, () => {
    console.log(`TourVision backend listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start TourVision backend:", error);
  process.exit(1);
});
