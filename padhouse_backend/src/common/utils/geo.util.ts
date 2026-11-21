import { GOVERNORATES, STORE_HUB } from '../data/palestine';

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Average intercity courier speed (km/h) used to derive an AVG ETA from distance. */
export const AVG_COURIER_SPEED_KMH = 40;

/** Fixed handling/preparation overhead added to every distance-based ETA (minutes). */
export const BASE_HANDLING_MINUTES = 30;

/** Great-circle distance between two coordinates in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth radius (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Resolves approximate coordinates from a free-text place name (city / hub). */
export function resolveCoordinates(place?: string | null): Coordinates | null {
  if (!place) return null;
  const normalized = place.trim();
  if (!normalized) return null;

  if (
    normalized.includes('بادهاوس') ||
    normalized.toLowerCase().includes('padhouse') ||
    normalized.includes(STORE_HUB.name)
  ) {
    return { lat: STORE_HUB.lat, lng: STORE_HUB.lng };
  }

  for (const governorate of GOVERNORATES) {
    for (const city of governorate.cities) {
      if (city.lat === undefined || city.lng === undefined) continue;
      if (normalized.includes(city.name) || city.name.includes(normalized)) {
        return { lat: city.lat, lng: city.lng };
      }
    }
  }
  return null;
}

/**
 * Distance-based average ETA (minutes). Returns null when coordinates are missing
 * so callers can keep an "unknown" state instead of a misleading number.
 */
export function computeAutoEtaMinutes(
  origin: Coordinates | null,
  destination: Coordinates | null,
): { distanceKm: number; autoEtaMinutes: number } | null {
  if (!origin || !destination) return null;
  const distanceKm = Math.round(haversineKm(origin, destination) * 10) / 10;
  const autoEtaMinutes = Math.round(
    (distanceKm / AVG_COURIER_SPEED_KMH) * 60 + BASE_HANDLING_MINUTES,
  );
  return { distanceKm, autoEtaMinutes };
}
