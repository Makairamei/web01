import { useCallback } from 'react';

export function useAnalytics() {
    const track = useCallback((eventName, properties = {}) => {
        // In a real app, this would send data to Segment/Mixpanel/Google Analytics
        if (process.env.NODE_ENV === 'development') {
            console.groupCollapsed(`📊 Analytics: ${eventName}`);
            console.table(properties);
            console.groupEnd();
        }
    }, []);

    return { track };
}
