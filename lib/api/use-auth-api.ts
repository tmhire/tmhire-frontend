'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';

interface UseAuthApiOptions {
  baseUrl?: string;
}

export function useAuthApi(options: UseAuthApiOptions = {}) {
  const { data: session } = useSession();
  const [baseUrl] = useState(options.baseUrl || 'https://tmhire-backend.onrender.com');

  // Get the auth header from the session
  const getAuthHeader = useCallback((): Record<string, string> => {
    // @ts-expect-error - Custom property added by our NextAuth callback
    const token = session?.backendAccessToken;
    
    if (token) {
      console.log('Found auth token:', token.substring(0, 10) + '...');
      return { Authorization: `Bearer ${token}` };
    } else {
      console.log('No auth token available in session', session);
      return {};
    }
  }, [session]);

  // Helper function to create headers
  const createHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    const authHeader = getAuthHeader();
    if ('Authorization' in authHeader) {
      headers.Authorization = authHeader.Authorization;
    }
    
    return headers;
  }, [getAuthHeader]);

  // Fetch with authentication
  const fetchWithAuth = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      try {
        // console.log(`[useAuthApi] Making ${options.method} request to ${url}`);
        
        const fullOptions = {
          ...options,
          headers: {
            ...createHeaders(),
            ...(options.headers || {}),
          },
          mode: 'cors' as RequestMode,
          credentials: 'include' as RequestCredentials,
        };
        
        // console.log('[useAuthApi] Request headers:', fullOptions.headers);
        
        const response = await fetch(url, fullOptions);

        // console.log(`[useAuthApi] Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[useAuthApi] API Error (${response.status}): ${errorText}`);
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // console.log('[useAuthApi] Response data preview:', 
        //   typeof data === 'object' ? JSON.stringify(data).substring(0, 100) + '...' : data);
        return data;
      } catch (error) {
        console.error('[useAuthApi] Fetch error:', error);
        throw error;
      }
    },
    [createHeaders]
  );

  // API methods
  const get = useCallback(
    async <T,>(endpoint: string): Promise<T> => {
      const url = `${baseUrl}${endpoint}`;
      return fetchWithAuth<T>(url, { method: 'GET' });
    },
    [baseUrl, fetchWithAuth]
  );

  const post = useCallback(
    async <T, D extends Record<string, unknown>>(endpoint: string, data: D): Promise<T> => {
      const url = `${baseUrl}${endpoint}`;
      return fetchWithAuth<T>(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    [baseUrl, fetchWithAuth]
  );

  const put = useCallback(
    async <T, D extends Record<string, unknown>>(endpoint: string, data: D): Promise<T> => {
      const url = `${baseUrl}${endpoint}`;
      return fetchWithAuth<T>(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    [baseUrl, fetchWithAuth]
  );

  const del = useCallback(
    async <T,>(endpoint: string): Promise<T> => {
      const url = `${baseUrl}${endpoint}`;
      return fetchWithAuth<T>(url, { method: 'DELETE' });
    },
    [baseUrl, fetchWithAuth]
  );

  return {
    get,
    post,
    put,
    delete: del,
    // @ts-expect-error - Custom property added by our NextAuth callback
    isAuthenticated: !!session?.backendAccessToken,
  };
} 