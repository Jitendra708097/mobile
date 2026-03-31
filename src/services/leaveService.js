import api from '../api/axiosInstance.js';
import { API_ROUTES } from '../utils/constants.js';

export const getLeaveBalance = async () => {
  const response = await api.get(API_ROUTES.LEAVE_BALANCE);
  return response.data.data;
};

export const getLeaveHistory = async (params = {}) => {
  const response = await api.get(API_ROUTES.LEAVE_HISTORY, { params });
  return response.data.data;
};

export const applyLeave = async (body) => {
  const response = await api.post(API_ROUTES.LEAVE_APPLY, body);
  return response.data.data;
};

export const cancelLeave = async (leaveId) => {
  const response = await api.delete(API_ROUTES.LEAVE_CANCEL.replace(':id', leaveId));
  return response.data.data;
};
