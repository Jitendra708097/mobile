import api from '../api/axiosInstance.js';

export async function loginRequest(payload) {
  console.log("Hello");
  const response = await api.post('/auth/login', payload);
  console.log(response);
  return response.data.data;
}

export async function refreshRequest(refreshToken) {
  const response = await api.post('/auth/refresh', { refreshToken });
  return response.data.data;
}

export async function logoutRequest(refreshToken) {
  const response = await api.post('/auth/logout', { refreshToken });
  return response.data.data;
}

export async function changePasswordRequest(payload) {
  const response = await api.post('/auth/change-password', payload);
  return response.data.data;
}
