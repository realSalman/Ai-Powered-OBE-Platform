import axios from 'axios';
import { auth } from './firebase';
import { ApiResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (auth?.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('Error fetching Firebase auth token:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Generic response helpers
export async function apiGet<T>(url: string, params?: any): Promise<ApiResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  return response.data;
}

export async function apiPost<T>(url: string, data?: any): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiPut<T>(url: string, data?: any): Promise<ApiResponse<T>> {
  const response = await apiClient.put<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<ApiResponse<T>>(url);
  return response.data;
}

export function getErrorMessage(err: any, defaultMsg: string): string {
  const errObj = err.response?.data?.error;
  if (!errObj) {
    return err.response?.data?.message || err.message || defaultMsg;
  }
  
  if (errObj.code === 'VALIDATION_ERROR' && errObj.details) {
    const details = errObj.details;
    const firstKey = Object.keys(details)[0];
    if (firstKey) {
      const fieldError = details[firstKey];
      if (Array.isArray(fieldError)) {
        return fieldError[0] || errObj.message;
      }
      if (typeof fieldError === 'string') {
        return fieldError || errObj.message;
      }
    }
  }
  
  return errObj.message || defaultMsg;
}
