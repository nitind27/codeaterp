'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for making authenticated API calls with automatic session expiry handling
 * When session expires (logged in from another device), automatically redirects to login
 */
export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle session expiry (logged out due to login from another device)
      if (response.status === 401 && data.sessionExpired) {
        // Clear all session data
        localStorage.removeItem('token');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        
        // Show notification
        toast.error('You have logged in from another device. This session has expired.', { duration: 5000 });

        // Redirect to login
        router.push('/login?sessionExpired=true');
        
        return { success: false, sessionExpired: true, error: data.error };
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }, [router]);

  // Helper methods
  const get = useCallback((url, options = {}) => {
    return authFetch(url, { ...options, method: 'GET' });
  }, [authFetch]);

  const post = useCallback((url, body, options = {}) => {
    return authFetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }, [authFetch]);

  const put = useCallback((url, body, options = {}) => {
    return authFetch(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }, [authFetch]);

  const del = useCallback((url, options = {}) => {
    return authFetch(url, { ...options, method: 'DELETE' });
  }, [authFetch]);

  return { authFetch, get, post, put, delete: del };
}

/**
 * Helper function for non-hook contexts
 * Use this when you can't use hooks (like in event handlers outside components)
 */
export async function checkSessionExpiry(response, data) {
  if (response.status === 401 && data.sessionExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    window.location.href = '/login?sessionExpired=true';
    return true;
  }
  return false;
}

