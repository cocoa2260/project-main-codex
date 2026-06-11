import axios from 'axios';
import { clearAuth, getToken, getTokenType } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    const tokenType = getTokenType();
    config.headers.Authorization = `${tokenType.charAt(0).toUpperCase()}${tokenType.slice(1)} ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
    }

    return Promise.reject(error);
  },
);
