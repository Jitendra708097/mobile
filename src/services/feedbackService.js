import api from '../api/axiosInstance.js';

export async function submitFeedback({ rating, feedbackType, message, appContext = {} }) {
  const response = await api.post('/feedback', {
    rating,
    feedbackType,
    message,
    appContext,
  });
  return response.data.data;
}
