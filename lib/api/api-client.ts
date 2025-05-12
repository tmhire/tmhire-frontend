// API client with authentication
import { getSession } from "next-auth/react";

interface ApiClientOptions {
  baseUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || "http://127.0.0.1:8000";
    console.log("API Client initialized with base URL:", this.baseUrl);
  }

  private async getHeaders(): Promise<HeadersInit> {
    const session = await getSession();
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // @ts-expect-error - Custom property added by our callback
    if (session?.backendAccessToken) {
      // @ts-expect-error - Custom property added by our callback
      headers["Authorization"] = `Bearer ${session.backendAccessToken}`;
      console.log("Adding Authorization header:", headers["Authorization"].substring(0, 15) + "...");
    } else {
      console.log("No authorization token available in session", session);
    }

    return headers;
  }

  // Helper to create a fetch request with proper error handling
  private async fetchWithAuth<T>(
    url: string, 
    options: RequestInit
  ): Promise<T> {
    console.log(`Making ${options.method} request to ${url}`);
    console.log("Request options:", {
      method: options.method,
      headers: options.headers,
      hasBody: !!options.body,
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        mode: "cors", // Explicitly set CORS mode
        credentials: "include", // Include credentials (cookies)
      });
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      console.log("Response headers:", [...response.headers.entries()].reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
      }, {} as Record<string, string>));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      console.log("Response data preview:", JSON.stringify(data).substring(0, 100) + "...");
      return data;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.fetchWithAuth<T>(url, {
      method: "GET",
      headers,
      credentials: "include",
    });
  }

  async post<T, D extends Record<string, unknown>>(endpoint: string, data: D): Promise<T> {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.fetchWithAuth<T>(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  async put<T, D extends Record<string, unknown>>(endpoint: string, data: D): Promise<T> {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.fetchWithAuth<T>(url, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getHeaders();
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.fetchWithAuth<T>(url, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
  }
}

// Create and export a default instance
const apiClient = new ApiClient();
export default apiClient; 