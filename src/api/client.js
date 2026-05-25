import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 5000, // Increased for real-world network stability
});

export default apiClient;