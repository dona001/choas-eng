/**
 * Custom hook for managing Items data with chaos-resilient patterns.
 * Mirrors the web frontend's state management (loading, error, toast).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, Item } from '../services/api';

export interface ToastMessage {
    msg: string;
    type: 'success' | 'error';
}

export function useItems() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const toastTimeout = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((msg: string, type: 'success' | 'error') => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToast({ msg, type });

        // Skip auto-dismissal during chaos tests to avoid Detox sync issues
        const isTest = process.env.DETOX === 'true' || process.env.NODE_ENV === 'test';
        if (!isTest) {
            toastTimeout.current = setTimeout(() => setToast(null), 8000);
        }
    }, []);

    const dismissToast = useCallback(() => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToast(null);
    }, []);

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiService.fetchItems();

            if (response.error) {
                setError(response.error);
                showToast(`Failed to fetch items`, 'error');
            } else {
                setItems(response.data || []);
                setError(null);
            }
        } catch (err: any) {
            setError(err.message);
            showToast('Failed to fetch items', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    const createItem = useCallback(async (name: string, value: number): Promise<boolean> => {
        try {
            setSubmitting(true);
            const response = await apiService.createItem({ name, value });

            if (response.error) {
                showToast(response.error, 'error');
                return false;
            }

            showToast('Item created successfully!', 'success');
            // Delay sync slightly to allow users (and chaos tests) to see the success state
            setTimeout(() => fetchItems(), 1000);
            return true;
        } catch (err: any) {
            showToast(err.message, 'error');
            return false;
        } finally {
            setSubmitting(false);
        }
    }, [showToast, fetchItems]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return {
        items,
        loading,
        error,
        submitting,
        toast,
        fetchItems,
        createItem,
        dismissToast,
    };
}
