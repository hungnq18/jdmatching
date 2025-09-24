import axios from 'axios';

// Sử dụng import.meta.env thay vì process.env cho Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (!response) {
      console.error('🌐 Network Error - Server might be down or CORS issue');
      console.error('Error details:', error.message);
      console.error('Request URL:', error.config?.url);
    } else {
      console.error('🌐 API Error:', response.status, response.statusText);
      console.error('Error details:', response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
