import apiClient from '../api/client';
export const login = (credentials) => apiClient.post('/auth/login', credentials).then(r => r.data);
export const changePassword = (data) => apiClient.put('/auth/change-password', data).then(r => r.data);
