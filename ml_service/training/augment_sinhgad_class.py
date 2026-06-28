from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


DEFAULT_RAW_DIR = Path(
    r"C:\Users\91801\OneDrive\Desktop\AI Heritage\data\raw\Sinhgad"
)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def crop_percent(image: Image.Image, percent: float) -> Image.Image:
    width, height = image.size
    dx = int(width * percent)
    dy = int(height * percent)
    cropped = image.crop((dx, dy, width - dx, height - dy))
    return cropped.resize((width, height), Image.Resampling.LANCZOS)


VARIANTS = {
    "flip": lambda image: ImageOps.mirror(image),
    "bright": lambda image: ImageEnhance.Brightness(image).enhance(1.18),
    "dim": lambda image: ImageEnhance.Brightness(image).enhance(0.86),
    "contrast": lambda image: ImageEnhance.Contrast(image).enhance(1.2),
    "soft_contrast": lambda image: ImageEnhance.Contrast(image).enhance(0.88),
    "rot_left": lambda image: image.rotate(-4, resample=Image.Resampling.BICUBIC),
    "rot_right": lambda image: image.rotate(4, resample=Image.Resampling.BICUBIC),
    "crop_center": lambda image: crop_percent(image, 0.08),
    "crop_tight": lambda image: crop_percent(image, 0.14),
}


def count_images(folder: Path) -> int:
    return sum(
        1
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Create safe augmentation variants for a class folder.")
    parser.add_argument("--data-dir", default=str(DEFAULT_RAW_DIR))
    parser.add_argument("--label", required=True)
    parser.add_argument("--target-total", type=int, default=30)
    args = parser.parse_args()

    class_dir = Path(args.data_dir) / args.label
    if not class_dir.exists():
        raise FileNotFoundError(f"Class folder not found: {class_dir}")

    source_images = [
        path
        for path in class_dir.iterdir()
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
        and "_aug_" not in path.stem
    ]

    created = 0
    for source in source_images:
        if count_images(class_dir) >= args.target_total:
            break

        with Image.open(source) as opened:
            base = opened.convert("RGB")
            if min(base.size) < 224:
                base = base.resize((224, 224), Image.Resampling.LANCZOS)

            for variant_name, transform in VARIANTS.items():
                if count_images(class_dir) >= args.target_total:
                    break

                output = class_dir / f"{source.stem}_aug_{variant_name}.jpg"
                if output.exists():
                    continue

                transformed = transform(base)
                transformed.save(output, format="JPEG", quality=90, optimize=True)
                created += 1

    print(f"{args.label}: created {created} augmentation files")
    print(f"{args.label}: total images now {count_images(class_dir)}")


if __name__ == "__main__":
    main()
