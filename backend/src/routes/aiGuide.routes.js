const express = require("express");
require("dotenv").config();

const asyncHandler = require("../utils/asyncHandler");
const { getGeminiApiKey, getGeminiModel, toGeminiPublicError } = require("../services/aiContent.service");

const router = express.Router();
const MODEL_NAME = process.env.GEMINI_MODEL || "models/gemini-flash-latest";

console.log("KEY:", process.env.GEMINI_API_KEY ? "FOUND" : "MISSING");
console.log("MODEL:", MODEL_NAME);

async function listGeminiModels() {
  const apiKey = getGeminiApiKey();

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const models = await response.json();

  if (!response.ok) {
    throw new Error(models?.error?.message || "Unable to list Gemini models.");
  }

  return models;
}

router.get("/list-models", async (req, res) => {
  try {
    const models = await listGeminiModels();
    console.log("Gemini Models:", JSON.stringify(models, null, 2));
    return res.json(models);
  } catch (err) {
    const publicError = err.publicMessage
      ? { statusCode: err.statusCode || 503, message: err.publicMessage }
      : toGeminiPublicError(err);
    console.error("Gemini model list failed:", publicError.message);
    return res.status(publicError.statusCode).json({ error: "failed", message: publicError.message });
  }
});

router.get("/test-gemini", async (req, res) => {
  try {
    const model = getGeminiModel();
    const prompt = "Say hello";
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return res.json({ text });
  } catch (err) {
    const publicError = err.publicMessage
      ? { statusCode: err.statusCode || 503, message: err.publicMessage }
      : toGeminiPublicError(err);
    console.error("Gemini test failed:", publicError.message);
    return res.status(publicError.statusCode).json({ error: "failed", message: publicError.message });
  }
});

router.post(
  "/ai-guide",
  asyncHandler(async (req, res) => {
    const { place_name: placeName, message } = req.body || {};

    if (!placeName || !message) {
      return res.status(400).json({ message: "place_name and message are required." });
    }

    const model = getGeminiModel();

    const prompt = `You are a smart travel guide.

Place: ${placeName}
User query: ${message}

Give helpful, short, engaging response.`;

    let text = "";

    try {
      const result = await model.generateContent(prompt);
      text = result.response.text().trim();
    } catch (err) {
      const publicError = err.publicMessage
        ? { statusCode: err.statusCode || 503, message: err.publicMessage }
        : toGeminiPublicError(err);
      console.error("Gemini guide failed:", publicError.message);
      return res.status(publicError.statusCode).json({ message: publicError.message });
    }

    if (!text) {
      return res.status(502).json({ message: "Gemini did not return a response." });
    }

    return res.json({
      text
    });
  })
);

module.exports = router;
