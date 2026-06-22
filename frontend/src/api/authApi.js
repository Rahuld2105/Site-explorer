import axiosInstance from './axiosInstance';

// Authentication endpoints for JWT-based session handling.
export const login = (payload) => axiosInstance.post('/auth/login', payload);

export const signup = (payload) => axiosInstance.post('/auth/signup', payload);

export const getMe = () => axiosInstance.get('/auth/me');

export const getProfileDashboard = () => axiosInstance.get('/auth/profile/dashboard');

export const logout = () => axiosInstance.post('/auth/logout');
