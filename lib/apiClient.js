// API Client with automatic session handling
// This utility handles API calls and automatically redirects to login
// when the session is expired due to login from another device

export const apiClient = {
  // Make an authenticated API request
  async fetch(url, options = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle session expiry (logged out due to login from another device)
    if (response.status === 401 && data.sessionExpired) {
      // Clear all session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        
        // Show notification and redirect
        if (typeof window !== 'undefined') {
          // Use a custom event to notify the app about session expiry
          window.dispatchEvent(new CustomEvent('sessionExpired', { 
            detail: { message: data.error || 'Session expired. You have been logged out.' }
          }));
          
          // Redirect to login
          window.location.href = '/login?sessionExpired=true';
        }
      }
      
      throw new Error(data.error || 'Session expired');
    }

    return { response, data };
  },

  // GET request
  async get(url, options = {}) {
    return this.fetch(url, { ...options, method: 'GET' });
  },

  // POST request
  async post(url, body, options = {}) {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // PUT request
  async put(url, body, options = {}) {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // DELETE request
  async delete(url, options = {}) {
    return this.fetch(url, { ...options, method: 'DELETE' });
  },
};

// Helper function to check if user is logged in
export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

// Helper function to get current user
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

// Helper function to logout
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

