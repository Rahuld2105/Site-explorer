const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function isDeprecatedGeminiModel(modelName) {
  const normalized = modelName.replace(/^models\//, "");
  return normalized.endsWith("-flash-latest") || /^gemini(?:-\d+(?:\.\d+)?)?-pro$/.test(normalized);
}

function getGeminiModelName() {
  const configuredModel = (process.env.GEMINI_MODEL || "").trim();

  if (!configuredModel || isDeprecatedGeminiModel(configuredModel)) {
    return DEFAULT_GEMINI_MODEL;
  }

  return configuredModel;
}

function hasGeminiApiKey() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  return Boolean(apiKey && apiKey !== "your_api_key_here" && apiKey !== "your_new_gemini_api_key_here");
}

function logGeminiStartupStatus() {
  console.log(`Gemini API Key: ${hasGeminiApiKey() ? "FOUND" : "MISSING"}`);
  console.log(`Using model: ${getGeminiModelName()}`);
}

function getGeminiApiKey() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!hasGeminiApiKey()) {
    const error = new Error("Gemini API key is not configured.");
    error.statusCode = 503;
    error.publicMessage = "Gemini API key is not configured.";
    throw error;
  }

  return apiKey;
}

function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());

  return genAI.getGenerativeModel({
    model: getGeminiModelName()
  });
}

function getGeminiErrorDetails(error) {
  return {
    status: error?.status || error?.statusCode || error?.response?.status || null,
    statusText: error?.statusText || error?.response?.statusText || null,
    message: error?.message || null,
    details: error?.errorDetails || error?.response?.data?.error || error?.details || null,
    stack: error?.stack || null
  };
}

function logGeminiError(label, error) {
  console.error(label, getGeminiErrorDetails(error));
}

function toGeminiPublicError(error) {
  const details = [
    error?.message,
    error?.statusText,
    ...(Array.isArray(error?.errorDetails) ? error.errorDetails.map((detail) => JSON.stringify(detail)) : [])
  ]
    .filter(Boolean)
    .join(" ");

  if (/CONSUMER_SUSPENDED|has been suspended/i.test(details)) {
    return {
      statusCode: 503,
      message: "Gemini API access is suspended for the configured key. Replace it with a new active key."
    };
  }

  if (/API key not valid|permission denied|forbidden|PERMISSION_DENIED/i.test(details)) {
    return {
      statusCode: 503,
      message: "Gemini API key is invalid or does not have access."
    };
  }

  return {
    statusCode: 502,
    message: "Gemini service is temporarily unavailable."
  };
}

function getMlClient() {
  return axios.create({
    baseURL: process.env.ML_SERVICE_URL,
    timeout: Number(process.env.ML_SERVICE_TIMEOUT_MS || 12000)
  });
}

async function postToMl(path, payload) {
  if (!process.env.ML_SERVICE_URL) {
    return null;
  }

  const response = await getMlClient().post(path, payload);
  return response.data?.data || response.data;
}

async function generateChatReply({ place, placeId, zone, message, history = [] }) {
  const placeName = place?.name || placeId || "the current place";
  console.log("PLACE:", placeName);
  console.log("MESSAGE:", message);

  const model = getGeminiModel();
  console.log("Using model:", getGeminiModelName());
  const prompt = `
You are a travel guide.

Place: ${placeName}
User: ${message}
 
Give short helpful answer.
`;

  try {
    const result = await model.generateContent(prompt);
    const replyText = result.response.text().trim();

    if (!replyText) {
      throw new Error("Gemini did not return a response.");
    }

    return {
      reply: replyText,
      caption: replyText,
      text: replyText,
      source: "gemini"
    };
  } catch (err) {
    const publicError = toGeminiPublicError(err);
    const error = new Error(publicError.message);
    error.statusCode = publicError.statusCode;
    error.publicMessage = publicError.message;
    logGeminiError("Gemini chat failed:", err);
    throw error;
  }
}

async function generatePlaceContent(place) {
  if (process.env.ML_SERVICE_URL) {
    try {
      const response = await postToMl("/places/generate", {
        place
      });

      return {
        ...response,
        source: "ml-service"
      };
    } catch (error) {
      console.warn("ML service place generation failed, using Gemini:", error.message);
    }
  }

  const model = getGeminiModel();
  console.log("Using model:", getGeminiModelName());
  const prompt = `You are a smart travel guide.

Create concise travel content for this place.
Place name: ${place.name}
City or location: ${place.city || place.location_name || ""}
Existing description: ${place.description || ""}

Return only JSON with this shape:
{
  "description": "short engaging description",
  "summary": "one short guide summary",
  "facts": ["fact one", "fact two", "fact three"]
}`;

  let generated;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    const jsonText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    generated = JSON.parse(jsonText);
  } catch (err) {
    const publicError = toGeminiPublicError(err);
    const error = new Error(publicError.message);
    error.statusCode = publicError.statusCode;
    error.publicMessage = publicError.message;
    logGeminiError("Gemini place content failed:", err);
    throw error;
  }

  return {
    description: generated.description || "",
    summary: generated.summary || "",
    facts: Array.isArray(generated.facts) ? generated.facts : [],
    images: place.images || [],
    ar_model_url: place.ar_model_url || "",
    source: "gemini"
  };
}

async function estimateTripCost(payload) {
  if (!process.env.ML_SERVICE_URL) {
    return {
      total: 0,
      breakdown: {}
    };
  }

  try {
    const response = await postToMl("/cost/estimate", payload);

    return {
      total: Number(response?.total || response?.estimated_total || 0),
      breakdown: response?.breakdown || response || {}
    };
  } catch (error) {
    console.warn("ML trip cost call failed:", error.message);
    return {
      total: 0,
      breakdown: {}
    };
  }
}

async function recommendHotels(payload) {
  return postToMl("/recommend/hotels", payload);
}

async function recognizeLandmark(payload) {
  return postToMl("/recognize", payload);
}

async function syncChatSessionToVectorDb(session) {
  if (!process.env.VECTOR_DB_URL) {
    return {
      synced: false,
      reason: "VECTOR_DB_URL not configured"
    };
  }

  try {
    const response = await axios.post(
      `${process.env.VECTOR_DB_URL.replace(/\/$/, "")}/sessions/upsert`,
      {
        session_id: String(session._id),
        place_id: session.place ? String(session.place) : null,
        user_id: session.user ? String(session.user) : null,
        zone: session.zone,
        messages: session.messages
      },
      {
        timeout: 8000
      }
    );

    return {
      synced: true,
      vector_document_id: response.data?.id || response.data?.document_id || null
    };
  } catch (error) {
    console.warn("Vector DB sync failed:", error.message);
    return {
      synced: false,
      reason: error.message
    };
  }
}

module.exports = {
  getGeminiModelName,
  hasGeminiApiKey,
  getGeminiApiKey,
  getGeminiModel,
  logGeminiStartupStatus,
  logGeminiError,
  toGeminiPublicError,
  generateChatReply,
  generatePlaceContent,
  estimateTripCost,
  recognizeLandmark,
  recommendHotels,
  syncChatSessionToVectorDb
};
