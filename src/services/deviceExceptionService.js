import api from '../api/axiosInstance.js';

export async function getMyDeviceExceptions() {
  const response = await api.get('/employees/device-exceptions/mine');
  return response.data.data;
}
