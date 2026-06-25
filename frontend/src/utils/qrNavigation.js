import toast from 'react-hot-toast';
import { scanQr } from '../api/placeApi';
import { extractData } from '../api/responseUtils';
import { parsePlaceIdFromQr } from './qr';

export async function openQrHeritagePage(decodedText, navigate) {
  const qrId = parsePlaceIdFromQr(decodedText);

  if (!qrId) {
    toast.error('Invalid QR');
    return false;
  }

  try {
    const response = await scanQr({ qr_id: qrId });
    const data = extractData(response);
    const place = data?.place || {};
    const placeId = data?.place_id || data?.placeId || place.place_id || place.slug || qrId;

    toast.success('Opening heritage information.');
    navigate(`/qr-heritage/${encodeURIComponent(placeId)}`, {
      state: { scannedPlace: place }
    });
    return true;
  } catch (error) {
    console.error('QR scan failed:', error);
    toast.error('No heritage place found for this QR');
    return false;
  }
}
