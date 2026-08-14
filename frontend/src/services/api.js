import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

  return (
    window.localStorage.getItem(key) ||
    window.sessionStorage.getItem(key) ||
    ''
  );
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
  try {
    const payload = String(token || '').split('.')[1];

    if (!payload) {
      return null;
    }

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '='
    );

    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
};

export const getAuthHeaders = (token) => {
  const t = token || readStoredAuth().token;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Automatic Axios Request Interceptor: injects Bearer token if present
api.interceptors.request.use(
  (config) => {
    const { token } = readStoredAuth();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatic Axios Response Interceptor: handles 401/403 token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        clearStoredAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getDownloadUrl = (documentId) =>
  `${API_URL}/documents/${documentId}/download`;

export const getFileFormat = (doc) => {
  if (!doc) return 'pdf';
  if (doc.fileFormat) return doc.fileFormat.toLowerCase();
  const ext = String(doc.originalFileName || '').split('.').pop();
  return (ext || 'pdf').toLowerCase();
};

export const getFilePreviewUrl = (doc) => {
  if (!doc || !doc.cloudinaryUrl) return '#';
  const format = getFileFormat(doc);
  if (format === 'doc' || format === 'docx') {
    // Google Docs Viewer for instant in-browser preview of Word documents
    return `https://docs.google.com/viewer?url=${encodeURIComponent(doc.cloudinaryUrl)}&embedded=true`;
  }
  return doc.cloudinaryUrl;
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Returns true when an Axios request was intentionally cancelled.
export const isRequestCancelled = (error) => {
  return (
    axios.isCancel(error) ||
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError'
  );
};

export default api;