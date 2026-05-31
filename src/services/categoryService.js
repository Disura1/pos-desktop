import apiClient from '../api/client';
export const getCategories = () => apiClient.get('/categories').then(r => r.data);
export const addCategory = (data) => apiClient.post('/categories', data).then(r => r.data);
export const updateCategory = (id, data) => apiClient.put(`/categories/${id}`, data).then(r => r.data);
export const deleteCategory = (id) => apiClient.delete(`/categories/${id}`).then(r => r.data);
