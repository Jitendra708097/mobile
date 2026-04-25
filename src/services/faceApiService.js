import api from '../api/axiosInstance.js';
import { API_ROUTES } from '../utils/constants.js';

export async function getFaceEnrollmentStatusRequest(employeeId) {
  const response = await api.get(`${API_ROUTES.FACE_ENROLL_STATUS}/${employeeId}`);
  return response.data.data;
}
