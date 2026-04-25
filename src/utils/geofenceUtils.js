/**
 * @module geofenceUtils
 * @description Polygon-based geofencing using Ray Casting algorithm
 *              Checks if a user's GPS point is inside an office boundary polygon
 */

/**
 * Normalize a point to {lat: number, lng: number}
 * @param {{lat: number, lng: number}} point
 * @returns {{lat: number, lng: number} | null}
 */
const normalizePoint = (point) => {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return null;
  }
  return { lat: point.lat, lng: point.lng };
};

/**
 * Normalize polygon - handle nested arrays or flat array
 * @param {Array} polygon
 * @returns {Array<{lat: number, lng: number}>}
 */
const normalizePolygon = (polygon) => {
  if (!polygon) return [];
  
  // Handle nested array case [[{lat, lng}, ...]]
  if (Array.isArray(polygon?.[0]?.[0])) {
    return polygon[0];
  }
  
  return polygon || [];
};

/**
 * Check if a point lies exactly on a line segment (within tolerance)
 * @param {{lat: number, lng: number}} point
 * @param {{lat: number, lng: number}} p1
 * @param {{lat: number, lng: number}} p2
 * @param {number} tolerance
 * @returns {boolean}
 */
const isPointOnSegment = (point, p1, p2, tolerance = 0.00001) => {
  const { lat, lng } = point;
  const minLat = Math.min(p1.lat, p2.lat);
  const maxLat = Math.max(p1.lat, p2.lat);
  const minLng = Math.min(p1.lng, p2.lng);
  const maxLng = Math.max(p1.lng, p2.lng);

  // Point outside bounding box
  if (
    lat < minLat - tolerance ||
    lat > maxLat + tolerance ||
    lng < minLng - tolerance ||
    lng > maxLng + tolerance
  ) {
    return false;
  }

  // Vertical line
  if (Math.abs(p1.lat - p2.lat) < tolerance) {
    return Math.abs(point.lat - p1.lat) < tolerance;
  }

  // Horizontal line
  if (Math.abs(p1.lng - p2.lng) < tolerance) {
    return Math.abs(point.lng - p1.lng) < tolerance;
  }

  // General case - check if point is on line
  const slope = (p2.lng - p1.lng) / (p2.lat - p1.lat);
  const expectedLng = p1.lng + slope * (point.lat - p1.lat);
  return Math.abs(point.lng - expectedLng) < tolerance;
};

/**
 * Ray Casting Algorithm - Check if point is inside polygon
 * Uses odd-even rule: if ray crosses odd number of edges, point is inside
 * 
 * @param {{lat: number, lng: number}} point - User GPS location
 * @param {Array<{lat: number, lng: number}>} polygon - Boundary polygon coordinates
 * @returns {boolean} - True if point is inside polygon
 * 
 * @example
 * const point = { lat: 28.6139, lng: 77.2090 };
 * const polygon = [
 *   { lat: 28.6100, lng: 77.2000 },
 *   { lat: 28.6100, lng: 77.2200 },
 *   { lat: 28.6200, lng: 77.2200 },
 *   { lat: 28.6200, lng: 77.2000 },
 * ];
 * const inside = isInsidePolygon(point, polygon); // true
 */
export const isInsidePolygon = (point, polygon = []) => {
  const normalizedPoint = normalizePoint(point);
  const normalizedPolygon = normalizePolygon(polygon);

  // Validation
  if (!normalizedPoint || normalizedPolygon.length < 3) {
    return false;
  }

  let inside = false;

  // Iterate through polygon edges
  for (let i = 0, j = normalizedPolygon.length - 1; i < normalizedPolygon.length; j = i++) {
    const current = normalizedPolygon[i];
    const previous = normalizedPolygon[j];

    // Check if point is on segment boundary
    if (isPointOnSegment(normalizedPoint, previous, current)) {
      return true;
    }

    // Ray casting: check if horizontal ray from point crosses edge
    const intersects =
      current.lat > normalizedPoint.lat !== previous.lat > normalizedPoint.lat &&
      normalizedPoint.lng <
        ((previous.lng - current.lng) * (normalizedPoint.lat - current.lat)) /
          ((previous.lat - current.lat) || Number.EPSILON) +
          current.lng;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Calculate centroid (center point) of polygon for display purposes
 * @param {Array<{lat: number, lng: number}>} polygon
 * @returns {{lat: number, lng: number} | null}
 */
export const calculatePolygonCentroid = (polygon = []) => {
  const normalized = normalizePolygon(polygon);
  
  if (normalized.length === 0) {
    return null;
  }

  let sumLat = 0;
  let sumLng = 0;

  for (const point of normalized) {
    sumLat += point.lat;
    sumLng += point.lng;
  }

  return {
    lat: sumLat / normalized.length,
    lng: sumLng / normalized.length,
  };
};

/**
 * Validate polygon has minimum 3 points
 * @param {Array} polygon
 * @returns {boolean}
 */
export const isValidPolygon = (polygon) => {
  const normalized = normalizePolygon(polygon);
  return normalized.length >= 3;
};

export default {
  isInsidePolygon,
  calculatePolygonCentroid,
  isValidPolygon,
};
