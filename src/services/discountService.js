import apiClient from '../api/client';
export const getAllDiscounts = () => apiClient.get('/discounts').then(r => r.data);
export const getActiveDiscounts = () => apiClient.get('/discounts/active').then(r => r.data);
export const createDiscount = (data) => apiClient.post('/discounts', data).then(r => r.data);
export const updateDiscount = (id, data) => apiClient.put(`/discounts/${id}`, data).then(r => r.data);
export const deleteDiscount = (id) => apiClient.delete(`/discounts/${id}`).then(r => r.data);
