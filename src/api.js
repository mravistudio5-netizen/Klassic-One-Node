const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_KEY = "klassic_token";

/* =========================================================
   NORMAL API REQUEST
   ========================================================= */

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType =
    response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof data === "object"
        ? data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`
        : data ||
            `Request failed with status ${response.status}`
    );
  }

  return data;
};

/* =========================================================
   FILE UPLOAD
   ========================================================= */

export const apiUpload = async (
  endpoint,
  formData,
  options = {}
) => {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    method: options.method || "POST",
    headers,
    body: formData,
  });

  const contentType =
    response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof data === "object"
        ? data?.message ||
            data?.error ||
            `Upload failed with status ${response.status}`
        : data ||
            `Upload failed with status ${response.status}`
    );
  }

  return data;
};

/* =========================================================
   FILE URL
   ========================================================= */

export const getFileUrl = (uri) => {
  if (!uri) return "";

  if (/^https?:\/\//i.test(uri)) {
    return uri;
  }

  return `${API_URL}${uri.startsWith("/") ? uri : `/${uri}`}`;
};

/* =========================================================
   AUTH HELPERS
   ========================================================= */

export const getCurrentUser = async () => {
  const data = await apiFetch("/api/auth/me");
  return data.user;
};

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/* =========================================================
   EXPORT BASE URL
   ========================================================= */

export { API_URL };