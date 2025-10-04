import { useState, useCallback } from "react";

interface ApiResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    request: (...args: any[]) => Promise<void>;
}

export function useApi<T>(apiFunc: (...args: any[]) => Promise<{ success: boolean; data?: T; error?: any }>): ApiResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const request = useCallback(
        async (...args: any[]) => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiFunc(...args);
                if (response.success) {
                    setData(response.data || null);
                } else {
                    setError(response.error || "Something went wrong");
                }
            } catch (err: any) {
                setError(err.message || "Unexpected error");
            } finally {
                setLoading(false);
            }
        },
        [apiFunc]
    );

    return { data, loading, error, request };
}
