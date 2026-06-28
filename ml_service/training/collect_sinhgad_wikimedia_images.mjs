import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rawDir =
  process.argv.includes("--data-dir")
    ? process.argv[process.argv.indexOf("--data-dir") + 1]
    : "C:\\Users\\91801\\OneDrive\\Desktop\\AI Heritage\\data\\raw\\Sinhgad";
const limitPerQuery =
  process.argv.includes("--limit-per-query")
    ? Number(process.argv[process.argv.indexOf("--limit-per-query") + 1])
    : 25;
const targetTotal =
  process.argv.includes("--target-total")
    ? Number(process.argv[process.argv.indexOf("--target-total") + 1])
    : 30;
const onlyLabel =
  process.argv.includes("--label")
    ? process.argv[process.argv.indexOf("--label") + 1]
    : "";

const apiUrl = "https://commons.wikimedia.org/w/api.php";
const userAgent = "TourVisionSinhgadDataset/1.0";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const labelQueries = {
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
};

async function requestJson(params) {
  const url = `${apiUrl}?${new URLSearchParams(params).toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function searchTitles(query, limit) {
  const data = await requestJson({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  const pages = data.query?.pages ?? {};
  return Object.values(pages)
    .map((page) => page.title)
    .filter((title) => title?.startsWith("File:"));
}

async function imageInfo(title) {
  const data = await requestJson({
    action: "query",
    format: "json",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  const pages = data.query?.pages ?? {};
  for (const page of Object.values(pages)) {
    if (page.imageinfo?.[0]?.url) return page.imageinfo[0];
  }
  return null;
}

function extensionFromUrl(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return imageExtensions.has(extension) ? extension : ".jpg";
}

function outputName(label, url) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const safeLabel = label.toLowerCase().replaceAll(" ", "_");
  return `wikimedia_${safeLabel}_${hash}${extensionFromUrl(url)}`;
}

async function currentImageCount(labelDir) {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(labelDir, { withFileTypes: true });
    return entries.filter(
      (entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()),
    ).length;
  } catch {
    return 0;
  }
}

async function downloadImage(url, outputPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`non-image content type ${contentType}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 25_000) throw new Error(`too small ${bytes.length} bytes`);
  await writeFile(outputPath, bytes);
}

async function collectLabel(label, queries) {
  const labelDir = path.join(rawDir, label);
  await mkdir(labelDir, { recursive: true });
  const rows = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const titles = await searchTitles(query, limitPerQuery);
    console.log(`${label}: ${query} -> ${titles.length} candidates`);

    for (const title of titles) {
      if ((await currentImageCount(labelDir)) >= targetTotal) return rows;

      const info = await imageInfo(title);
      if (!info?.url || seenUrls.has(info.url)) continue;
      seenUrls.add(info.url);

      const outputPath = path.join(labelDir, outputName(label, info.url));
      let status = "downloaded";
      let message = "";
      try {
        await downloadImage(info.url, outputPath);
      } catch (error) {
        status = "failed";
        message = error.message;
      }

      rows.push({
        label,
        query,
        title,
        url: info.url,
        saved_path: status === "downloaded" ? outputPath : "",
        status,
        message,
        license: info.extmetadata?.LicenseShortName?.value ?? "",
        artist: (info.extmetadata?.Artist?.value ?? "").replaceAll(/\s+/g, " ").slice(0, 200),
      });
      console.log(`  ${status}: ${title} ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const allRows = [];
for (const [label, queries] of Object.entries(labelQueries)) {
  if (onlyLabel && label !== onlyLabel) continue;
  allRows.push(...(await collectLabel(label, queries)));
}

const reportPath = path.resolve("models", "sinhgad_wikimedia_downloads.csv");
await mkdir(path.dirname(reportPath), { recursive: true });
const headers = ["label", "query", "title", "url", "saved_path", "status", "message", "license", "artist"];
const csv = [headers.join(","), ...allRows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
await writeFile(reportPath, csv, "utf8");
console.log(`Downloaded ${allRows.filter((row) => row.status === "downloaded").length} files. Report: ${reportPath}`);
