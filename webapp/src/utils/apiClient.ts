/**
 * Unfugly Centralized API Client & Silent Token Refresher
 * Provides robust network communication, automatic 60-day session preservation,
 * and silent refresh retry to prevent premature auto-logouts on PWAs and mobile browsers.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Attempts silent token refresh via /api/v2/auth/refresh
 */
export async function silentRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const refreshToken = localStorage.getItem('unfugly_refresh_token');
  const existingToken = localStorage.getItem('unfugly_token');

  try {
    const res = await fetch(`${API_URL}/api/v2/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(existingToken ? { Authorization: `Bearer ${existingToken}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        refresh_token: refreshToken || undefined,
        refreshToken: refreshToken || undefined
      })
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const newToken = data.token || data.unfuglyToken || data.session?.access_token;
    const newRefresh = data.refreshToken || data.session?.refresh_token;

    if (newToken) {
      localStorage.setItem('unfugly_token', newToken);
    }
    if (newRefresh) {
      localStorage.setItem('unfugly_refresh_token', newRefresh);
    }

    return newToken || null;
  } catch {
    return null;
  }
}

/**
 * Enhanced fetch wrapper that attaches auth tokens, includes credentials,
 * and transparently intercepts 401s to perform silent token refresh before failing.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const getStoredToken = () => (typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') : null);

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const initialOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include'
  };

  const response = await fetch(url, initialOptions);

  // If unauthorized, attempt transparent silent refresh and retry
  if (response.status === 401 && typeof window !== 'undefined') {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await silentRefreshToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: options.credentials || 'include'
        });
      } else {
        onRefreshed(null);
        // Only redirect if refresh token is truly expired or invalid
        localStorage.removeItem('unfugly_token');
        localStorage.removeItem('unfugly_refresh_token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return response;
      }
    }

    // If a refresh is already in progress, wait for it to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        if (newToken) {
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          resolve(
            fetch(url, {
              ...options,
              headers: retryHeaders,
              credentials: options.credentials || 'include'
            })
          );
        } else {
          resolve(response);
        }
      });
    });
  }

  return response;
}
