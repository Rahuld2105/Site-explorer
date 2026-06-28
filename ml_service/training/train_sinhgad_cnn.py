from __future__ import annotations

import argparse
import json
from pathlib import Path


DEFAULT_RAW_DIR = Path(
    r"C:\Users\91801\OneDrive\Desktop\AI Heritage\data\raw\Sinhgad"
)
SERVICE_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = SERVICE_DIR / "models"
MODEL_PATH = MODEL_DIR / "heritage_sinhgad_cnn.keras"
CLASS_NAMES_PATH = MODEL_DIR / "sinhgad_class_names.json"
HISTORY_PATH = MODEL_DIR / "sinhgad_training_history.json"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8
SEED = 42


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
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_datasets(raw_dir: Path, validation_split: float):
    import tensorflow as tf

    train_ds = tf.keras.utils.image_dataset_from_directory(
        raw_dir,
        validation_split=validation_split,
        subset="training",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=True,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        raw_dir,
        validation_split=validation_split,
        subset="validation",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,
    )

    autotune = tf.data.AUTOTUNE
    return (
        train_ds.cache().prefetch(buffer_size=autotune),
        val_ds.cache().prefetch(buffer_size=autotune),
        train_ds.class_names,
    )


def compute_class_weights(raw_dir: Path, class_names: list[str]) -> dict[int, float]:
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    counts = []
    for class_name in class_names:
        class_dir = raw_dir / class_name
        count = sum(
            1
            for path in class_dir.iterdir()
            if path.is_file() and path.suffix.lower() in image_extensions
        )
        counts.append(max(count, 1))

    total = sum(counts)
    class_total = len(class_names)
    return {
        index: total / (class_total * count)
        for index, count in enumerate(counts)
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train Sinhgad Fort CNN using folder-per-class images."
    )
    parser.add_argument("--data-dir", default=str(DEFAULT_RAW_DIR))
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--fine-tune-epochs", type=int, default=8)
    parser.add_argument("--validation-split", type=float, default=0.2)
    args = parser.parse_args()

    raw_dir = Path(args.data_dir)
    if not raw_dir.exists():
        raise FileNotFoundError(f"Raw image directory not found: {raw_dir}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    train_ds, val_ds, class_names = load_datasets(raw_dir, args.validation_split)
    class_weights = compute_class_weights(raw_dir, class_names)
    CLASS_NAMES_PATH.write_text(json.dumps(class_names, indent=2), encoding="utf-8")

    model = build_model(len(class_names), IMAGE_SIZE)
    print("Training classifier head...")
    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        class_weight=class_weights,
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
        class_weight=class_weights,
    )

    model.save(MODEL_PATH)
    HISTORY_PATH.write_text(
        json.dumps(
            {
                "class_names": class_names,
                "class_weights": class_weights,
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
