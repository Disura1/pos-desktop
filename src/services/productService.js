import apiClient from "../api/client";
export const scanProductByBarcode = (barcode, branchId) =>
  apiClient
    .get(`/products/scan/${barcode}`, { params: { branchId } })
    .then((r) => r.data);
export const searchProducts = (q, branchId) =>
  apiClient
    .get("/products/search", { params: { q, branchId } })
    .then((r) => r.data);
export const getProductsByCategory = (catId) =>
  apiClient.get(`/products/category/${catId}`).then((r) => r.data);
export const getProductsByCategoryAndBranch = (catId, branchId) =>
  apiClient
    .get(`/products/category/${catId}/branch`, { params: { branchId } })
    .then((r) => r.data);
export const getProductsByCategoryWithStock = (catId, params) =>
  apiClient
    .get(`/products/category/${catId}/with-stock`, { params })
    .then((r) => r.data);
export const getVariants = (productId) =>
  apiClient.get(`/products/${productId}/variants`).then((r) => r.data);
export const getVariantsByBranch = (productId, branchId) =>
  apiClient
    .get(`/products/${productId}/variants/branch`, { params: { branchId } })
    .then((r) => r.data);
export const addProduct = (data) =>
  apiClient.post("/products", data).then((r) => r.data);
export const updateProduct = (id, data) =>
  apiClient.put(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) =>
  apiClient.delete(`/products/${id}`).then((r) => r.data);
export const addVariant = (data) =>
  apiClient.post("/products/variant", data).then((r) => r.data);
export const updateVariant = (id, data) =>
  apiClient.put(`/products/variant/${id}`, data).then((r) => r.data);
export const deleteVariant = (id) =>
  apiClient.delete(`/products/variant/${id}`).then((r) => r.data);
