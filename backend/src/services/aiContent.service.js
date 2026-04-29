const axios = require("axios");

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
  if (process.env.ML_SERVICE_URL) {
    try {
      const response = await postToMl("/chat", {
        message,
        place_id: placeId || place?.place_id || null,
        context: {
          zone,
          history,
          place
        }
      });

      return {
        caption: response?.caption || response?.reply || response?.message || "",
        reply: response?.reply || response?.message || response?.caption || "",
        tts_audio_url: response?.tts_audio_url || "",
        source: "ml-service"
      };
    } catch (error) {
      console.warn("ML service chat call failed, using local fallback:", error.message);
    }
  }

  const placeName = place?.name || "this destination";
  const placeSummary =
    place?.ai_content?.summary ||
    place?.description ||
    "It is a popular stop with cultural and visual highlights.";

  const normalizedMessage = message.trim().toLowerCase();
  const isGreeting = /^(hi|hello|hey|hii|hiya|good morning|good afternoon|good evening)[!']*$/i.test(message);
  const isRouteQuestion = /route|walk|walking|path|way|direction|how do I get|where to go/.test(normalizedMessage);
  const isHistoryQuestion = /history|story|culture|heritage|background|tell me about/.test(normalizedMessage);

  let replyText;
  if (isGreeting) {
    replyText = `Hello! ${placeName} is a popular stop with cultural and visual highlights. You're currently in the ${zone || "general"} zone. Ask me for nearby tips, routes, or stories and I’ll help you find the best viewpoint, walking route, or local landmark.`;
  } else if (isRouteQuestion) {
    replyText = `For ${placeName}, the easiest route from your current position is to head toward the nearest signature viewpoint first, then follow the pedestrian path past the cultural square and finish at the historic market. I can give you the exact walking route if you want.`;
  } else if (isHistoryQuestion) {
    replyText = `This place has a rich story: ${placeSummary} I can share the key historical highlights and why the viewpoint is important to local culture.`;
  } else {
    const conversationHint =
      history.length > 1
        ? "I also remember the recent context from this conversation."
        : "I can keep helping with nearby tips, routes, and stories.";

    replyText = `Here is your TourVision guide for ${placeName}: ${placeSummary} You are currently in the ${zone || "general"} zone. ${conversationHint} In response to "${message}", I suggest focusing on the signature viewpoint, the local history, and the best walking route from your current position.`;
  }

  if (!process.env.ML_SERVICE_URL) {
    console.warn("ML_SERVICE_URL is not configured, using local chat fallback.");
  }

  return {
    reply: replyText,
    caption: `Exploring ${placeName}: ${placeSummary}`,
    source: "local-fallback"
  };
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
      console.warn("ML service place generation failed, using local fallback:", error.message);
    }
  }

  return {
    description:
      place.description ||
      `${place.name} is a high-interest tourist site in ${place.city || place.location_name || "the region"}.`,
    summary: `TourVision summary for ${place.name}: arrive with enough time for a walking circuit, photo stops, and the main cultural landmarks.`,
    facts: [
      `${place.name} is ideal for guided storytelling and immersive exploration.`,
      `Peak visitor interest is usually around sunrise and sunset.`,
      `Nearby points can be explored as a connected micro-itinerary.`
    ],
    images: place.images || [],
    ar_model_url: place.ar_model_url || "",
    source: "local-fallback"
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
  generateChatReply,
  generatePlaceContent,
  estimateTripCost,
  recognizeLandmark,
  recommendHotels,
  syncChatSessionToVectorDb
};
