from __future__ import annotations

import argparse
import json
from pathlib import Path

import sys

SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

from heritage_cnn import build_recognition_response, predict_image


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict Sinhgad sub-place from an image.")
    parser.add_argument("image_path", help="Path to unseen image.")
    args = parser.parse_args()

    image_path = Path(args.image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    response = build_recognition_response(predict_image(image_path.read_bytes()))
    print(json.dumps(response, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
