import apiClient from '../api/client';
export const getBranches = () => apiClient.get('/branches').then(r => r.data);
export const getBranchStats = (id) => apiClient.get(`/branches/${id}/stats`).then(r => r.data);
export const createBranch = (data) => apiClient.post('/branches', data).then(r => r.data);
export const updateBranch = (id, data) => apiClient.put(`/branches/${id}`, data).then(r => r.data);
export const deleteBranch = (id) => apiClient.delete(`/branches/${id}`).then(r => r.data);
