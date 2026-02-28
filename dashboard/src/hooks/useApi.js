import { useState, useEffect, useCallback, useRef } from 'react';
import { get } from '../lib/api';

export function useApi(path, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!path) return;
        try { setLoading(true); setError(null); const d = await get(path); setData(d); }
        catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [path, ...(deps || [])]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

export function useInterval(callback, delay) {
    const savedCallback = useRef();
    useEffect(() => { savedCallback.current = callback; }, [callback]);
    useEffect(() => {
        if (delay === null) return;
        const id = setInterval(() => savedCallback.current(), delay);
        return () => clearInterval(id);
    }, [delay]);
}
