import axios from 'axios';

// Shared axios instance. In development Vite proxies /api to the backend
// (see vite.config.js); in production the backend serves the frontend.
const api = axios.create({ baseURL: '/api' });

// Session data is kept in sessionStorage, so an admin and an employee can be
// logged in at the same time in two browser tabs.
const SESSION_KEYS = ['token', 'userId', 'role', 'name', 'email'];

export const saveSession = (data) => {
  SESSION_KEYS.forEach((key) => sessionStorage.setItem(key, data[key]));
};

export const getSession = () =>
  Object.fromEntries(SESSION_KEYS.map((key) => [key, sessionStorage.getItem(key)]));

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
};

export const logout = () => {
  clearSession();
  window.location.href = '/';
};

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or invalid token logs the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      logout();
    }
    return Promise.reject(error);
  }
);

// Returns the server's error message or a fallback
export const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

export default api;
