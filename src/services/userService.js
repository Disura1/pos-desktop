import apiClient from '../api/client';
export const getUsers = () => apiClient.get('/users').then(r => r.data);
export const getRoles = () => apiClient.get('/users/roles').then(r => r.data);
export const createUser = (data) => apiClient.post('/users', data).then(r => r.data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data).then(r => r.data);
export const resetPassword = (id, data) => apiClient.put(`/users/${id}/reset-password`, data).then(r => r.data);
