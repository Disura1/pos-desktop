import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

export const scanProductByBarcode = async (barcode) => {
  const res = await axios.get(`${API_URL}/scan/${barcode}`);
  return res.data;
};

export const getProductsByCategory = async (catId) => {
  const res = await axios.get(`${API_URL}/category/${catId}`);
  return res.data;
};

export const addProduct = async (data) => {
  const res = await axios.post(API_URL, data);
  return res.data;
};

// ADD THESE TWO FUNCTIONS:
export const updateProduct = async (id, data) => {
  const res = await axios.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await axios.delete(`${API_URL}/${id}`);
  return res.data;
};

export const addVariant = async (variantData) => {
  const res = await axios.post(`${API_URL}/variants`, variantData);
  return res.data;
};
