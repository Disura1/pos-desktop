import apiClient from '../api/client';
export const getInventory = (params) => apiClient.get('/stock/inventory', { params }).then(r => r.data);
export const getLowStock = (params) => apiClient.get('/stock/low-stock', { params }).then(r => r.data);
export const getMovements = (params) => apiClient.get('/stock/movements', { params }).then(r => r.data);
export const receiveStock = (data) => apiClient.post('/stock/receive', data).then(r => r.data);
export const adjustStock = (data) => apiClient.post('/stock/adjust', data).then(r => r.data);
export const transferStock = (data) => apiClient.post('/stock/transfer', data).then(r => r.data);
export const updateThreshold = (data) => apiClient.put('/stock/threshold', data).then(r => r.data);
