import api from '../api/axiosInstance.js';

export async function loginRequest(payload) {
  const response = await api.post('/auth/login', payload, { skipAuth: true });
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

export async function forgotPasswordRequest(payload) {
  const response = await api.post('/auth/forgot-password', payload, { skipAuth: true });
  return response.data.data;
}

export async function resetPasswordRequest(payload) {
  const response = await api.post('/auth/reset-password', payload, { skipAuth: true });
  return response.data.data;
}
