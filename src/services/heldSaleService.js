import apiClient from '../api/client';
export const holdSale = (payload) => apiClient.post('/held-sales', payload).then(r => r.data);
export const getHeldSales = () => apiClient.get('/held-sales').then(r => r.data);
export const resumeSale = (id) => apiClient.post(`/held-sales/${id}/resume`).then(r => r.data);
export const deleteHeldSale = (id) => apiClient.delete(`/held-sales/${id}`).then(r => r.data);