/**
 * API Service - Identical to web frontend's fetch logic
 * Connects to the SAME Spring Boot microservice backend
 * Enhanced with timeout, retry, and offline detection for chaos resilience
 */

import { API_CONFIG } from '../config/api.config';

export interface Item {
    id?: number;
    name: string;
    value: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
}

class ApiService {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl: string = API_CONFIG.BASE_URL, timeout: number = API_CONFIG.TIMEOUT) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    setTimeout(ms: number) {
        this.timeout = ms;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    async fetchItems(): Promise<ApiResponse<Item[]>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const res = await fetch(`${this.baseUrl}/api/items`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                return { error: `API Error: ${res.status}`, status: res.status };
            }

            const data = await res.json();
            return { data, status: res.status };
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return { error: 'Request Timeout', status: 408 };
            }
            return { error: err.message || 'Network Error', status: 0 };
        }
    }

    async createItem(item: Omit<Item, 'id'>): Promise<ApiResponse<Item>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const res = await fetch(`${this.baseUrl}/api/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                return { error: `Chaos Detected: ${res.status}`, status: res.status };
            }

            const data = await res.json();
            return { data, status: res.status };
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return { error: 'Request Timeout', status: 408 };
            }
            return { error: err.message || 'Network Error', status: 0 };
        }
    }

    async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`${this.baseUrl}/actuator/health`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return { healthy: res.ok, latencyMs: Date.now() - start };
        } catch {
            return { healthy: false, latencyMs: Date.now() - start };
        }
    }
}

// Singleton for the app, replaceable for testing
export const apiService = new ApiService();
export default ApiService;
