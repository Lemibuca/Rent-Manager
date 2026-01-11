// frontend/src/api/client.js

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
console.log("API URL =", API);

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API}${path}`, {
    method: options.method || "GET",
    headers: {
      // ❗ SOLO usar JSON header cuando NO es FormData
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  // Try to read response safely
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  baseUrl: API,

  // JSON requests
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  del: (path) =>
    request(path, {
      method: "DELETE",
    }),

  // ✅ Multipart / file upload
  upload: (path, formData) =>
    request(path, {
      method: "POST",
      body: formData, // DO NOT stringify
    }),
};
