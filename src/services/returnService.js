import apiClient from '../api/client';
export const lookupSaleForReturn = (receiptNumber) =>
  apiClient.get('/returns/lookup', { params: { receiptNumber } }).then(r => r.data);
export const processReturn = (data) =>
  apiClient.post('/returns', data).then(r => r.data);
export const getReturnHistory = (params) =>
  apiClient.get('/returns/history', { params }).then(r => r.data);
export const searchSalesForReturn = (query) =>
  apiClient.get('/returns/search', { params: { query } }).then(r => r.data);