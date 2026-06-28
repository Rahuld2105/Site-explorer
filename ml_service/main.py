import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError
from pydantic import BaseModel, Field

from heritage_cnn import build_recognition_response, get_model, model_status, predict_image

load_dotenv()


def parse_allowed_origins() -> list[str]:
    raw = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(title="TourVision ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def warm_recognition_model() -> None:
    """Load the CNN once so the first visitor does not pay TensorFlow startup time."""
    if model_status()["model_exists"]:
        get_model()


class ChatRequest(BaseModel):
    message: str
    place_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class CostEstimateRequest(BaseModel):
    destinations: list[str] = Field(default_factory=list)
    duration: int = 1
    transport: str = "car"
    members: int | dict[str, int] = 1


class HotelRecommendationRequest(BaseModel):
    location: str | None = None
    lat: float | None = None
    lng: float | None = None
    budget: int | None = None


class PlaceGenerateRequest(BaseModel):
    place: dict[str, Any] = Field(default_factory=dict)


class FoodClassificationRequest(BaseModel):
    text: str | None = None
    image_label: str | None = None


class SemanticSearchRequest(BaseModel):
    query: str
    place_id: str | None = None


class TranslateRequest(BaseModel):
    text: str
    target_language: str


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "tourvision-ml",
        "port": int(os.getenv("PORT", "8000")),
        "recognition": model_status(),
    }


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)) -> dict[str, Any]:
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB.")

    try:
        prediction = predict_image(image_bytes)
        return build_recognition_response(prediction)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail="The file could not be read as an image. Try a JPG, PNG, or WebP file.",
        ) from error
    except FileNotFoundError as error:
        status = model_status()
        return {
            "name": "Heritage Recognition Model Not Trained",
            "confidence": 0.0,
            "is_confident": False,
            "facts": [
                "The CNN code is ready, but the combined trained model file is missing.",
                "Train it with: python training/train_heritage_cnn.py",
                "Default raw data path: C:\\Users\\91801\\OneDrive\\Desktop\\AI Heritage\\data\\raw",
            ],
            "error": str(error),
            "recognition": status,
        }


@app.post("/chat")
def chat(payload: ChatRequest) -> dict[str, Any]:
    zone = payload.context.get("zone", "general")
    place_id = payload.place_id or "unknown-place"

    return {
        "reply": f"TourVision ML guide reply for {place_id}: you are in the {zone} zone. {payload.message}",
        "caption": f"Guide ready for {place_id}",
        "tts_audio_url": "",
    }


@app.post("/cost/estimate")
def estimate_cost(payload: CostEstimateRequest) -> dict[str, Any]:
    if isinstance(payload.members, dict):
        member_count = sum(int(value or 0) for value in payload.members.values()) or 1
    else:
        member_count = int(payload.members or 1)

    transport_rate = {
        "car": 1400,
        "train": 1200,
        "bike": 900,
        "bus": 1000,
    }.get(payload.transport, 1100)

    transport_total = transport_rate * max(payload.duration, 1)
    stays_total = 1800 * member_count * max(payload.duration - 1, 1)
    food_total = 500 * member_count * max(payload.duration, 1)
    total = transport_total + stays_total + food_total

    return {
        "total": total,
        "breakdown": {
            "transport": transport_total,
            "stay": stays_total,
            "food": food_total,
        },
    }


@app.post("/places/generate")
def generate_place_content(payload: PlaceGenerateRequest) -> dict[str, Any]:
    place = payload.place or {}
    name = place.get("name") or "this place"
    city = place.get("city") or place.get("location_name") or "the region"

    return {
        "summary": f"{name} is one of TourVision's highlighted destinations in {city}.",
        "description": f"{name} offers a place-aware TourVision guide experience with history, navigation, and storytelling support.",
        "facts": [
            f"{name} is ready for guided narration and immersive discovery.",
            "This response comes from the ML service wiring layer.",
            "Swap this fallback with your production place-content pipeline when ready.",
        ],
        "ar_model_url": place.get("ar_model_url") or "",
    }


@app.post("/recommend/hotels")
def recommend_hotels(payload: HotelRecommendationRequest) -> dict[str, Any]:
    budget = payload.budget or 3000

    return {
        "results": [
            {"name": "Heritage Stay", "price_per_night": budget, "score": 9.2},
            {"name": "Old City Residency", "price_per_night": int(budget * 0.8), "score": 8.9},
            {"name": "Fort View Hotel", "price_per_night": int(budget * 1.1), "score": 8.7},
        ]
    }


@app.post("/classify/food")
def classify_food(payload: FoodClassificationRequest) -> dict[str, Any]:
    text = f"{payload.text or ''} {payload.image_label or ''}".lower()
    category = "veg" if "paneer" in text or "veg" in text else "non-veg"

    return {
        "classification": category,
        "confidence": 0.9,
    }


@app.post("/search/semantic")
def semantic_search(payload: SemanticSearchRequest) -> dict[str, Any]:
    return {
        "results": [
            {
                "title": f"Relevant result for {payload.query}",
                "snippet": "Semantic search wiring is working correctly.",
                "place_id": payload.place_id,
            }
        ]
    }


@app.post("/translate")
def translate(payload: TranslateRequest) -> dict[str, Any]:
    return {
        "translated_text": f"[{payload.target_language}] {payload.text}",
        "target_language": payload.target_language,
    }
