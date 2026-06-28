import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "model.keras"
LABELS_PATH = MODEL_DIR / "labels.json"
IMAGE_SIZE = (224, 224)

_model = None
_labels = None


class InvalidImageError(ValueError):
    pass


class LowConfidenceError(ValueError):
    pass


def _load_artifacts():
    global _model, _labels
    if _model is None:
        from tensorflow import keras

        if not MODEL_PATH.exists() or not LABELS_PATH.exists():
            raise RuntimeError("CNN model artifacts are missing. Run train.py first.")
        _model = keras.models.load_model(MODEL_PATH)
        _labels = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
    return _model, _labels


def predict_image(file_path: str) -> dict:
    try:
        with Image.open(file_path) as image:
            image = image.convert("RGB").resize(IMAGE_SIZE)
            image_array = np.asarray(image, dtype=np.float32)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise InvalidImageError("Invalid or unsupported image.") from error

    model, labels = _load_artifacts()
    probabilities = model.predict(np.expand_dims(image_array, axis=0), verbose=0)[0]
    class_index = int(np.argmax(probabilities))
    confidence = float(probabilities[class_index])
    threshold = float(os.getenv("CNN_CONFIDENCE_THRESHOLD", "0.55"))

    if confidence < threshold:
        raise LowConfidenceError(
            f"Low confidence prediction ({confidence:.2f}). Try a clearer image."
        )

    if class_index >= len(labels):
        raise RuntimeError("CNN prediction returned an unknown class.")

    return {"place": labels[class_index], "confidence": confidence}
