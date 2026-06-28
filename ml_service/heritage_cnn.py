from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "heritage_cnn.keras"
CLASS_NAMES_PATH = MODEL_DIR / "heritage_class_names.json"
INFO_PATH = BASE_DIR / "dataset" / "metadata" / "heritage_places.json"

IMAGE_SIZE = (224, 224)
CONFIDENCE_THRESHOLD = 0.55

_model: Any | None = None


@dataclass(frozen=True)
class Prediction:
    label: str
    confidence: float
    probabilities: list[dict[str, float | str]]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def humanize(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


def load_class_names() -> list[str]:
    if not CLASS_NAMES_PATH.exists():
        raise FileNotFoundError(
            f"Class names not found at {CLASS_NAMES_PATH}. Train the CNN first."
        )
    return json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8"))


def load_info() -> dict[str, dict[str, Any]]:
    if not INFO_PATH.exists():
        return {}
    raw = json.loads(INFO_PATH.read_text(encoding="utf-8"))
    return {slugify(item["label"]): item for item in raw.get("places", [])}


def get_model() -> Any:
    global _model
    if _model is not None:
        return _model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. Run training/train_sinhgad_cnn.py first."
        )

    import tensorflow as tf

    _model = tf.keras.models.load_model(MODEL_PATH)
    return _model


def image_bytes_to_batch(image_bytes: bytes) -> np.ndarray:
    from io import BytesIO

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMAGE_SIZE)
    array = np.asarray(image, dtype=np.float32)
    return np.expand_dims(array, axis=0)


def predict_image(image_bytes: bytes) -> Prediction:
    class_names = load_class_names()
    model = get_model()
    batch = image_bytes_to_batch(image_bytes)
    predictions = model.predict(batch, verbose=0)[0]

    order = np.argsort(predictions)[::-1]
    top = [
        {"label": class_names[int(index)], "confidence": float(predictions[int(index)])}
        for index in order[:3]
    ]
    best = top[0]
    return Prediction(
        label=str(best["label"]),
        confidence=float(best["confidence"]),
        probabilities=top,
    )


def build_recognition_response(prediction: Prediction) -> dict[str, Any]:
    info_by_slug = load_info()
    label_slug = slugify(prediction.label)
    info = info_by_slug.get(label_slug, {})
    confidence = round(prediction.confidence, 4)
    is_confident = confidence >= CONFIDENCE_THRESHOLD

    if not is_confident:
        return {
            "name": "Unknown or Unsupported Place",
            "site": "Outside trained heritage classes",
            "label": prediction.label,
            "place_id": "unknown-or-unsupported",
            "confidence": confidence,
            "is_confident": False,
            "description": (
                "The uploaded image does not match the trained heritage classes with enough confidence. "
                "It may be another fort/place, or the model needs more training images for this view."
            ),
            "historical_importance": "",
            "facts": [
                "The current CNN is trained only on selected Sinhgad and Raigad classes.",
                "For Rajgad, Shaniwar Wada, or other locations, add labeled images and retrain the multi-site model.",
                "Low-confidence predictions are intentionally treated as unsupported to avoid showing wrong heritage information.",
            ],
            "timings": "",
            "entry_fee": None,
            "top_predictions": prediction.probabilities,
        }

    display_name = info.get("name") or humanize(prediction.label)

    return {
        "name": display_name,
        "site": info.get("site", "Heritage Site"),
        "label": prediction.label,
        "place_id": info.get("place_id", label_slug),
        "confidence": confidence,
        "is_confident": is_confident,
        "description": info.get("description", ""),
        "historical_importance": info.get("historical_importance", ""),
        "facts": info.get("facts", []),
        "timings": info.get("timings", "5:00 AM - 6:00 PM"),
        "entry_fee": info.get("entry_fee", 20),
        "top_predictions": prediction.probabilities,
    }


def model_status() -> dict[str, Any]:
    return {
        "model_exists": MODEL_PATH.exists(),
        "class_names_exists": CLASS_NAMES_PATH.exists(),
        "model_loaded": _model is not None,
        "model_path": str(MODEL_PATH),
        "class_names_path": str(CLASS_NAMES_PATH),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }
