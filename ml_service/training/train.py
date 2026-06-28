import argparse
import json
import random
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_SIZE = (224, 224)


def collect_dataset(dataset_dir: Path):
    class_dirs = sorted(
        path for path in dataset_dir.glob("*/*") if path.is_dir()
    )
    labels = [path.name.replace("_", " ").strip() for path in class_dirs]
    files, targets = [], []
    for class_index, class_dir in enumerate(class_dirs):
        for path in sorted(class_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                files.append(str(path))
                targets.append(class_index)
    if len(labels) < 2 or not files:
        raise ValueError("Dataset must contain site/class/image folders.")
    return files, targets, labels


def decode_image(path, label):
    image = tf.io.decode_image(
        tf.io.read_file(path), channels=3, expand_animations=False
    )
    image.set_shape([None, None, 3])
    return tf.image.resize(image, IMAGE_SIZE), label


def split_dataset(files, targets):
    grouped = {}
    for path, target in zip(files, targets):
        grouped.setdefault(target, []).append(path)
    training_files, training_targets, validation_files, validation_targets = [], [], [], []
    random.seed(42)
    for target, paths in grouped.items():
        random.shuffle(paths)
        split_at = max(1, int(len(paths) * 0.2))
        validation_files.extend(paths[:split_at])
        validation_targets.extend([target] * split_at)
        training_files.extend(paths[split_at:])
        training_targets.extend([target] * (len(paths) - split_at))
    return training_files, training_targets, validation_files, validation_targets


def build_model(class_count: int):
    augmentation = keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.1),
            layers.RandomContrast(0.1),
        ],
        name="augmentation",
    )
    weights_path = Path(__file__).with_name("mobilenet_v2_weights.h5")
    base = keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights=str(weights_path) if weights_path.exists() else "imagenet",
    )
    base.trainable = False
    inputs = keras.Input(shape=(*IMAGE_SIZE, 3))
    x = augmentation(inputs)
    x = keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(class_count, activation="softmax")(x)
    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).parents[1] / "cnn")
    parser.add_argument("--epochs", type=int, default=15)
    args = parser.parse_args()

    tf.keras.utils.set_random_seed(42)
    files, targets, labels = collect_dataset(args.dataset)
    train_files, train_targets, val_files, val_targets = split_dataset(files, targets)
    training = tf.data.Dataset.from_tensor_slices((train_files, train_targets)).shuffle(
        len(train_files), seed=42
    ).map(decode_image).batch(16).prefetch(tf.data.AUTOTUNE)
    validation = tf.data.Dataset.from_tensor_slices((val_files, val_targets)).map(
        decode_image
    ).batch(16).prefetch(tf.data.AUTOTUNE)

    model = build_model(len(labels))
    model.fit(
        training,
        validation_data=validation,
        epochs=args.epochs,
        callbacks=[keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True)],
    )
    args.output.mkdir(parents=True, exist_ok=True)
    model.save(args.output / "model.keras")
    (args.output / "labels.json").write_text(
        json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Saved {len(labels)} classes from {len(files)} images to {args.output}")


if __name__ == "__main__":
    main()
