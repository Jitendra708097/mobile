import api from '../api/axiosInstance.js';
import { API_ROUTES } from '../utils/constants.js';

export const submitRegularisation = async (body) => {
  const response = await api.post(API_ROUTES.REGULARISATION, body);
  return response.data.data;
};

export const fetchMyRegularisations = async (params = {}) => {
  const response = await api.get(`${API_ROUTES.REGULARISATION}/my`, { params });
  return response.data.data;
};
