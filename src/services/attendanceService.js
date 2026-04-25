import api from '../api/axiosInstance.js';
import { API_ROUTES } from '../utils/constants.js';

export async function requestAttendanceChallenge() {
  const response = await api.post(API_ROUTES.REQUEST_CHECKIN);
  return response.data.data;
}

export async function getTodayAttendanceStatus() {
  const response = await api.get(API_ROUTES.ATTENDANCE_STATUS);
  return response.data.data;
}

export async function checkInRequest(payload) {
  const response = await api.post(API_ROUTES.CHECKIN, payload);
  return response.data.data;
}

export async function checkOutRequest(payload) {
  const response = await api.post(API_ROUTES.CHECKOUT, payload);
  return response.data.data;
}

export async function undoCheckoutRequest() {
  const response = await api.post(API_ROUTES.CHECKOUT_UNDO);
  return response.data.data;
}

/**
 * Fetch current branch geofence polygon
 * @returns {Promise<{geo_fence_polygons: Array}>}
 */
export async function getBranchGeofence() {
  const response = await api.get('/branches/current/geofence');
  return response.data.data;
}
