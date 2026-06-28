from __future__ import annotations

import argparse
import csv
import hashlib
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image


DEFAULT_RAW_DIR = Path(
    r"C:\Users\91801\OneDrive\Desktop\AI Heritage\data\raw\Sinhgad"
)
REPORT_PATH = Path(__file__).resolve().parents[1] / "models" / "sinhgad_wikimedia_downloads.csv"
API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "TourVisionSinhgadDataset/1.0"
MIN_WIDTH = 450
MIN_HEIGHT = 350
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

LABEL_QUERIES = {
    "Kalyan darwaza": [
        "Kalyan Darwaza Sinhagad",
        "Kalyan Darwaja Sinhagad Fort",
        "Sinhagad Kalyan Darwaza",
    ],
    "Kondhaneshwar Temple": [
        "Kondhaneshwar Temple Sinhagad",
        "Kondhaneshwar Mandir Sinhagad Fort",
        "Sinhagad Kondhaneshwar Temple",
    ],
    "Pune darwaza": [
        "Pune Darwaza Sinhagad",
        "Pune Darwaja Sinhagad Fort",
        "Sinhagad Pune Darwaza",
    ],
    "Rajaram Samadhi": [
        "Rajaram Samadhi Sinhagad",
        "Chhatrapati Rajaram Samadhi Sinhagad",
        "Sinhagad Rajaram Maharaj Samadhi",
    ],
    "Tanaji Machi": [
        "Tanaji Machi Sinhagad",
        "Tanaji Malusare Samadhi Sinhagad",
        "Sinhagad Tanaji Kada",
        "Sinhagad Tanaji memorial",
    ],
}


def request_json(params: dict[str, str | int]) -> dict:
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{API_URL}?{query}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.loads(response.read().decode("utf-8"))


def search_titles(query: str, limit: int) -> list[str]:
    data = request_json(
        {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": limit,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    return [
        page["title"]
        for page in pages.values()
        if page.get("title", "").startswith("File:")
    ]


def get_image_info(title: str) -> dict | None:
    data = request_json(
        {
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        image_info = page.get("imageinfo", [])
        if image_info:
            return image_info[0]
    return None


def safe_extension(url: str) -> str:
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    return suffix if suffix in IMAGE_EXTENSIONS else ".jpg"


def output_name(label: str, url: str, extension: str) -> str:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    safe_label = label.lower().replace(" ", "_")
    return f"wikimedia_{safe_label}_{digest}{extension}"


def validate_image(path: Path) -> tuple[bool, str]:
    try:
        with Image.open(path) as image:
            width, height = image.size
            image.verify()
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            return False, f"too_small_{width}x{height}"
        return True, f"ok_{width}x{height}"
    except Exception as error:
        return False, f"invalid_{error}"


def download_image(url: str, output_path: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        content_type = response.headers.get("Content-Type", "").lower()
        if not content_type.startswith("image/"):
            raise ValueError(f"non-image content type: {content_type}")
        output_path.write_bytes(response.read())


def collect_label(raw_dir: Path, label: str, limit_per_query: int, target_total: int) -> list[dict[str, str]]:
    label_dir = raw_dir / label
    label_dir.mkdir(parents=True, exist_ok=True)
    existing_urls: set[str] = set()
    rows: list[dict[str, str]] = []

    for query in LABEL_QUERIES[label]:
        titles = search_titles(query, limit_per_query)
        print(f"{label}: {query} -> {len(titles)} candidates")

        for title in titles:
            current_count = len(
                [
                    item
                    for item in label_dir.iterdir()
                    if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS
                ]
            )
            if current_count >= target_total:
                return rows

            info = get_image_info(title)
            if not info or not info.get("url"):
                continue
            url = info["url"]
            if url in existing_urls:
                continue
            existing_urls.add(url)

            extension = safe_extension(url)
            target = label_dir / output_name(label, url, extension)
            if target.exists():
                continue

            status = "downloaded"
            message = ""
            try:
                download_image(url, target)
                valid, message = validate_image(target)
                if not valid:
                    status = "rejected"
                    target.unlink(missing_ok=True)
            except Exception as error:
                status = "failed"
                message = str(error)
                target.unlink(missing_ok=True)

            metadata = info.get("extmetadata", {})
            rows.append(
                {
                    "label": label,
                    "query": query,
                    "title": title,
                    "url": url,
                    "saved_path": str(target) if status == "downloaded" else "",
                    "status": status,
                    "message": message,
                    "license": metadata.get("LicenseShortName", {}).get("value", ""),
                    "artist": metadata.get("Artist", {}).get("value", ""),
                }
            )
            print(f"  {status}: {title} {message}")
            time.sleep(0.4)

    return rows


def write_report(rows: list[dict[str, str]]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "label",
        "query",
        "title",
        "url",
        "saved_path",
        "status",
        "message",
        "license",
        "artist",
    ]
    with REPORT_PATH.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect proper Sinhgad class images from Wikimedia Commons.")
    parser.add_argument("--data-dir", default=str(DEFAULT_RAW_DIR))
    parser.add_argument("--limit-per-query", type=int, default=20)
    parser.add_argument("--target-total", type=int, default=30)
    args = parser.parse_args()

    raw_dir = Path(args.data_dir)
    all_rows: list[dict[str, str]] = []
    for label in LABEL_QUERIES:
        all_rows.extend(collect_label(raw_dir, label, args.limit_per_query, args.target_total))

    write_report(all_rows)
    downloaded = sum(row["status"] == "downloaded" for row in all_rows)
    print(f"Downloaded {downloaded} usable images. Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
