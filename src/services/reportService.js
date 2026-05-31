import apiClient from '../api/client';
export const getDailySummary = (params) => apiClient.get('/reports/daily-summary', { params }).then(r => r.data);
export const getRevenueByPeriod = (params) => apiClient.get('/reports/revenue-by-period', { params }).then(r => r.data);
export const getTopProducts = (params) => apiClient.get('/reports/top-products', { params }).then(r => r.data);
export const getBranchComparison = () => apiClient.get('/reports/branch-comparison').then(r => r.data);
export const getDateRangeReport = (params) => apiClient.get('/reports/date-range', { params }).then(r => r.data);
