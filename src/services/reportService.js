import apiClient from '../api/client';
export const getDailySummary = (params) => apiClient.get('/reports/daily-summary', { params }).then(r => r.data);
export const getRevenueByPeriod = (params) => apiClient.get('/reports/revenue-by-period', { params }).then(r => r.data);
export const getTopProducts = (params) => apiClient.get('/reports/top-products', { params }).then(r => r.data);
export const getBranchComparison = () => apiClient.get('/reports/branch-comparison').then(r => r.data);
export const getDateRangeReport = (params) => apiClient.get('/reports/date-range', { params }).then(r => r.data);

export const getProfitSummary = (params) => apiClient.get('/reports/profit-summary', { params }).then(r => r.data);
export const getProfitByProduct = (params) => apiClient.get('/reports/profit-by-product', { params }).then(r => r.data);
export const getProfitByCategory = (params) => apiClient.get('/reports/profit-by-category', { params }).then(r => r.data);
export const getProfitByBranch = (params) => apiClient.get('/reports/profit-by-branch', { params }).then(r => r.data);
export const getProfitTrend = (params) => apiClient.get('/reports/profit-trend', { params }).then(r => r.data);