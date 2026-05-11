import api from '../api/axiosInstance.js';
import { API_ROUTES } from '../utils/constants.js';

export async function submitKioskScan(payload) {
  const response = await api.post(API_ROUTES.KIOSK_SCAN, payload);
  return response.data.data;
}
