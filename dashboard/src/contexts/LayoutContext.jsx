import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
    const { track } = useAnalytics();

    // Desktop collapsed state
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebar_collapsed') === 'true';
        }
        return false;
    });

    // Mobile drawer state
    const [mobileOpen, setMobileOpen] = useState(false);

    // Hover expansion state (desktop only)
    const [hoverExpanded, setHoverExpanded] = useState(false);

    // Interaction lock (prevent spam)
    const [isToggling, setIsToggling] = useState(false);

    // Persist collapsed state
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', collapsed);
        // Dispatch custom event for sync across components/tabs if needed
        window.dispatchEvent(new Event('sidebar-change'));

        // Track analytics
        track('sidebar_toggle', { collapsed });
    }, [collapsed, track]);

    // Handle Resize (close mobile drawer on desktop)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileOpen(false);
            }
        };
        // Debounce logic could go here
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Toggle function with lock
    const toggleCollapsed = useCallback(() => {
        if (isToggling) return;
        setIsToggling(true);
        setCollapsed(prev => !prev);
        // Unlock after transition
        setTimeout(() => setIsToggling(false), 300);
    }, [isToggling]);

    const value = {
        collapsed,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        hoverExpanded,
        setHoverExpanded,
        isToggling
    };

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    return useContext(LayoutContext);
}
