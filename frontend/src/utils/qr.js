export function parsePlaceIdFromQr(decodedText) {
  const rawText = String(decodedText || '').trim();
  let placeId = null;

  try {
    const parsed = JSON.parse(rawText);
    placeId = parsed.qr_id || parsed.qrId || parsed.place_id || parsed.placeId || null;
  } catch {
    // Non-JSON QR formats are handled below.
  }

  if (!placeId && rawText.includes('/qr-heritage/')) {
    placeId = rawText.split('/qr-heritage/')[1];
  }

  if (!placeId && rawText.includes('/place/')) {
    placeId = rawText.split('/place/')[1];
  }

  if (!placeId) {
    placeId = rawText;
  }

  return String(placeId || '')
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, '')
    .trim();
}

const IMAGE_RESULT_ALIASES = {
  rajgad: 'rajgad',
  'rajgad-fort': 'rajgad',
  sinhagad: 'sinhagad',
  'sinhagad-fort': 'sinhagad',
  'shaniwar-wada': 'shaniwar-wada',
  'shaniwar-wada-fort': 'shaniwar-wada'
};

export function slugifyPlaceId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parsePlaceIdFromImageResult(result) {
  if (!result) {
    return '';
  }

  const payload = result.data || result.result || result.prediction || result;
  const source =
    payload.place_id ||
    payload.placeId ||
    payload.id ||
    payload.slug ||
    payload.name ||
    payload.label ||
    payload.classification ||
    payload.class_name ||
    payload.className ||
    '';

  const slug = slugifyPlaceId(source);
  return IMAGE_RESULT_ALIASES[slug] || slug;
}
