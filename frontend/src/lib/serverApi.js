/**
 * Server-side data fetching helper for Next.js Server Components.
 * Uses native fetch (not localStorage-dependent).
 *
 * In Codespaces the public NEXT_PUBLIC_API_URL is an external https URL that
 * the browser needs, but the Next.js server process runs inside the same
 * container and can always reach the backend directly via localhost.
 * INTERNAL_API_URL lets us override the URL for server-side fetches only.
 */

// Server-side: prefer internal URL (localhost) so SSR works inside Codespaces
const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    next: { revalidate: options.revalidate ?? 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }

  return res.json();
}

// ── Hotels ────────────────────────────────────────────────────────────────────
export const serverHotelsApi = {
  getFeatured: (limit = 6) => apiFetch(`/hotels/featured?limit=${limit}`),
};

// ── Blog ──────────────────────────────────────────────────────────────────────
export const serverBlogApi = {
  list: (hotelId, page = 1, limit = 10) => apiFetch(`/blog/hotel/${hotelId}?page=${page}&limit=${limit}`),
  getBySlug: (hotelId, slug) => apiFetch(`/blog/hotel/${hotelId}/${slug}`),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const serverRoomsApi = {
  getTypes: (hotelId) => apiFetch(`/rooms/hotel/${hotelId}`),
  getTypeById: (id) => apiFetch(`/rooms/types/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const serverReviewsApi = {
  getStats: (hotelId) => apiFetch(`/reviews/hotel/${hotelId}/stats`),
  list: (hotelId, page = 1) => apiFetch(`/reviews/hotel/${hotelId}?page=${page}`),
};
