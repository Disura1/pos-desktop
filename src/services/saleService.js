import apiClient from '../api/client';

export const processCheckout = async (payload) => {
  const response = await apiClient.post('/sales/checkout', payload);
  return response.data;
};

export const getDailyReport = async () => {
  const response = await apiClient.get('/reports/daily-summary');
  return response.data;
};