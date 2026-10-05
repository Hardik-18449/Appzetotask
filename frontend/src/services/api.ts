import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enables HTTP-only cookies for secure authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Only persistent UI preferences (like active organization boundary) use localStorage
  const activeOrgId = localStorage.getItem('nexus_active_org_id');
  if (activeOrgId) {
    config.headers['x-organization-id'] = activeOrgId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);
