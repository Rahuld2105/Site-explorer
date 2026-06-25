const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const HeritageAIContext = require("../models/HeritageAIContext");
const HeritagePlace = require("../models/HeritagePlace");
const NearbyService = require("../models/NearbyService");
const Place = require("../models/Place");
const { haversineKm } = require("../utils/distance");

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

function cleanAiDisplayText(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s?/gm, "")
    .replace(/^\s*[-•]\s?/gm, "")
    .trim();
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCoordinates(source = {}) {
  const coordinates = source?.location?.coordinates || source?.coordinates;
  const lat = normalizeNumber(source.latitude ?? source.lat ?? coordinates?.lat ?? coordinates?.[1]);
  const lng = normalizeNumber(source.longitude ?? source.lng ?? coordinates?.lng ?? coordinates?.[0]);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

function normalizeSelectedPlace(place = {}) {
  if (!place) {
    return null;
  }

  const coordinates = normalizeCoordinates(place);

  return {
    id: place.place_id || place.id || place._id || "",
    name: place.name || "",
    latitude: coordinates?.lat ?? null,
    longitude: coordinates?.lng ?? null,
    district: place.district || place.city || place.location_name || "",
    state: place.state || "",
    category: place.category || place.best_for || "",
    timings: place.timings || place.hours || "",
    entry_fee: Number(place.entry_fee || place.price || 0),
    architecture: place.architecture || place.ai_content?.architecture || "",
    best_time_to_visit: place.best_time_to_visit || "",
    estimated_visit_duration: place.estimated_visit_duration || "",
    parking: place.parking || "",
    weather: place.weather || null,
    raw_mongodb_context: {
      description: place.description || place.description_en || "",
      marathi_description: place.description_mr || "",
      facts: place.facts || place.facts_en || place.interesting_facts || place.ai_content?.hidden_facts || [],
      ai_content: place.ai_content || null
    },
    historical_summary:
      place.ai_content?.overview ||
      place.ai_content?.summary ||
      place.historical_importance_en ||
      place.historical_importance ||
      place.historical_importance_mr ||
      place.history ||
      place.ai_content?.history ||
      place.description_en ||
      place.description_mr ||
      place.description ||
      ""
  };
}

function normalizeUserLocation(location = {}) {
  const coordinates = normalizeCoordinates(location);

  if (!coordinates) {
    return null;
  }

  return {
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    city: location.city || "",
    state: location.state || "",
    accuracy: location.accuracy || null
  };
}

function extractBudgetContext(message = "") {
  const text = String(message || "");
  const amountMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+)|([\d,]+)\s*(?:₹|rs\.?|inr)/i);
  const durationMatch = text.match(/\b(one|two|three|four|five|1|2|3|4|5)\s*(?:day|days?)\b/i);
  const groupMatch = text.match(/\b(family|friends|solo trip|solo|couple|luxury|low budget|budget|trek|honeymoon|photography|kids)\b/i);
  const hasPlanningIntent = /\b(budget|₹|rs\.?|inr|days?|low budget|luxury|one day|two day|family|friends|solo trip|solo|trek|honeymoon|photography|kids)\b/i.test(text);

  return {
    hasPlanningIntent,
    amount: amountMatch ? Number(String(amountMatch[1] || amountMatch[2]).replace(/,/g, "")) : null,
    duration: durationMatch ? durationMatch[0] : "",
    travelStyle: groupMatch ? groupMatch[0] : ""
  };
}

function formatNearbyPlacesForPrompt(places = []) {
  if (!places.length) {
    return "No nearby places were found in the database for the current context.";
  }

  return places
    .map((place, index) => {
      const fee = Number(place.entry_fee || 0);
      return [
        `${index + 1}. ${place.name}`,
        `category: ${place.category || "heritage place"}`,
        `district: ${place.district || "unknown"}`,
        `state: ${place.state || "unknown"}`,
        `distance: ${Number(place.distance_km || 0).toFixed(1)} km`,
        `timings: ${place.timings || place.hours || "not listed"}`,
        `entry fee: ${fee === 0 ? "free/unknown" : `Rs ${fee}`}`,
        `visit duration: ${place.estimated_visit_duration || "not listed"}`,
        `source: ${place.data_source || "MongoDB"}`
      ].join("; ");
    })
    .join("\n");
}

function formatServicesForPrompt(services = []) {
  if (!services.length) {
    return "No MongoDB services were found near the current context.";
  }

  return services
    .map((service, index) => {
      return [
        `${index + 1}. ${service.name}`,
        `type: ${service.type || "service"}`,
        `category: ${service.category || "not listed"}`,
        `distance: ${Number(service.distance_km || 0).toFixed(1)} km`,
        `rating: ${service.rating ?? "not listed"}`,
        `hours: ${service.hours || "not listed"}`,
        `address: ${service.address || "not listed"}`,
        `tags: ${Array.isArray(service.tags) && service.tags.length ? service.tags.join(", ") : "not listed"}`
      ].join("; ");
    })
    .join("\n");
}

function getStablePlaceKey(place) {
  return String(place?.place_id || place?.slug || place?.id || place?._id || place?.name || "")
    .trim()
    .toLowerCase();
}

function getPlaceLookupValue(place = {}) {
  return String(place?.place_id || place?.id || place?._id || place?.slug || place?.name || "").trim();
}

function buildHeritagePlaceQuery(place = {}) {
  const lookupValue = getPlaceLookupValue(place);

  if (!lookupValue) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(lookupValue)) {
    return { $or: [{ _id: lookupValue }, { place_id: lookupValue }, { slug: lookupValue }] };
  }

  return { $or: [{ place_id: lookupValue }, { slug: lookupValue }, { name: lookupValue }] };
}

async function resolveHeritagePlace(selectedPlace) {
  const query = buildHeritagePlaceQuery(selectedPlace);

  if (!query) {
    return null;
  }

  return HeritagePlace.findOne(query).lean();
}

function hasTextValue(value) {
  return Array.isArray(value)
    ? value.some((item) => String(item?.question || item || "").trim())
    : Boolean(String(value || "").trim());
}

function normalizeFaq(faq) {
  if (typeof faq === "string") {
    return { question: faq, answer: "" };
  }

  return {
    question: faq?.question || faq?.q || "",
    answer: faq?.answer || faq?.a || ""
  };
}

const AI_CONTEXT_FIELD_RULES = [
  { field: "history", label: "History", pattern: /\b(history|historical|past|built|builder|founded|origin|shivaji|peshwa|maratha|dynasty|king|battle|capital)\b/i },
  { field: "architecture", label: "Architecture", pattern: /\b(architecture|design|structure|gate|wall|fortification|palace|material|layout|bastion|water|cistern)\b/i },
  { field: "cultural_significance", label: "Cultural significance", pattern: /\b(culture|cultural|significance|important|importance|heritage|festival|tradition|symbol|legacy)\b/i },
  { field: "hidden_facts", label: "Hidden facts", pattern: /\b(fact|facts|hidden|secret|unknown|trivia|interesting|surprising)\b/i },
  { field: "travel_tips", label: "Travel tips", pattern: /\b(tip|tips|visit|carry|wear|safety|crowd|guide|prepare|advice|avoid)\b/i },
  { field: "photography_tips", label: "Photography tips", pattern: /\b(photo|photos|photography|camera|picture|pictures|selfie|viewpoint|sunrise|sunset|shot|shots)\b/i },
  { field: "best_time_to_visit", label: "Best time to visit", pattern: /\b(best time|season|month|weather|monsoon|summer|winter|when to visit)\b/i },
  { field: "trek_difficulty", label: "Trek difficulty", pattern: /\b(trek|hike|climb|difficulty|hard|easy|trail|route|stamina|fitness)\b/i },
  { field: "family_friendly", label: "Family friendly", pattern: /\b(family|kids|children|child|elderly|parents|senior|safe|friendly)\b/i },
  { field: "budget_trip", label: "Budget trip", pattern: /\b(budget|cheap|cost|expense|rs|inr|rupee|rupees|money|affordable|low budget)\b/i },
  { field: "one_day_itinerary", label: "One day itinerary", pattern: /\b(one day|1 day|itinerary|plan|schedule|morning|afternoon|evening|day trip)\b/i }
];

function getRelevantAIContextFields(message = "") {
  const fields = new Set(["place_id", "short_summary"]);
  const matchedRules = AI_CONTEXT_FIELD_RULES.filter((rule) => rule.pattern.test(message));

  if (/\b(history|historical|past|built|builder|founded|origin|shivaji|peshwa|maratha|dynasty|king|battle|capital)\b/i.test(message)) {
    fields.add("history");
    fields.add("cultural_significance");
    fields.add("hidden_facts");
    return Array.from(fields);
  }

  if (/\b(architecture|design|structure|gate|wall|fortification|palace|material|layout|bastion|water|cistern)\b/i.test(message)) {
    fields.add("architecture");
    fields.add("cultural_significance");
    return Array.from(fields);
  }

  if (/\b(fact|facts|hidden|secret|unknown|trivia|interesting|surprising)\b/i.test(message)) {
    fields.add("hidden_facts");
    return Array.from(fields);
  }

  if (matchedRules.length) {
    matchedRules.forEach((rule) => fields.add(rule.field));
  } else {
    fields.add("history");
    fields.add("architecture");
    fields.add("cultural_significance");
    fields.add("hidden_facts");
  }

  if (/\b(why|how|what|where|when|faq|question)\b/i.test(message)) {
    fields.add("faqs");
  }

  return Array.from(fields);
}

const OPERATIONAL_FIELD_RULES = [
  { field: "timings", label: "Timings", pattern: /\b(timing|timings|hours|open|close|opening|closing)\b/i, getValue: (place) => place.timings || place.hours || "" },
  { field: "entry_fee", label: "Entry fee", pattern: /\b(entry fee|ticket|price|fee|cost|rs|inr|rupee|rupees)\b/i, getValue: (place) => {
    const fee = Number(place.entry_fee || place.price || 0);
    return fee ? `Rs ${fee}` : "";
  } },
  { field: "estimated_visit_duration", label: "Visit duration", pattern: /\b(duration|how long|time needed|hours needed)\b/i, getValue: (place) => place.estimated_visit_duration || "" },
  { field: "category", label: "Category", pattern: /\b(category|type|kind|what is this place)\b/i, getValue: (place) => place.category || "" }
];

function pickRelevantFaqs(message, faqs = []) {
  const normalizedMessage = String(message || "").toLowerCase();
  const words = normalizedMessage.match(/[a-z0-9]+/g) || [];
  const meaningfulWords = words.filter((word) => word.length > 3);

  return faqs
    .map(normalizeFaq)
    .filter((faq) => hasTextValue(faq.question) || hasTextValue(faq.answer))
    .filter((faq) => {
      const faqText = `${faq.question} ${faq.answer}`.toLowerCase();
      return meaningfulWords.some((word) => faqText.includes(word));
    })
    .slice(0, 3);
}

function addPromptField(lines, label, value) {
  if (!hasTextValue(value)) {
    return;
  }

  const text = Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          const faq = normalizeFaq(item);
          return [faq.question, faq.answer].filter(Boolean).join(" - ");
        })
        .filter(Boolean)
        .join("; ")
    : String(value);

  if (text.trim()) {
    lines.push(`${label}: ${text.trim()}`);
  }
}

function selectRelevantAIContext({ message, aiContext, fallbackPlace }) {
  const source = aiContext || {};
  const lines = [];
  const matchedRules = AI_CONTEXT_FIELD_RULES.filter((rule) => rule.pattern.test(message || ""));
  const historyRule = AI_CONTEXT_FIELD_RULES.find((rule) => rule.field === "history");
  const architectureRule = AI_CONTEXT_FIELD_RULES.find((rule) => rule.field === "architecture");
  const cultureRule = AI_CONTEXT_FIELD_RULES.find((rule) => rule.field === "cultural_significance");
  const hiddenFactsRule = AI_CONTEXT_FIELD_RULES.find((rule) => rule.field === "hidden_facts");
  const rulesToUse = matchedRules.length ? matchedRules : [historyRule, architectureRule, cultureRule, hiddenFactsRule].filter(Boolean);

  addPromptField(lines, "Short summary", source.short_summary);

  rulesToUse.forEach((rule) => {
    addPromptField(lines, rule.label, source[rule.field]);
  });

  const relevantFaqs = pickRelevantFaqs(message, source.faqs);
  addPromptField(lines, "Relevant FAQs", relevantFaqs);

  return {
    lines,
    source: aiContext ? "HeritageAIContext" : "Gemini general knowledge",
    hasAIContext: Boolean(aiContext),
    hasRelevantFields: lines.length > 0,
    placeName: fallbackPlace?.name || "the current place"
  };
}

function getPlaceQuestionStyle(message = "") {
  if (/\b(history|historical|past|built|builder|founded|origin|shivaji|peshwa|maratha|dynasty|king|battle|capital)\b/i.test(message)) {
    return "history";
  }

  if (/\b(architecture|design|structure|gate|wall|fortification|palace|material|layout|bastion|water|cistern)\b/i.test(message)) {
    return "architecture";
  }

  if (/\b(fact|facts|hidden|secret|unknown|trivia|interesting|surprising)\b/i.test(message)) {
    return "hidden_facts";
  }

  return "general";
}

function getResponseGuidance(message = "") {
  const style = getPlaceQuestionStyle(message);

  if (style === "history") {
    return [
      "Write 200 to 300 words.",
      "Include an introduction to the monument, historical background, why it is important, important rulers or events, cultural significance, and one interesting fact at the end.",
      "Make it descriptive, engaging, and guide-like."
    ].join("\n");
  }

  if (style === "architecture") {
    return [
      "Write 150 to 250 words.",
      "Explain architectural style, construction, materials, unique features, and importance.",
      "Make the explanation vivid enough for a visitor standing at the monument."
    ].join("\n");
  }

  if (style === "hidden_facts") {
    return [
      "Write 100 to 150 words.",
      "Share interesting information tourists would enjoy, with a curious but factual tone."
    ].join("\n");
  }

  return "Answer naturally and directly, without repeating greetings. Keep the response relevant to the current place.";
}

function selectOperationalContext({ message, place }) {
  if (!place) {
    return [];
  }

  return OPERATIONAL_FIELD_RULES.filter((rule) => rule.pattern.test(message || "")).reduce((lines, rule) => {
    addPromptField(lines, rule.label, rule.getValue(place));
    return lines;
  }, []);
}

function shouldFetchNearbyContext(message = "") {
  return /\b(nearby|near me|hotel|hotels|restaurant|restaurants|food|eat|transport|parking|route|routes|distance|attraction|attractions|around|near)\b/i.test(
    message
  );
}

function buildFocusedPlacePrompt({
  currentPage,
  place,
  aiContextLines,
  aiContextSource,
  operationalLines,
  nearbyHeritagePlaces,
  nearbyServices,
  budgetContext,
  message
}) {
  const nearbyRequested = shouldFetchNearbyContext(message);
  const responseGuidance = getResponseGuidance(message);
  const budgetLines = budgetContext?.hasPlanningIntent
    ? [
        `Budget planning intent: yes`,
        `Mentioned budget: ${budgetContext.amount ? `Rs ${budgetContext.amount}` : "not specified"}`,
        `Trip duration: ${budgetContext.duration || "not specified"}`,
        `Travel style/group: ${budgetContext.travelStyle || "not specified"}`
      ].join("\n")
    : "Budget planning intent: no";

  return `You are TourVision's professional heritage guide.

Respond like a knowledgeable heritage guide who explains monuments through cultural and historical storytelling. Do not begin with "Hello", "As your TourVision guide", or any repeated greeting. Answer directly.

Use the provided HeritageAIContext fields first. If the relevant information is unavailable in HeritageAIContext, you may use your general heritage knowledge, but keep the answer clearly relevant to the current place. Do not invent live or operational details.

Current page: ${currentPage || "Place"}
Current place: ${place?.name || "selected heritage place"}
Place ID: ${place?.place_id || "not listed"}

Relevant AI knowledge source: ${aiContextSource}
${aiContextLines.length ? aiContextLines.join("\n") : "No relevant AI knowledge fields were found."}

Relevant operational facts from HeritagePlace:
${operationalLines.length ? operationalLines.join("\n") : "No operational facts were needed for this question."}

Nearby attractions from MongoDB:
${nearbyRequested ? formatNearbyPlacesForPrompt(nearbyHeritagePlaces) : "Not requested."}

Nearby hotels from MongoDB:
${nearbyRequested ? formatServicesForPrompt(nearbyServices?.hotels) : "Not requested."}

Nearby restaurants from MongoDB:
${nearbyRequested ? formatServicesForPrompt(nearbyServices?.restaurants) : "Not requested."}

Nearby transport and parking from MongoDB:
${nearbyRequested ? [formatServicesForPrompt(nearbyServices?.transport), formatServicesForPrompt(nearbyServices?.parking)].join("\n") : "Not requested."}

Budget/trip context:
${budgetLines}

User question:
${message}

Response rules:
- Answer for the current place only unless nearby context was explicitly requested and provided.
- Focus on heritage explanation, cultural meaning, history, architecture, and stories.
- Do not duplicate basic place-page facts unless they directly answer the user's question.
- Never include weather, routing, hotels, restaurants, transport, parking, or other live information unless the user explicitly asks for it.
- Use operational facts only for direct operational questions.
- If HeritageAIContext is missing relevant information, use general knowledge carefully and avoid claiming unsupported precision.
- ${responseGuidance}
- Do not use Markdown symbols, bullets, or headings with # characters.`;
}

async function getNearbyPlacesContext(origin, { excludePlace = null, limit = 8, radiusKm = 75 } = {}) {
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    return [];
  }

  const [heritagePlaces, places] = await Promise.all([
    HeritagePlace.find({})
      .select("place_id slug name latitude longitude district state category timings hours entry_fee estimated_visit_duration rating")
      .lean(),
    Place.find({})
      .select("place_id slug name latitude longitude city location_name category hours entry_fee price rating")
      .lean()
  ]);

  const seen = new Set();
  const excludedKey = getStablePlaceKey(excludePlace);

  return [
    ...heritagePlaces.map((place) => ({ ...place, data_source: "HeritagePlace" })),
    ...places.map((place) => ({ ...place, district: place.city || place.location_name || "", data_source: "Place" }))
  ]
    .map((place) => {
      const coordinates = normalizeCoordinates(place);

      if (!coordinates) {
        return null;
      }

      const distance = haversineKm(origin.lat, origin.lng, coordinates.lat, coordinates.lng);

      return {
        ...place,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        distance_km: distance
      };
    })
    .filter((place) => place && place.distance_km <= radiusKm)
    .filter((place) => {
      const key = getStablePlaceKey(place);

      if (key && excludedKey && key === excludedKey) {
        return false;
      }

      if (!key) {
        return true;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((first, second) => first.distance_km - second.distance_km)
    .slice(0, limit);
}

async function getNearbyServicesContext(origin, { limitPerType = 5, radiusKm = 15 } = {}) {
  const empty = {
    hotels: [],
    restaurants: [],
    transport: [],
    parking: []
  };

  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    return empty;
  }

  const services = await NearbyService.find({ is_active: true })
    .select("name type category latitude longitude location address rating review_count hours price_level tags source")
    .lean();

  return services
    .map((service) => {
      const coordinates = normalizeCoordinates(service);

      if (!coordinates) {
        return null;
      }

      return {
        ...service,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        distance_km: haversineKm(origin.lat, origin.lng, coordinates.lat, coordinates.lng)
      };
    })
    .filter((service) => service && service.distance_km <= radiusKm)
    .sort((first, second) => first.distance_km - second.distance_km)
    .reduce((groups, service) => {
      const type = String(service.type || "").toLowerCase();
      const category = String(service.category || "").toLowerCase();
      const tags = Array.isArray(service.tags) ? service.tags.join(" ").toLowerCase() : "";
      const bucket =
        type === "hotel"
          ? "hotels"
          : type === "restaurant"
            ? "restaurants"
            : /parking/.test(`${type} ${category} ${tags}`)
              ? "parking"
              : /fuel|hospital|transport|bus|railway|station|taxi|parking/.test(`${type} ${category} ${tags}`)
                ? "transport"
                : null;

      if (bucket && groups[bucket].length < limitPerType) {
        groups[bucket].push(service);
      }

      return groups;
    }, empty);
}

function buildTourismPrompt({ currentPage, userLocation, selectedPlace, nearbyHeritagePlaces, nearbyServices, budgetContext, message }) {
  const isPlacePage = String(currentPage || "").toLowerCase() === "place";
  const locationLines = userLocation
    ? [
        `Latitude: ${userLocation.latitude}`,
        `Longitude: ${userLocation.longitude}`,
        `City: ${userLocation.city || "unknown"}`,
        `State: ${userLocation.state || "unknown"}`
      ].join("\n")
    : "No user GPS context was provided.";

  const selectedPlaceLines = selectedPlace
    ? [
        `Place name: ${selectedPlace.name || "selected place"}`,
        `Latitude: ${selectedPlace.latitude ?? "unknown"}`,
        `Longitude: ${selectedPlace.longitude ?? "unknown"}`,
        `District: ${selectedPlace.district || "unknown"}`,
        `State: ${selectedPlace.state || "unknown"}`,
        `Historical category: ${selectedPlace.category || "unknown"}`,
        `Timings: ${selectedPlace.timings || "not listed"}`,
        `Entry fee: ${selectedPlace.entry_fee ? `Rs ${selectedPlace.entry_fee}` : "free/unknown"}`,
        `Best time to visit: ${selectedPlace.best_time_to_visit || "not listed"}`,
        `Estimated visit duration: ${selectedPlace.estimated_visit_duration || "not listed"}`,
        `Parking: ${selectedPlace.parking || "not listed"}`,
        `Weather: ${
          selectedPlace.weather
            ? [
                selectedPlace.weather.condition || "live weather",
                Number.isFinite(Number(selectedPlace.weather.temperature)) ? `${Math.round(Number(selectedPlace.weather.temperature))} C` : "",
                Number.isFinite(Number(selectedPlace.weather.rainProbability)) ? `${Math.round(Number(selectedPlace.weather.rainProbability))}% rain` : "",
                Number.isFinite(Number(selectedPlace.weather.windSpeed)) ? `${Math.round(Number(selectedPlace.weather.windSpeed))} km/h wind` : ""
              ]
                .filter(Boolean)
                .join(", ")
            : "not listed"
        }`,
        `Historical summary: ${selectedPlace.historical_summary || "not listed"}`,
        `Architecture: ${selectedPlace.architecture || "not listed"}`,
        `MongoDB facts: ${
          Array.isArray(selectedPlace.raw_mongodb_context?.facts) && selectedPlace.raw_mongodb_context.facts.length
            ? selectedPlace.raw_mongodb_context.facts.join("; ")
            : "not listed"
        }`
      ].join("\n")
    : "No selected place context was provided.";

  const budgetLines = budgetContext?.hasPlanningIntent
    ? [
        `Budget planning intent: yes`,
        `Mentioned budget: ${budgetContext.amount ? `Rs ${budgetContext.amount}` : "not specified"}`,
        `Trip duration: ${budgetContext.duration || "not specified"}`,
        `Travel style/group: ${budgetContext.travelStyle || "not specified"}`
      ].join("\n")
    : "Budget planning intent: no";

  return `You are TourVision's professional tourism expert for heritage travel.

Never answer as a generic chatbot. Always answer as a TourVision guide using the app and MongoDB context first. Use Gemini knowledge only to enrich the response with practical tourism advice, and do not override MongoDB facts. Do not invent place names, fees, timings, or distances. If data is missing, say it is not listed and give practical next steps.

Current page: ${currentPage || "Home"}

User location context:
${isPlacePage ? "Ignored for this Place page request. Use only the selected place as the origin." : locationLines}

Selected place context:
${selectedPlaceLines}

Nearby attractions from MongoDB:
${formatNearbyPlacesForPrompt(nearbyHeritagePlaces)}

Nearby hotels from MongoDB:
${formatServicesForPrompt(nearbyServices?.hotels)}

Nearby restaurants from MongoDB:
${formatServicesForPrompt(nearbyServices?.restaurants)}

Nearby transport from MongoDB:
${formatServicesForPrompt(nearbyServices?.transport)}

Nearby parking from MongoDB:
${formatServicesForPrompt(nearbyServices?.parking)}

Budget/trip context:
${budgetLines}

User question:
${message}

Response rules:
- If Current page is Home, answer relative to the user's GPS location.
- If Current page is Place, answer only relative to the selected place and always mention that place when helpful. Ignore the user's GPS location.
- If the user asks about budget, rupees, days, family, friends, solo, trek, honeymoon, photography, or kids, create a personalized itinerary with Morning, Afternoon, Evening, Estimated cost, Entry fees, Transport, Food, Nearby attractions, and Travel tips.
- Use nearby attractions, hotels, restaurants, transport, parking, weather, opening timings, entry fees, travel distance, estimated local travel cost, food suggestions, and transport suggestions when relevant.
- Keep answers concise, practical, and location-aware.
- Do not use Markdown symbols, bullets, or headings with # characters.`;
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

async function generateAiGuideReply({ currentPage = "Home", userLocation = null, selectedPlace = null, message }) {
  const isPlacePage = String(currentPage).toLowerCase() === "place";
  const normalizedUserLocation = isPlacePage ? null : normalizeUserLocation(userLocation);
  const resolvedHeritagePlace = isPlacePage ? await resolveHeritagePlace(selectedPlace) : null;
  const placeForContext = resolvedHeritagePlace || selectedPlace;
  const normalizedSelectedPlace = normalizeSelectedPlace(placeForContext);
  const contextOrigin =
    isPlacePage && normalizedSelectedPlace?.latitude !== null && normalizedSelectedPlace?.longitude !== null
      ? { lat: normalizedSelectedPlace.latitude, lng: normalizedSelectedPlace.longitude }
      : isPlacePage
        ? null
        : normalizedUserLocation
        ? { lat: normalizedUserLocation.latitude, lng: normalizedUserLocation.longitude }
        : null;
  const budgetContext = extractBudgetContext(message);
  const shouldIncludeNearbyContext = !isPlacePage || shouldFetchNearbyContext(message);
  const aiContextFields = getRelevantAIContextFields(message);
  const [nearbyHeritagePlaces, nearbyServices, heritageAIContext] = await Promise.all([
    shouldIncludeNearbyContext
      ? getNearbyPlacesContext(contextOrigin, {
          excludePlace: isPlacePage ? normalizedSelectedPlace : null
        })
      : Promise.resolve([]),
    shouldIncludeNearbyContext ? getNearbyServicesContext(contextOrigin) : Promise.resolve({ hotels: [], restaurants: [], transport: [], parking: [] }),
    resolvedHeritagePlace?.place_id
      ? HeritageAIContext.findOne({ place_id: resolvedHeritagePlace.place_id })
          .select(aiContextFields.join(" "))
          .lean()
      : Promise.resolve(null)
  ]);

  const selectedAIContext = isPlacePage
    ? selectRelevantAIContext({
        message,
        aiContext: heritageAIContext,
        fallbackPlace: resolvedHeritagePlace || selectedPlace
      })
    : null;
  const prompt =
    isPlacePage && normalizedSelectedPlace
      ? buildFocusedPlacePrompt({
          currentPage,
          place: resolvedHeritagePlace || selectedPlace,
          aiContextLines: selectedAIContext.lines,
          aiContextSource: selectedAIContext.source,
          operationalLines: selectOperationalContext({ message, place: resolvedHeritagePlace || selectedPlace }),
          nearbyHeritagePlaces,
          nearbyServices,
          budgetContext,
          message
        })
      : buildTourismPrompt({
          currentPage,
          userLocation: normalizedUserLocation,
          selectedPlace: normalizedSelectedPlace,
          nearbyHeritagePlaces,
          nearbyServices,
          budgetContext,
          message
        });

  const model = getGeminiModel();
  console.log("Using model:", getGeminiModelName());

  const result = await model.generateContent(prompt);
  const replyText = cleanAiDisplayText(result.response.text());

  if (!replyText) {
    throw new Error("Gemini did not return a response.");
  }

  return {
    reply: replyText,
    caption: replyText,
    text: replyText,
    source: "gemini",
    context: {
      currentPage,
      userLocation: normalizedUserLocation,
      selectedPlace: normalizedSelectedPlace,
      aiContextSource: selectedAIContext?.source || null,
      aiContextPlaceId: resolvedHeritagePlace?.place_id || null,
      nearbyHeritageCount: nearbyHeritagePlaces.length,
      nearbyServices,
      budget: budgetContext
    }
  };
}

async function generateChatReply({ place, placeId, zone, message, history = [], currentPage, userLocation, selectedPlace }) {
  const contextPlace = place || selectedPlace || null;
  const placeName = contextPlace?.name || placeId || "the current place";
  console.log("PLACE:", placeName);
  console.log("MESSAGE:", message);

  try {
    return await generateAiGuideReply({
      currentPage: currentPage || (contextPlace ? "Place" : "Home"),
      userLocation,
      selectedPlace: contextPlace,
      message
    });
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
    description: cleanAiDisplayText(generated.description),
    summary: cleanAiDisplayText(generated.summary),
    facts: Array.isArray(generated.facts) ? generated.facts.map(cleanAiDisplayText) : [],
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
  cleanAiDisplayText,
  toGeminiPublicError,
  generateAiGuideReply,
  generateChatReply,
  generatePlaceContent,
  estimateTripCost,
  recognizeLandmark,
  recommendHotels,
  syncChatSessionToVectorDb
};
