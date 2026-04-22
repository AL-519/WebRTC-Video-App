// frontend/lib/api.ts
import axios from 'axios';

// In production, this will point to your deployed backend URL via .env.local
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Automatically attach the JWT token to every request if it exists
api.interceptors.request.use((config) => {
    // Ensure we are running on the client-side before accessing localStorage
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});