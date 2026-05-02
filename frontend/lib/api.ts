// frontend/lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

// 1. Point to the /api prefix we set up in main.py
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, 
});

// 2. Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- AUTH ROUTES ---
export const requestOtp = async (email: string) => {
    const response = await api.post('/auth/request-otp', { email });
    return response.data;
};

export const verifyOtp = async (email: string, otp: string, name: string, username: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp, name, username });
    return response.data;
};

// --- ROOM ROUTES ---
export const createRoom = async () => {
    // This now hits POST /api/rooms/create with the Bearer token attached
    const response = await api.post('/rooms/create');
    return response.data;
};

export default api;