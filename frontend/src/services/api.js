import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const AUTH_STORAGE_KEYS = {
  token: 'token',
  username: 'username',
};

const api = axios.create({
  baseURL: API_URL,
});

function getStorageValue(key) {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || '';
}

function setStorageValue(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

function removeStorageValue(key) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

export const readStoredAuth = () => ({
  token: getStorageValue(AUTH_STORAGE_KEYS.token),
  username: getStorageValue(AUTH_STORAGE_KEYS.username),
});

export const persistStoredAuth = ({ token, username }) => {
  setStorageValue(AUTH_STORAGE_KEYS.token, token || '');
  setStorageValue(AUTH_STORAGE_KEYS.username, username || '');
};

export const clearStoredAuth = () => {
  removeStorageValue(AUTH_STORAGE_KEYS.token);
  removeStorageValue(AUTH_STORAGE_KEYS.username);
};

export const decodeJwtPayload = (token) => {
  const payload = String(token || '').split('.')[1];
  if (!payload) {
    return null;
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  return JSON.parse(atob(padded));
};

export const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

export const getDownloadUrl = (documentId) => `${API_URL}/documents/${documentId}/download`;

export default api;
