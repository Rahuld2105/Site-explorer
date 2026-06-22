const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const { getMe, getProfileDashboard, login, logout, signup } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(getMe));
router.get("/profile/dashboard", protect, asyncHandler(getProfileDashboard));
router.post("/logout", protect, asyncHandler(logout));

module.exports = router;
