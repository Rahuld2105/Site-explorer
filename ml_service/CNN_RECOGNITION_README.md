# Sinhgad CNN Recognition

This ML service now includes a MobileNetV2 transfer-learning CNN for recognizing Sinhgad Fort sub-places from unseen images.

## Dataset

Default training path:

```powershell
C:\Users\91801\OneDrive\Desktop\AI Heritage\data\raw\Sinhgad
```

Expected structure:

```text
Sinhgad/
  Kalyan darwaza/
    Img1.jpg
  Kondhaneshwar Temple/
    Img1.jpg
  Pune darwaza/
    Img1.jpg
  Rajaram Samadhi/
    Img1.jpg
  Tanaji Machi/
    Img1.jpg
```

Each folder name becomes a class label.

## Install

Use Python 3.10 or 3.11 for TensorFlow compatibility.

```powershell
cd "C:\Users\91801\OneDrive\Documents\New project\Site-explorer\ml_service"
pip install -r requirements.txt
```

## Train

```powershell
cd "C:\Users\91801\OneDrive\Documents\New project\Site-explorer\ml_service"
python training\train_sinhgad_cnn.py --epochs 20 --fine-tune-epochs 8
```

Outputs:

```text
models/heritage_sinhgad_cnn.keras
models/sinhgad_class_names.json
models/sinhgad_training_history.json
```

## Run API

```powershell
cd "C:\Users\91801\OneDrive\Documents\New project\Site-explorer\ml_service"
uvicorn main:app --reload --port 8000
```

Check model status:

```text
http://localhost:8000/health
```

Upload an unseen image to:

```text
POST http://localhost:8000/recognize
form-data key: image
```

The response includes predicted name, confidence, top predictions, description, historical importance, facts, timings, and entry fee.

## Accuracy Note

The current dataset has a small class count, especially `Kondhaneshwar Temple` with 4 images. The CNN is usable for a prototype, but stronger field performance needs more real photos per class, ideally 25-50 images per sub-place from different angles, lighting, distances, and visitor conditions.
