import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const login = (credentials) => API.post('/auth/login', credentials);
export const fetchReservations = () => API.get('/admin/reservations');
// Add more API calls as needed.
