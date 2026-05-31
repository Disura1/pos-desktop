import apiClient from '../api/client';
export const processCheckout = (payload) => apiClient.post('/sales/checkout', payload).then(r => r.data);
export const getSaleHistory = (params) => apiClient.get('/sales/history', { params }).then(r => r.data);
export const getSaleDetail = (id) => apiClient.get(`/sales/${id}`).then(r => r.data);
