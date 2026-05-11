import api from '../api/axiosInstance.js';

export async function getMyDeviceExceptions() {
  const response = await api.get('/employees/device-exceptions/mine');
  return response.data.data;
}

export async function requestDeviceException({ tempDeviceId, reason }) {
  const response = await api.post('/employees/device-exceptions/request', {
    tempDeviceId,
    reason,
  });
  return response.data.data;
}
