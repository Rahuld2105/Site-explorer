from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


RAW_ROOT = Path(r"C:\Users\91801\OneDrive\Desktop\AI Heritage\data\raw")
SERVICE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = SERVICE_DIR / "models"
MODEL_PATH = MODEL_DIR / "heritage_cnn.keras"
CLASS_NAMES_PATH = MODEL_DIR / "heritage_class_names.json"
HISTORY_PATH = MODEL_DIR / "heritage_training_history.json"
STAGED_DIR = SERVICE_DIR / "dataset" / "processed" / "heritage_balanced"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8
SEED = 42

CLASS_SOURCES = {
    "Sinhgad - Kalyan darwaza": RAW_ROOT / "Sinhgad" / "Kalyan darwaza",
    "Sinhgad - Kondhaneshwar Temple": RAW_ROOT / "Sinhgad" / "Kondhaneshwar Temple",
    "Sinhgad - Pune darwaza": RAW_ROOT / "Sinhgad" / "Pune darwaza",
    "Sinhgad - Rajaram Samadhi": RAW_ROOT / "Sinhgad" / "Rajaram Samadhi",
    "Sinhgad - Tanaji Machi": RAW_ROOT / "Sinhgad" / "Tanaji Machi",
    "Raigad - Hirkani Buruj": RAW_ROOT / "Raigad" / "Hirkani_buruj",
    "Raigad - Jagadishwar Temple": RAW_ROOT / "Raigad" / "jagdishwar_temple",
    "Raigad - Nagarkhana Darwaja": RAW_ROOT / "Raigad" / "Nagarkhana",
    "Raigad - Shivaji Maharaj Samadhi": RAW_ROOT / "Raigad" / "Samandhi",
}


def safe_dir_name(value: str) -> str:
    return (
        value.replace(" - ", "__")
        .replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
    )


def list_images(folder: Path) -> list[Path]:
    if not folder.exists():
        raise FileNotFoundError(f"Missing class folder: {folder}")
    return sorted(
        path
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def stage_balanced_dataset(target_per_class: int) -> list[str]:
    from PIL import Image, ImageEnhance, ImageOps

    if STAGED_DIR.exists():
        shutil.rmtree(STAGED_DIR)
    STAGED_DIR.mkdir(parents=True, exist_ok=True)

    class_names: list[str] = []
    for label, source_dir in CLASS_SOURCES.items():
        source_images = list_images(source_dir)
        if not source_images:
            raise FileNotFoundError(f"No images found in {source_dir}")

        class_names.append(label)
        output_dir = STAGED_DIR / safe_dir_name(label)
        output_dir.mkdir(parents=True, exist_ok=True)

        for index in range(target_per_class):
            source = source_images[index % len(source_images)]
            output = output_dir / f"{safe_dir_name(label)}_{index + 1:04d}.jpg"

            with Image.open(source) as image:
                image = image.convert("RGB")
                variant = index // len(source_images)
                if variant % 6 == 1:
                    image = ImageOps.mirror(image)
                elif variant % 6 == 2:
                    image = image.rotate(6, resample=Image.Resampling.BICUBIC, expand=False)
                elif variant % 6 == 3:
                    image = image.rotate(-6, resample=Image.Resampling.BICUBIC, expand=False)
                elif variant % 6 == 4:
                    image = ImageEnhance.Brightness(image).enhance(1.12)
                elif variant % 6 == 5:
                    image = ImageEnhance.Contrast(image).enhance(1.18)
                image.save(output, format="JPEG", quality=92)

    return class_names


def build_model(num_classes: int, image_size: tuple[int, int]):
    import tensorflow as tf
    from tensorflow.keras import layers

    data_augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.16),
            layers.RandomContrast(0.18),
            layers.RandomBrightness(0.12),
        ],
        name="data_augmentation",
    )

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*image_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(*image_size, 3))
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)
    x = layers.Dense(160, activation="relu")(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_datasets(validation_split: float):
    import tensorflow as tf

    train_ds = tf.keras.utils.image_dataset_from_directory(
        STAGED_DIR,
        validation_split=validation_split,
        subset="training",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=True,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        STAGED_DIR,
        validation_split=validation_split,
        subset="validation",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,
    )

    folder_to_label = {safe_dir_name(label): label for label in CLASS_SOURCES}
    class_names = [folder_to_label[name] for name in train_ds.class_names]
    autotune = tf.data.AUTOTUNE
    return (
        train_ds.cache().prefetch(buffer_size=autotune),
        val_ds.cache().prefetch(buffer_size=autotune),
        class_names,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train combined heritage CNN for Sinhgad and Raigad classes."
    )
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--fine-tune-epochs", type=int, default=8)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--target-per-class", type=int, default=30)
    args = parser.parse_args()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    staged_class_names = stage_balanced_dataset(args.target_per_class)
    print("Staged classes:")
    for label in staged_class_names:
        print(f"- {label}")

    train_ds, val_ds, class_names = load_datasets(args.validation_split)
    CLASS_NAMES_PATH.write_text(json.dumps(class_names, indent=2), encoding="utf-8")

    model = build_model(len(class_names), IMAGE_SIZE)
    print("Training classifier head...")
    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
    )

    base_model = model.get_layer("mobilenetv2_1.00_224")
    base_model.trainable = True
    for layer in base_model.layers[:-35]:
        layer.trainable = False

    import tensorflow as tf

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    print("Fine tuning final MobileNetV2 layers...")
    history_fine = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.fine_tune_epochs,
    )

    model.save(MODEL_PATH)
    HISTORY_PATH.write_text(
        json.dumps(
            {
                "class_names": class_names,
                "target_per_class": args.target_per_class,
                "head": history_head.history,
                "fine_tune": history_fine.history,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved classes: {CLASS_NAMES_PATH}")


if __name__ == "__main__":
    main()
