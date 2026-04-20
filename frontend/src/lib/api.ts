const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');

interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Endpoints where a 401 is a genuine credential failure — never trigger a refresh retry.
function isNoRefreshEndpoint(endpoint: string): boolean {
  return (
    endpoint.startsWith('/auth/refresh') ||
    endpoint.startsWith('/auth/login') ||
    endpoint.startsWith('/auth/register') ||
    endpoint.startsWith('/auth/forgot') ||
    endpoint.startsWith('/auth/reset')
  );
}

// Silently exchange the httpOnly refresh cookie for a fresh access cookie.
async function tryRefreshSession(): Promise<boolean> {
  try {
    const csrfToken = getCookie('csrf-token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function api(endpoint: string, options: FetchOptions = {}, _retried = false): Promise<any> {
  const { method = 'GET', body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const csrfToken = getCookie('csrf-token');
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    requestHeaders['x-csrf-token'] = csrfToken;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  // Access cookie likely expired — refresh once, then replay the request.
  if (res.status === 401 && !_retried && !isNoRefreshEndpoint(endpoint)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return api(endpoint, options, true);
    }
    // Refresh failed too — the session is truly dead. Wipe cookies via
    // the logout endpoint (which tolerates no-auth) and force a fresh sign-in,
    // otherwise the SPA gets stuck in a "logged in but every call 401s" loop.
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      try {
        const csrf = getCookie('csrf-token');
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: csrf ? { 'x-csrf-token': csrf } : {},
        });
      } catch { /* best effort */ }
      window.location.href = '/login?error=session_expired';
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : { message: `API request failed with status ${res.status}` };

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const auth = {
  register: (data: any) => api('/auth/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string; totpCode?: string; captchaId?: string; captchaAnswer?: string }) =>
    api('/auth/login', { method: 'POST', body: data }),
  getCaptcha: () => api('/auth/captcha'),
  exportMyData: async () => {
    // Fetch directly so we can stream the download instead of parsing JSON in memory.
    const res = await fetch(`${API_BASE}/auth/me/export`, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not export data');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nepon-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  logout: () => api('/auth/logout', { method: 'POST' }),
  getMe: () => api('/auth/me'),
  updateProfile: (data: any) => api('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (data: any) => api('/auth/change-password', { method: 'PUT', body: data }),
  verifyEmail: (token: string) => api(`/auth/verify-email/${token}`),
  forgotPassword: (email: string) => api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api(`/auth/reset-password/${token}`, { method: 'POST', body: { password } }),
  mfaSetup: () => api('/auth/mfa/enable', { method: 'POST' }),
  mfaVerify: (secret: string, code: string) =>
    api('/auth/mfa/verify', { method: 'POST', body: { secret, code } }),
  mfaDisable: (password: string, totpCode: string) =>
    api('/auth/mfa/disable', { method: 'POST', body: { password, totpCode } }),
};

export const products = {
  list: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/products${query}`);
  },
  get: (idOrSlug: string) => api(`/products/${idOrSlug}`),
  create: (data: any) => api('/products', { method: 'POST', body: data }),
  update: (id: string, data: any) => api(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
  getMyProducts: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/products/seller/mine${query}`);
  },
};

export const cart = {
  get: () => api('/cart'),
  addItem: (data: any) => api('/cart/items', { method: 'POST', body: data }),
  updateItem: (itemId: string, quantity: number) => api(`/cart/items/${itemId}`, { method: 'PUT', body: { quantity } }),
  removeItem: (itemId: string) => api(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => api('/cart', { method: 'DELETE' }),
  merge: () => api('/cart/merge', { method: 'POST' }),
};

export const checkout = {
  createSession: (data: any) => api('/checkout/session', { method: 'POST', body: data }),
  getSummary: () => api('/checkout/summary'),
};

export const orders = {
  list: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/orders${query}`);
  },
  get: (id: string) => api(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  cancel: (id: string) => api(`/orders/${id}/cancel`, { method: 'POST' }),
  getTimeline: (id: string) => api(`/orders/${id}/timeline`),
};

export const reviews = {
  getProductReviews: (productId: string) => api(`/reviews/product/${productId}`),
  create: (data: any) => api('/reviews', { method: 'POST', body: data }),
  getMyReviews: () => api('/reviews/mine'),
  update: (id: string, data: any) => api(`/reviews/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api(`/reviews/${id}`, { method: 'DELETE' }),
};

export const categories = {
  list: () => api('/categories'),
  create: (data: any) => api('/categories', { method: 'POST', body: data }),
};

export const admin = {
  getSellerApplications: () => api('/admin/sellers/pending'),
  approveSeller: (id: string) => api(`/admin/sellers/${id}/approve`, { method: 'PATCH' }),
  rejectSeller: (id: string) => api(`/admin/sellers/${id}/reject`, { method: 'PATCH' }),
  getUsers: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/admin/users${query}`);
  },
  suspendUser: (id: string) => api(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
  reactivateUser: (id: string) => api(`/admin/users/${id}/reactivate`, { method: 'PATCH' }),
  getAuditLogs: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/admin/audit-logs${query}`);
  },
  getSecurityDashboard: () => api('/admin/security'),
  getAnalytics: () => api('/admin/analytics'),
};

export const notifications = {
  list: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api(`/notifications${query}`);
  },
  markAsRead: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => api('/notifications/read-all', { method: 'PATCH' }),
  getUnreadCount: () => api('/notifications/unread-count'),
};

export const wishlist = {
  get: () => api('/wishlist'),
  addItem: (productId: string) => api('/wishlist/items', { method: 'POST', body: { productId } }),
  removeItem: (productId: string) => api(`/wishlist/items/${productId}`, { method: 'DELETE' }),
  clear: () => api('/wishlist', { method: 'DELETE' }),
};

export const recommendations = {
  getForUser: (userId: string, k?: number) => {
    const query = k ? `?k=${k}` : '';
    return api(`/ml/recommend/${userId}${query}`);
  },
  getSimilar: (productId: string, k?: number) => {
    const query = k ? `?k=${k}` : '';
    return api(`/ml/similar/${productId}${query}`);
  },
  retrain: () => api('/ml/retrain', { method: 'POST' }),
  health: () => api('/ml/health'),
};

export const interactions = {
  track: (productId: string, type: 'view' | 'click' | 'search', metadata?: any) =>
    api('/interactions/track', { method: 'POST', body: { productId, type, metadata } }),
  history: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api(`/interactions/history${query}`);
  },
};
