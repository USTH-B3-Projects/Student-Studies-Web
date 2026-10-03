import { API_BASE } from "../config.js";

async function request(method, endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    const error = new Error(
      body?.error || body?.message || response.statusText || "API error",
    );
    error.status = response.status;
    throw error;
  }
  return body;
}

export const get = (endpoint) => request("GET", endpoint);
export const post = (endpoint, data) => request("POST", endpoint, data);
export const put = (endpoint, data) => request("PUT", endpoint, data);
export const patch = (endpoint, data) => request("PATCH", endpoint, data);
export const del = (endpoint) => request("DELETE", endpoint);
